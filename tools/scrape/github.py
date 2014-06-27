import base64
import collections
import datetime
import logging
import re
import sys
import time
from urllib import urlencode
import urlparse

import configparser
import dateutil.parser
import requests
import rethinkdb as r
from termcolor import colored

from db.github_repos import PluginGithubRepos, DotfilesGithubRepos
import db.plugins
import db.util
import util

r_conn = db.util.r_conn

try:
    import secrets
    _GITHUB_API_TOKEN = getattr(secrets, 'GITHUB_PERSONAL_ACCESS_TOKEN', None)
except ImportError:
    _GITHUB_API_TOKEN = None


_NO_GITHUB_API_TOKEN_MESSAGE = """
*******************************************************************************
* Warning: GitHub API token not found in secrets.py. Scraping will be severely
* rate-limited. See secrets.py.example to obtain a GitHub personal access token
*******************************************************************************
"""
if not _GITHUB_API_TOKEN:
    logging.warn(colored(_NO_GITHUB_API_TOKEN_MESSAGE, 'red'))


###############################################################################
# General utilities for interacting with the GitHub API.


class ApiRateLimitExceededError(Exception):

    def __init__(self, headers):
        self.headers = headers

    def __str__(self):
        return repr(self.headers)


def get_api_page(url_or_path, query_params=None, page=1, per_page=100):
    """Get a page from GitHub's v3 API.

    Arguments:
        url_or_path: The API method to call or the full URL.
        query_params: A dict of additional query parameters
        page: Page number
        per_page: How many results to return per page. Max is 100.

    Returns:
        A tuple: (Response object, JSON-decoded dict of the response)

    Raises: ApiRateLimitExceededError
    """
    split_url = urlparse.urlsplit(url_or_path)

    query = {
        'page': page,
        'per_page': per_page,
    }

    if _GITHUB_API_TOKEN:
        query['access_token'] = _GITHUB_API_TOKEN

    query.update(dict(urlparse.parse_qsl(split_url.query)))
    query.update(query_params or {})

    url = urlparse.SplitResult(scheme='https', netloc='api.github.com',
            path=split_url.path, query=urlencode(query),
            fragment=split_url.fragment).geturl()

    res = requests.get(url)

    if res.status_code == 403 and res.headers['X-RateLimit-Remaining'] == '0':
        raise ApiRateLimitExceededError(res.headers)

    return res, res.json()


def get_requests_left():
    """Retrieve how many API requests are remaining"""
    _, data = get_api_page('rate_limit')

    return data['rate']['remaining']


def maybe_wait_until_api_limit_resets(response_headers):
    """If we're about to exceed our API limit, sleeps until our API limit is
    reset.
    """
    if response_headers['X-RateLimit-Remaining'] == '0':
        reset_timestamp = response_headers['X-RateLimit-Reset']
        reset_date = datetime.datetime.fromtimestamp(int(reset_timestamp))
        now = datetime.datetime.now()
        seconds_to_wait = (reset_date - now).seconds + 1
        print "Sleeping %s seconds for API limit to reset." % seconds_to_wait
        time.sleep(seconds_to_wait)


###############################################################################
# Routines for scraping Vim plugin repos from GitHub.


_VIMORG_ID_FROM_URL_REGEX = re.compile(
        r'vim.org/scripts/script.php\?script_id=(\d+)')


def _get_vimorg_id_from_url(url):
    """Returns the vim.org script_id from a URL if it's of a vim.org script,
    otherwise, returns None.
    """
    match = _VIMORG_ID_FROM_URL_REGEX.search(url or '')
    if match:
        return match.group(1)

    return None


