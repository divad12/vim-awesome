"""Utility functions for the plugins table."""

import difflib
import random
import re
import sys

import rethinkdb as r
from slugify import slugify

import db.util

r_conn = db.util.r_conn


class RequiredProperty(object):
    pass


_ROW_SCHEMA = {

    # Primary key. Human-readable permalink for a plugin. Eg. 'python-2'
    'slug': RequiredProperty(),

    # A name used strictly for purposes of associating info from different
    # sources together. Eg. "nerdtree" (instead of "the-NERD-Tree.vim")
    'normalized_name': '',

    # One of the IDs from db/categories.yaml
    # Eg. 'language'
    'category': 'uncategorized',

    # eg. ['C/C++', 'autocomplete']
    'tags': [],

    # Unix timestamp in seconds
    'created_at': 0,
    'updated_at': 0,

    ###########################################################################
    # Info from the script on vim.org.
    # eg. http://www.vim.org/scripts/script.php?script_id=2736

    # Eg. '1234' (string)
    'vimorg_id': '',

    # Eg. 'Syntastic'
    'vimorg_name': '',

    # Eg. 'Marty Grenfell'
    'vimorg_author': '',

    # eg. 'http://www.vim.org/scripts/script.php?script_id=2736'
    'vimorg_url': '',

    # eg. 'utility'
    'vimorg_type': '',

    'vimorg_rating': 0,
    'vimorg_num_raters': 0,
    'vimorg_downloads': 0,
    'vimorg_short_desc': '',
    'vimorg_long_desc': '',
    'vimorg_install_details': '',

    ###########################################################################
    # Info from the author's GitHub repo (eg. github.com/scrooloose/syntastic)

    # The unique identifier of a GitHub repo that's preserved on name changes
    # or owner transfers. eg. '123567'
    'github_repo_id': '',

    # eg. 'scrooloose'
    'github_owner': '',

    # eg. 'syntastic'
    'github_repo_name': '',

    # Eg. 'Martin Grenfell'
    'github_author': '',

    'github_stars': 0,

    # eg. 'Syntax checking hacks for vim'
    'github_short_desc': '',

    # eg. 'http://valloric.github.io/YouCompleteMe/'
    'github_homepage': '',

    'github_readme': '',

    'github_readme_filename': '',

    ###########################################################################
    # Info from the github.com/vim-scripts mirror.
    # eg. github.com/vim-scripts/Syntastic

    # Eg. 'syntastic'
    'github_vim_scripts_repo_name': '',

    'github_vim_scripts_stars': 0,

    ###########################################################################
    # Info derived from elsewhere

    # Number of Vundle/Pathogen/NeoBundle etc. users that reference the
    # author's GitHub repo.
    'github_bundles': 0,

    # Number of Vundle/Pathogen/NeoBundle etc. users that reference the
    # vim-scripts GitHub mirror.
    'github_vim_scripts_bundles': 0,

}


# Reserve some slug names for potential pages in case we want to be able to
# link to plugins top-level, as in vimawesome.com/:slug
_RESERVED_SLUGS = set([
    'plugins',
    'plugin',
    'p',
    'tags',
    'tag',
    't',
    'about',
    'submit',
    'upload',
    'search',
    'faq',
    'blog',
])


###############################################################################
# Routines for basic DB CRUD operations.


_GITHUB_REPO_URL_TEMPLATE = 'https://github.com/%s/%s'


def ensure_table():
    db.util.ensure_table('plugins', primary_key='slug')

    db.util.ensure_index('plugins', 'vimorg_id')
    db.util.ensure_index('plugins', 'github_stars')
    db.util.ensure_index('plugins', 'normalized_name')
    db.util.ensure_index('plugins', 'github_repo_id')
    db.util.ensure_index('plugins', 'github_owner_repo',
            lambda p: [p['github_owner'], p['github_repo_name']])


# TODO(david): Yep, using an ODM enforcing a consistent schema on write AND
#     read would be great.
def insert(plugins, *args, **kwargs):
    """Insert or update a plugin or list of plugins.

    Although this would be more accurately named "upsert", this is a wrapper
    around http://www.rethinkdb.com/api/python/#insert that ensures
    a consistent plugin schema before inserting into DB.
    """
    if not isinstance(plugins, list):
        plugins = [plugins]

    mapped_plugins = []
    for plugin in plugins:
        _normalize(plugin)

        mapped_plugins.append(dict(_ROW_SCHEMA, **plugin))

    return r.table('plugins').insert(mapped_plugins, *args, **kwargs).run(
            r_conn())


def _normalize(plugin):
    if not plugin.get('slug'):
        plugin['slug'] = _generate_unique_slug(plugin)

    if not plugin.get('normalized_name'):
        plugin['normalized_name'] = _normalize_name(plugin)

    # Normalize the GitHub URL properties
    for key in ['github_owner', 'github_repo_name']:
        # Vim.org plugins don't have GitHub info
        if key in plugin:
            plugin[key] = plugin[key].lower()


def _generate_unique_slug(plugin):
    """Create a unique, human-readable ID for this plugin that can be used in
    a permalink URL.

    WARNING: Not thread-safe.
    """
    name = (plugin.get('vimorg_name') or plugin.get('github_repo_name') or
            plugin.get('github_vim_scripts_repo_name'))
    assert name

    slug = slugify(name)
    if not _slug_taken(slug):
        return slug

    # If the slug isn't unique, try appending different slug suffixes until we
    # get a unique slug. Don't worry, these suffixes only show up in the URL.
    # And it's more efficient to randomly permute these than using
    # a monotonically increasing integer.
    #
    # Also this is just wayyyyyyyy more awesome than appending numbers. <3
    slug_suffixes = [
        'say-im-great',
        'already-like-death',
        'he-is-going',
        'may-fear-less',
        'are-made-of',
        'is-written-on',
        'lives-by-it',
        'tree-and-truth',
        'today-cannot-touch',
        'face-rejection',
        'hard-things',
        'please-everybody',
        'with-ourselves',
        'frighten-you',
        'it-has-you',
        'hands-off',
        'thing-itself',
        'the-thing-itself',
        'impatience-and-laziness',
        'be-who-we-are',
        'care-of-itself',
        'would-can-one',
        'left-unsaid',
        'or-are-not',
        'is-holy',
        'the-heights',
        'without-it',
        'own-character',
        'who-speaks',
        'looking-forward',
    ]
    random.shuffle(slug_suffixes)

    for slug_suffix in slug_suffixes:
        slug = slugify('%s-%s' % (name, slug_suffix))

        if not _slug_taken(slug):
            return slug

    raise Exception('Uh oh, we need more song titles. Too many'
            ' collisions of %s' % name)


def _slug_taken(slug):
    """Returns whether a slug has already been used or is reserved."""
    return bool(r.table('plugins').get(slug).run(r_conn())) or (
            slug in _RESERVED_SLUGS)


def _normalize_name(plugin):
    """Returns a normalized name for a plugin that can be used for matching
    against other similar names.
    """
    name = (plugin.get('vimorg_name') or plugin.get('github_repo_name') or
            plugin.get('github_vim_scripts_repo_name'))
    assert name

    # Remove anything including and after the first '--', which vim-scripts
    # uses as a separator to append author name to get unique repo names.
    name = name.split('--', 1)[0]

    # Remove any trailing '.zip'
    name = re.sub(r'\.zip$', '', name)

    # Remove accents from chars, lowercases, and remove non-ASCII
    name = slugify(name)

    # Remove non-alphanumerics
    name = re.sub(r'[\W_]+', '', name)

    # Remove any number of leading {'vim', 'the'}, and any trailing 'vim'
    name = re.sub('(?:^(vim|the)+|vim$)', '', name)

    return name


def update_tags(plugin, tags):
    """Updates a plugin's tags to the given set, and updates aggregate tag
    counts.
    """
    plugin_tags = plugin.get('tags', [])
    added_tags = set(tags) - set(plugin_tags)
    removed_tags = set(plugin_tags) - set(tags)

    # TODO(david): May have to hold a lock while doing this
    map(db.tags.add_tag, added_tags)
    map(db.tags.remove_tag, removed_tags)

    plugin['tags'] = tags


def to_json(p):
    """Returns a JSON-compatible dict of a plugin that can be serialized and
    sent to clients.
    """
    name = (p['vimorg_name'] or p['github_repo_name'] or
            p['github_vim_scripts_repo_name'])

    author = (p['vimorg_author'].strip() or p['github_author'].strip())
    plugin_manager_users = (p['github_bundles'] +
            p['github_vim_scripts_bundles'])
    short_desc = p['vimorg_short_desc']

    if (p['github_owner'] and
            p['github_stars'] >= p['github_vim_scripts_stars']):
        github_url = _GITHUB_REPO_URL_TEMPLATE % (
                p['github_owner'], p['github_repo_name'])
        github_repo_name = p['github_repo_name']
        github_stars = p['github_stars']
        short_desc = p['github_short_desc']
    elif p['github_vim_scripts_repo_name']:
        github_url = _GITHUB_REPO_URL_TEMPLATE % (
                'vim-scripts', p['github_vim_scripts_repo_name'])
        github_repo_name = p['github_vim_scripts_repo_name']
        github_stars = p['github_vim_scripts_stars']
    else:
        github_url = None
        github_repo_name = None
        github_stars = 0

    plugin = dict(p, **{
        'name': name,
        'author': author,
        'plugin_manager_users': plugin_manager_users,
        'short_desc': short_desc,
        'github_url': github_url,
        'github_repo_name': github_repo_name,
        'github_stars': github_stars,
    })

    return plugin