def get_plugin_data(owner, repo_name, repo_data, readme_data=None):
    """Populate info relevant to a plugin from a GitHub repo.

    This should not be used to fetch info from the vim-scripts user's repos.

    Arguments:
        owner: The repo's owner's login, eg. "gmarik"
        repo_name: The repo name, eg. "vundle"
        repo_data: GitHub API /repos response for this repo
        readme_data: (optional) GitHub API /readme response for this repo
        scrape_fork: Whether to bother scraping this repo if it's a fork

    Returns:
        A dict of properties that can be inserted as a row in the plugins table
    """
    assert owner != 'vim-scripts'

    if not readme_data:
        _, readme_data = get_api_page('repos/%s/%s/readme' % (
            owner, repo_name))

    readme_base64_decoded = base64.b64decode(readme_data.get('content', ''))
    readme = unicode(readme_base64_decoded, 'utf-8', errors='ignore')
    readme_filename = readme_data.get('name', '')

    # TODO(david): We used to extract the vim.org ID from the homepage if it
    #     were a vim.org URL, but that became too unreliable as many different
    #     repos would all claim to have the same vim.org homepage, when
    #     sometimes those repos were of different plugins. But it's still
    #     useful information in heuristic matching, just can't be used as
    #     a key.
    homepage = repo_data['homepage']

    repo_created_date = dateutil.parser.parse(repo_data['created_at'])

    # Fetch commits so we can get the update/create dates.
    _, commits_data = get_api_page('repos/%s/%s/commits' % (owner, repo_name),
            per_page=100)

    if commits_data and isinstance(commits_data, list) and len(commits_data):

        # Unfortunately repo_data['updated_at'] and repo_data['pushed_at'] are
        # wildy misrepresentative of the last time someone made a commit to the
        # repo.
        updated_date_text = commits_data[0]['commit']['author']['date']
        updated_date = dateutil.parser.parse(updated_date_text)

        # To get the creation date, we use the heuristic of min(repo creation
        # date, 100th latest commit date). We do this because repo creation
        # date can be later than the date of the first commit, which is
        # particularly pervasive for vim-scripts repos. Fortunately, most
        # vim-scripts repos don't have more than 100 commits, and also we get
        # creation_date for vim-scripts repos when scraping vim.org.
        early_commit_date_text = commits_data[-1]['commit']['author']['date']
        early_commit_date = dateutil.parser.parse(early_commit_date_text)
        created_date = min(repo_created_date, early_commit_date)

    else:
        updated_date = dateutil.parser.parse(repo_data['updated_at'])
        created_date = repo_created_date

    # Fetch owner info to get author name.
    owner_login = repo_data['owner']['login']
    _, owner_data = get_api_page('users/%s' % owner_login)
    author = owner_data.get('name') or owner_data.get('login')

    return {
        'created_at': util.to_timestamp(created_date),
        'updated_at': util.to_timestamp(updated_date),
        'vimorg_id': None,
        'github_repo_id': str(repo_data['id']),
        'github_owner': owner,
        'github_repo_name': repo_name,
        'github_author': author,
        'github_stars': repo_data['watchers'],
        'github_homepage': homepage,
        'github_short_desc': repo_data['description'],
        'github_readme': readme,
        'github_readme_filename': readme_filename,
    }


# TODO(david): Simplify/break-up this function.
def scrape_plugin_repos(num):
    """Scrapes the num plugin repos that have been least recently scraped."""
    MIN_FORK_USERS = 3

    query = r.table('plugin_github_repos').filter({'is_blacklisted': False})

    # We don't want to scrape forks that not many people use.
    query = query.filter(r.not_((r.row['is_fork'] == True) & (
            r.row['plugin_manager_users'] < MIN_FORK_USERS)),
            default=True)

    # Only scrape repos that don't redirect to other ones (probably renamed).
    query = query.filter(r.row['redirects_to'] == '')

    # We scrape vim-scripts separately using the batch /users/:user/repos call
    query = query.filter(r.row['owner'] != 'vim-scripts')

    query = query.order_by('last_scraped_at').limit(num)

    repos = query.run(r_conn())

    # TODO(david): Print stats at the end: # successfully scraped, # not found,
    #     # redirects, etc.
    for repo in repos:
        repo_name = repo['repo_name']
        repo_owner = repo['owner']

        # Print w/o newline.
        print "    scraping %s/%s ..." % (repo_owner, repo_name),
        sys.stdout.flush()

        # Attempt to fetch data about the plugin.
        res, repo_data = get_api_page('repos/%s/%s' % (repo_owner, repo_name))

        # If the API call 404s, then see if the repo has been renamed by
        # checking for a redirect in a non-API call.
        if res.status_code == 404:

            res = requests.head('https://github.com/%s/%s' % (
                    repo_owner, repo_name))

            if res.status_code == 301:
                location = res.headers.get('location')
                _, redirect_owner, redirect_repo_name = location.rsplit('/', 2)

                repo['redirects_to'] = '%s/%s' % (redirect_owner,
                        redirect_repo_name)

                # Make sure we insert the new location of the repo, which will
                # be scraped in a future run.
                PluginGithubRepos.upsert_with_owner_repo({
                    'owner': redirect_owner,
                    'repo_name': redirect_repo_name,
                    # TODO(david): Should append to a list
                    'redirects_from': ('%s/%s' % (repo_owner, repo_name)),
                })

                # And now change the GitHub repo location of the plugin that
                # the old repo location pointed to
                query = r.table('plugins').get_all(
                        [repo_owner, repo_name], index='github_owner_repo')
                db_plugin = db.util.get_first(query)
                if db_plugin:
                    db_plugin['github_owner'] = redirect_owner
                    db_plugin['github_repo_name'] = redirect_repo_name
                    db.plugins.insert(db_plugin, upsert=True)

                print 'redirects to %s/%s.' % (redirect_owner,
                        redirect_repo_name)
            else:
                # TODO(david): Insert some metadata in the github repo that
                #     this is not found
                print 'not found.'

            plugin_data = None

        else:
            plugin_data = get_plugin_data(repo_owner, repo_name, repo_data)

        repo['repo_data'] = repo_data
        repo['repo_id'] = str(repo_data.get('id', repo['repo_id']))
        PluginGithubRepos.log_scrape(repo)

        # If this is a fork, note it and ensure we know about original repo.
        if repo_data.get('fork'):
            repo['is_fork'] = True
            PluginGithubRepos.upsert_with_owner_repo({
                'owner': repo_data['parent']['owner']['login'],
                'repo_name': repo_data['parent']['name'],
            })

        r.table('plugin_github_repos').insert(repo, upsert=True).run(r_conn())

        # For most cases we don't care about forked repos, unless the forked
        # repo is used by others.
        if repo_data.get('fork') and (
                repo.get('plugin_manager_users', 0) < MIN_FORK_USERS):
            print 'skipping fork of %s' % repo_data['parent']['full_name']
            continue

        if plugin_data:

            # Insert the number of plugin manager users across all names/owners
            # of this repo.
            # TODO(david): Try to also use repo_id for this (but not all repos
            #     have it), or look at multiple levels of redirects.
            plugin_manager_users = repo.get('plugin_manager_users', 0)
            other_repos = r.table('plugin_github_repos').get_all(
                    '%s/%s' % (repo_owner, repo_name),
                    index='redirects_to').run(r_conn())
            for other_repo in other_repos:
                if other_repo['id'] == repo['id']:
                    continue
                plugin_manager_users += other_repo.get(
                        'plugin_manager_users', 0)

            plugin_data['github_bundles'] = plugin_manager_users

            db.plugins.add_scraped_data(plugin_data, repo)
            print 'done.'


def scrape_vim_scripts_repos(num):
    """Scrape at least num repos from the vim-scripts GitHub user."""
    _, user_data = get_api_page('users/vim-scripts')

    # Calculate how many pages of repositories there are.
    num_repos = user_data['public_repos']
    num_pages = (num_repos + 99) / 100  # ceil(num_repos / 100.0)

    num_inserted = 0
    num_scraped = 0

    for page in range(1, num_pages + 1):
        if num_scraped >= num:
            break

        _, repos_data = get_api_page('users/vim-scripts/repos', page=page)

        for repo_data in repos_data:

            # Scrape plugin-relevant data. We don't need much info from
            # vim-scripts because it's a mirror of vim.org.

            # vimorg_id is required for associating with the corresponding
            # vim.org-scraped plugin.
            vimorg_id = _get_vimorg_id_from_url(repo_data['homepage'])
            assert vimorg_id

            repo_name = repo_data['name']

            repo = PluginGithubRepos.get_with_owner_repo('vim-scripts',
                    repo_name)
            num_bundles = repo['plugin_manager_users'] if repo else 0

            db.plugins.add_scraped_data({
                'vimorg_id': vimorg_id,
                'github_vim_scripts_repo_name': repo_name,
                'github_vim_scripts_stars': repo_data['watchers'],
                'github_vim_scripts_bundles': num_bundles,
            })

            # Also add to our index of known GitHub plugins.
            inserted = PluginGithubRepos.upsert_with_owner_repo({
                'owner': 'vim-scripts',
                'repo_name': repo_name,
                'repo_data': repo_data,
            })

            num_inserted += int(inserted)
            num_scraped += 1

        print '    scraped %s repos' % num_scraped

    print "\nScraped %s vim-scripts GitHub repos; inserted %s new ones." % (
            num_scraped, num_inserted)