###############################################################################
# Routines for merging in data from scraped sources.
# TODO(david): Write a Craig-esque comment about how all this works.

def update_plugin(old_plugin, new_plugin):
    """Merges properties of new_plugin onto old_plugin, much like a dict
    update.

    This is used to reconcile differences of data that we might get from
    multiple sources about the same plugin, such as from vim.org, vim-scripts
    GitHub repo, and the author's original GitHub repo.

    Does not mutate any arguments. Returns the updated plugin.
    """
    updated_plugin = _merge_dict_except_none(old_plugin, new_plugin)

    # Keep the latest updated date.
    if old_plugin.get('updated_at') and new_plugin.get('updated_at'):
        updated_plugin['updated_at'] = max(old_plugin['updated_at'],
                new_plugin['updated_at'])

    # Keep the earliest created date.
    if old_plugin.get('created_at') and new_plugin.get('created_at'):
        updated_plugin['created_at'] = min(old_plugin['created_at'],
                new_plugin['created_at'])

    return updated_plugin


def _merge_dict_except_none(dict_a, dict_b):
    """Returns dict_a updated with any key/value pairs from dict_b where the
    value is not None.

    Does not mutate arguments. Also, please don't drink and drive.
    """
    dict_b_filtered = {k: v for k, v in dict_b.iteritems() if v is not None}
    return dict(dict_a, **dict_b_filtered)


def _is_similar_author_name(name1, name2):
    """Returns whether two author names are similar enough that they're
    probably the same person.
    """
    def normalize_author_name(name):
        # Remove accents from chars, lowercases, and remove non-ASCII
        name = slugify(name)

        # Remove non-alphanumerics
        name = re.sub(r'[\W_]+', '', name)

        return name

    name1 = normalize_author_name(name1)
    name2 = normalize_author_name(name2)

    return difflib.SequenceMatcher(None, name1, name2).ratio() >= 0.6


def _find_matching_plugins(plugin_data, repo=None):
    """Attempts to find the matching plugin from the given data using various
    heuristics.

    Ideally, this would never return more than one matching plugin, but our
    heuristics are not perfect and there are many similar vim.org plugins named
    "python.vim," for example.

    Arguments:
        plugin_data: Scraped data about a plugin.
        repo: (optional) If plugin_data is scraped from GitHub, the
            corresponding github_repo document containing info about the GitHub
            repo.

    Returns:
        A list of plugins that are likely to be the same as the given
        plugin_data.
    """
    # If we have a vimorg_id, then we have a direct key to a vim.org script
    # if it's in DB.
    if plugin_data.get('vimorg_id'):
        query = r.table('plugins').get_all(plugin_data['vimorg_id'],
                index='vimorg_id')
        return list(query.run(r_conn()))

    # If we have a (github_owner, github_repo_name) pair, try to match it with
    # an existing github-scraped plugin.
    if plugin_data.get('github_owner') and plugin_data.get('github_repo_name'):
        github_owner_repo = [
            plugin_data['github_owner'].lower(),
            plugin_data['github_repo_name'].lower()]

        query = r.table('plugins').get_all(
                github_owner_repo,
                index='github_owner_repo')
        matching_plugins = list(query.run(r_conn()))
        if matching_plugins:
            return matching_plugins

    # Ok, now we know we have a GitHub-scraped plugin that we haven't scraped
    # before. Try to find an associated vim.org plugin.

    normalized_name = _normalize_name(plugin_data)

    # If there's a set of vim.org plugins that reference this GitHub repo, see
    # if we find any with a similar name in that set.
    if repo.get('from_vim_scripts'):
        vimorg_ids = set(repo['from_vim_scripts'])

        matching_plugins = list(r.table('plugins').get_all(
                *list(vimorg_ids), index='vimorg_id').run(r_conn()))

        # First, see if we get a normalized name match from that set.
        normalized_name_matches = filter(lambda p:
                p['normalized_name'] == normalized_name, matching_plugins)

        if normalized_name_matches:
            return normalized_name_matches

        # If not, broaden the search to any matched plugin names that are
        # slightly similar. This is for cases like 'vim-colors-solarized' -->
        # 'solarized' or 'Python-mode-klen' --> 'python-mode'
        matching_plugins = filter(lambda plugin: difflib.SequenceMatcher(None,
                plugin['normalized_name'], normalized_name).ratio() >= 0.6,
                matching_plugins)

        if matching_plugins:
            return matching_plugins

    # Ok, last chance. Find a plugin with the same normalized name AND
    # a similar author name among all plugins.
    query = r.table('plugins').get_all(
            normalized_name, index='normalized_name')
    matching_plugins = list(query.run(r_conn()))

    author = plugin_data['github_author']
    assert author

    return filter(lambda plugin: _is_similar_author_name(
        plugin.get('vimorg_author', ''), author), matching_plugins)