###############################################################################
# Code to scrape GitHub dotfiles repos to extract plugins used.
# TODO(david): Write up a blurb on how all of this works.


# The following are names of repos and locations where we search for
# Vundle/Pathogen plugin references. They were found by manually going through
# search results of
# github.com/search?q=scrooloose%2Fsyntastic&ref=searchresults&type=Code

# TODO(david): It would be good to add "vim", "settings", and "config", but
#     there are too many false positives that need to be filtered out.
_DOTFILE_REPO_NAMES = ['vimrc', 'vimfile', 'vim-file', 'vimconf',
        'vim-conf', 'vim-config', 'dotvim', 'vim-setting', 'myvim', 'dotfile',
        'config-files']

_VIMRC_FILENAMES = ['vimrc', 'bundle', 'vundle.vim', 'vundles.vim',
        'vim.config', 'plugins.vim']

_VIM_DIRECTORIES = ['vim', 'config', 'home']


# Regexes for extracting plugin references from dotfile repos. See
# github_test.py for examples of what they match and don't.

# Matches eg. "Bundle 'gmarik/vundle'" or "Bundle 'taglist'"
# [^\S\n] means whitespace except newline: stackoverflow.com/a/3469155/392426
_BUNDLE_PLUGIN_REGEX_TEMPLATE = r'^[^\S\n]*%s[^\S\n]*[\'"]([^\'"\n\r]+)[\'"]'
_VUNDLE_PLUGIN_REGEX = re.compile(_BUNDLE_PLUGIN_REGEX_TEMPLATE % 'Bundle',
        re.MULTILINE)
_NEOBUNDLE_PLUGIN_REGEX = re.compile(_BUNDLE_PLUGIN_REGEX_TEMPLATE %
        '(?:NeoBundle|NeoBundleFetch|NeoBundleLazy)', re.MULTILINE)

# Extracts owner and repo name from a bundle spec -- a git repo URI, implicity
# github.com if host not given.
# eg. ('gmarik', 'vundle') or (None, 'taglist')
_BUNDLE_OWNER_REPO_REGEX = re.compile(
        r'(?:([^:\'"/]+)/)?([^\'"\n\r/]+?)(?:\.git|/)?$')

# Matches a .gitmodules section heading that's likely of a Pathogen bundle.
_SUBMODULE_IS_BUNDLE_REGEX = re.compile(r'submodule.+bundles?/.+',
        re.IGNORECASE)


def _extract_bundles_with_regex(file_contents, bundle_plugin_regex):
    """Extracts plugin repos from contents of a file using a given regex.

    Arguments:
        file_contents: A string of the contents of the file to search through.
        bundle_plugin_regex: A regex to use to match all lines referencing
            plugin repos.

    Returns:
        A list of tuples (owner, repo_name) referencing GitHub repos.
    """
    bundles = bundle_plugin_regex.findall(file_contents)
    if not bundles:
        return []

    plugin_repos = []
    for bundle in bundles:
        match = _BUNDLE_OWNER_REPO_REGEX.search(bundle)
        if match and len(match.groups()) == 2:
            owner, repo = match.groups()
            owner = 'vim-scripts' if owner is None else owner
            plugin_repos.append((owner, repo))
        else:
            logging.error(colored(
                'Failed to extract owner/repo from "%s"' % bundle, 'red'))

    return plugin_repos


def _extract_bundle_repos_from_file(file_contents):
    """Extracts Vundle and Neobundle plugins from contents of a vimrc-like
    file.

    Arguments:
        file_contents: A string of the contents of the file to search through.

    Returns:
        A tuple (Vundle repos, NeoBundle repos). Each element is a list of
        tuples of the form (owner, repo_name) referencing a GitHub repo.
    """
    vundle_repos = _extract_bundles_with_regex(file_contents,
            _VUNDLE_PLUGIN_REGEX)
    neobundle_repos = _extract_bundles_with_regex(file_contents,
            _NEOBUNDLE_PLUGIN_REGEX)

    return vundle_repos, neobundle_repos


def _extract_bundle_repos_from_dir(dir_data, depth=0):
    """Extracts vim plugin bundles from a GitHub dotfiles directory.

    Will recursively search through directories likely to contain vim config
    files (lots of people seem to like putting their vim config in a "vim"
    subdirectory).

    Arguments:
        dir_data: API response from GitHub of a directory or repo's contents.
        depth: Current recursion depth (0 = top-level repo).

    Returns:
        A tuple (Vundle repos, NeoBundle repos). Each element is a list of
        tuples of the form (owner, repo_name) referencing a GitHub repo.
    """
    # First, look for top-level files that are likely to contain references to
    # vim plugins.
    files = filter(lambda f: f['type'] == 'file', dir_data)
    for file_data in files:
        filename = file_data['name'].lower()

        if 'gvimrc' in filename:
            continue

        if not any((f in filename) for f in _VIMRC_FILENAMES):
            continue

        # Ok, there could potentially be references to vim plugins here.
        _, file_contents = get_api_page(file_data['url'])
        contents_decoded = base64.b64decode(file_contents.get('content', ''))
        bundles_tuple = _extract_bundle_repos_from_file(contents_decoded)

        if any(bundles_tuple):
            return bundles_tuple

    if depth >= 3:
        return [], []

    # No plugins were found, so look in subdirectories that could potentially
    # have vim config files.
    dirs = filter(lambda f: f['type'] == 'dir', dir_data)
    for dir_data in dirs:
        filename = dir_data['name'].lower()
        if not any((f in filename) for f in _VIM_DIRECTORIES):
            continue

        # Ok, there could potentially be vim config files in here.
        _, subdir_data = get_api_page(dir_data['url'])
        bundles_tuple = _extract_bundle_repos_from_dir(subdir_data, depth + 1)

        if any(bundles_tuple):
            return bundles_tuple

    return [], []


def _extract_pathogen_repos(repo_contents):
    """Extracts Pathogen plugin repos from a GitHub dotfiles repository.

    This currently just extracts plugins if they are checked in as submodules,
    because it's easy to extract repo URLs from the .gitmodules file but
    difficult to determine the repo URL of a plugin that's just cloned in.

    Arguments:
        repo_contents: API response from GitHub of a directory or repo's
            contents.

    Returns:
        A list of tuples (owner, repo_name) referencing GitHub repos.
    """
    gitmodules = filter(lambda f: f['type'] == 'file' and
            f['name'].lower() == '.gitmodules', repo_contents)

    if not gitmodules:
        return []

    _, file_contents = get_api_page(gitmodules[0]['url'])
    contents_decoded = base64.b64decode(file_contents.get('content', ''))
    contents_unicode = unicode(contents_decoded, 'utf-8', errors='ignore')

    parser = configparser.ConfigParser(interpolation=None)

    try:
        parser.read_string(unicode(contents_unicode))
    except configparser.Error:
        logging.exception(colored(
                'Could not parse the .gitmodules file of %s.' %
                file_contents['url'], 'red'))
        return []

    plugin_repos = []
    for section, config in parser.items():
        if not _SUBMODULE_IS_BUNDLE_REGEX.search(section):
            continue

        if not config.get('url'):
            continue

        # The parser sometimes over-parses the value
        url = config['url'].split('\n')[0]
        match = _BUNDLE_OWNER_REPO_REGEX.search(url)
        if match and len(match.groups()) == 2 and match.group(1):
            owner, repo = match.groups()
            plugin_repos.append((owner, repo))
        else:
            logging.error(colored(
                    'Failed to extract owner/repo from "%s"' % url, 'red'))

    return plugin_repos