def _are_plugins_different(p1, p2):
    """Returns whether two plugins should be two different DB rows."""
    if (p1.get('vimorg_id') and p2.get('vimorg_id') and
            p1['vimorg_id'] != p2['vimorg_id']):
        return True

    if (p1.get('github_owner') and p1.get('github_repo_name') and
            p2.get('github_owner') and p2.get('github_repo_name') and
            (p1['github_owner'].lower(), p1['github_repo_name'].lower()) !=
            (p2['github_owner'].lower(), p2['github_repo_name'].lower())):
        return True

    return False


def _add_submission_data(plugin, submission):
    """Updates a plugin with info from a user submission."""
    if (plugin.get('category', 'uncategorized') == 'uncategorized' and
            submission.get('category', 'uncategorized') != 'uncategorized'):
        plugin['category'] = submission['category']

    if not plugin.get('tags') and submission.get('tags'):
        update_tags(plugin, submission['tags'])


def add_scraped_data(plugin_data, repo=None, submission=None):
    """Adds scraped plugin data from either vim.org, a github.com/vim-scripts
    repo, or an arbitrary GitHub repo.

    This will attempt to match the plugin data with an existing plugin already
    in the DB using various heuristics. If a reasonable match is found, we
    update, else, we insert a new plugin.

    Arguments:
        plugin_data: Scraped data about a plugin.
        repo: (optional) If plugin_data is scraped from GitHub, the
            corresponding github_repo document containing info about the GitHub
            repo.
        submission: (optional) Associated user submission info for this plugin.
    """
    if submission:
        _add_submission_data(plugin_data, submission)

    plugins = _find_matching_plugins(plugin_data, repo)

    if len(plugins) == 1 and not _are_plugins_different(
            plugins[0], plugin_data):
        updated_plugin = update_plugin(plugins[0], plugin_data)
        insert(updated_plugin, conflict='replace')
    else:
        insert(plugin_data)
        print 'inserted new plugin %s ...' % plugin_data['slug'],
        sys.stdout.flush()


###############################################################################
# Utility functions for powering the web search.


def get_search_index():
    """Returns a view of the plugins table that can be used for search.

    More precisely, we return a sorted list of all plugins, with fields limited
    to the set that need to be displayed in search results or needed for
    filtering and sorting. A keywords field is added that can be matched on
    user-given search keywords.

    We perform a search on plugins loaded in-memory because this is a lot more
    performant (20x-30x faster on my MBPr) than ReQL queries, and the ~5000
    plugins fit comfortably into memory.

    The return value of this function should be cached for these gains.
    """
    query = r.table('plugins')
    query = query.without(['vimorg_long_desc', 'vimorg_install_details',
            'github_long_desc', 'github_readme'])

    # Don't show plugin managers because they're not technically plugins, and
    # also our usage counts for them are not all accurate.
    plugin_manager_slugs = [
        'vim-plug',
        'vundle',
        'neobundle-vim',
        'neobundle-vim-back-to-december',
        'pathogen-vim']
    query = query.filter(
        lambda row: r.expr(plugin_manager_slugs).contains(row['slug']).not_()
    )

    plugins = map(to_json, query.run(r_conn()))

    # We can't order_by on multiple fields with secondary indexes due to the
    # following RethinkDB bug: https://github.com/rethinkdb/docs/issues/160
    # Thus, we sort in-memory for now because it's way faster than using
    # Rethink's order_by w/o indices (~7 secs vs. ~0.012 secs on my MBPr).
    # TODO(david): Pass sort ordering as an argument somehow.
    plugins.sort(key=lambda p: (-p.get('plugin_manager_users', 0),
            -p.get('github_stars', 0), -p.get('vimorg_rating', 0)))

    for plugin in plugins:
        tokens = _get_search_tokens_for_plugin(plugin)
        plugin['keywords'] = ' '.join(sorted(tokens))

    return plugins


def _get_search_tokens_for_plugin(plugin):
    """Returns a set of lowercased keywords generated from various fields on
    the plugin that can be used for searching.
    """
    search_fields = ['name', 'tags', 'vimorg_author', 'github_author',
            'vimorg_short_desc', 'github_short_desc']
    tokens = set()

    for field in search_fields:

        if field not in plugin:
            continue

        value = plugin[field]
        if isinstance(value, basestring):
            tokens_list = value.split()
        elif isinstance(value, list):
            tokens_list = value
        elif value is None:
            tokens_list = []
        else:
            raise Exception('Field %s has untokenizable type %s' % (
                field, type(value)))

        tokens |= set(t.lower() for t in tokens_list)

    return tokens