def _get_plugin_repos_from_dotfiles(repo_data, search_keyword):
    """Search for references to vim plugin repos from a dotfiles repository,
    and insert them into DB.

    Arguments:
        repo_data: API response from GitHub of a repository.
        search_keyword: The keyword used that found this repo.
    """
    owner_repo = repo_data['full_name']

    # Print w/o newline.
    print "    scraping %s ..." % owner_repo,
    sys.stdout.flush()

    res, contents_data = get_api_page('repos/%s/contents' % owner_repo)

    if res.status_code == 404 or not isinstance(contents_data, list):
        print "contents not found"
        return

    vundle_repos, neobundle_repos = _extract_bundle_repos_from_dir(
            contents_data)
    pathogen_repos = _extract_pathogen_repos(contents_data)

    owner, repo_name = owner_repo.split('/')
    db_repo = DotfilesGithubRepos.get_with_owner_repo(owner, repo_name)
    pushed_date = dateutil.parser.parse(repo_data['pushed_at'])

    def stringify_repo(owner_repo_tuple):
        return '/'.join(owner_repo_tuple)

    repo = dict(db_repo or {}, **{
        'owner': owner,
        'pushed_at': util.to_timestamp(pushed_date),
        'repo_name': repo_name,
        'search_keyword': search_keyword,
        'vundle_repos': map(stringify_repo, vundle_repos),
        'neobundle_repos': map(stringify_repo, neobundle_repos),
        'pathogen_repos': map(stringify_repo, pathogen_repos),
    })

    DotfilesGithubRepos.log_scrape(repo)
    DotfilesGithubRepos.upsert_with_owner_repo(repo)

    print 'found %s Vundles, %s NeoBundles, %s Pathogens' % (
            len(vundle_repos), len(neobundle_repos), len(pathogen_repos))

    return {
        'vundle_repos_count': len(vundle_repos),
        'neobundle_repos_count': len(neobundle_repos),
        'pathogen_repos_count': len(pathogen_repos),
    }


def scrape_dotfiles_repos(num):
    """Scrape at most num dotfiles repos from GitHub for references to Vim
    plugin repos.

    We perform a search on GitHub repositories that are likely to contain
    Vundle and Pathogen bundles instead of a code search matching
    Vundle/Pathogen commands (which has higher precision and recall), because
    GitHub's API requires code search to be limited to
    a user/repo/organization. :(
    """
    # Earliest allowable updated date to start scraping from (so we won't be
    # scraping repos that were last pushed before this date).
    EARLIEST_PUSHED_DATE = datetime.datetime(2013, 1, 1)

    repos_scraped = 0
    scraped_counter = collections.Counter()

    for repo_name in _DOTFILE_REPO_NAMES:
        latest_repo = DotfilesGithubRepos.get_latest_with_keyword(repo_name)

        if latest_repo and latest_repo.get('pushed_at'):
            last_pushed_date = max(datetime.datetime.utcfromtimestamp(
                    latest_repo['pushed_at']), EARLIEST_PUSHED_DATE)
        else:
            last_pushed_date = EARLIEST_PUSHED_DATE

        # We're going to scrape all repos updated after the latest updated repo
        # in our DB, starting with the least recently updated.  This maintains
        # the invariant that we have scraped all repos pushed before the latest
        # push date (and after EARLIEST_PUSHED_DATE).
        while True:

            start_date_iso = last_pushed_date.isoformat()
            search_params = {
                'q': '%s in:name pushed:>%s' % (repo_name, start_date_iso),
                'sort': 'updated',
                'order': 'asc',
            }

            per_page = 100
            response, search_data = get_api_page('search/repositories',
                    query_params=search_params, page=1, per_page=per_page)

            items = search_data.get('items', [])
            for item in items:
                try:
                    stats = _get_plugin_repos_from_dotfiles(item, repo_name)
                except ApiRateLimitExceededError:
                    logging.exception('API rate limit exceeded.')
                    return repos_scraped, scraped_counter
                except Exception:
                    logging.exception('Error scraping dotfiles repo %s' %
                            item['full_name'])
                    stats = {}

                scraped_counter.update(stats)

                # If we've scraped the number repos desired, we can quit.
                repos_scraped += 1
                if repos_scraped >= num:
                    return repos_scraped, scraped_counter

            # If we're about to exceed the rate limit (20 requests / min),
            # sleep until the limit resets.
            maybe_wait_until_api_limit_resets(response.headers)

            # If we've scraped all repos with this name, move on to the next
            # repo name.
            if len(items) < per_page:
                break
            else:
                last_pushed_date = dateutil.parser.parse(
                        items[-1]['pushed_at'])

    return repos_scraped, scraped_counter
