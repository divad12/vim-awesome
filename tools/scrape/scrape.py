import argparse
import logging

from tools.scrape import vimorg, github


def scrape_github_plugins(num):
    print "\nScraping plugins from github.com..."
    github.scrape_num_plugin_repos(num)
    print "%s GitHub API requests remaining." % github.get_requests_left()


def scrape_github_vim_scripts(num):
    print "\nScraping plugins from the github.com/vim-scripts user..."
    github.scrape_vim_scripts_repos(num)
    print "%s GitHub API requests remaining." % github.get_requests_left()


def scrape_github_dotfiles(num):
    print "\nScraping dotfiles from github.com..."
    num_scraped, scraped_counter = github.scrape_dotfiles_repos(num)
    print "\nScraped %s dotfiles repos." % num_scraped
    print "Found: %s" % scraped_counter
    print "%s GitHub API requests remaining." % github.get_requests_left()


def scrape_vimorg(num):
    print "\nScraping plugins from vim.org..."
    vimorg.scrape_scripts(num)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()

    scrape_fns = {
        "vim.org": scrape_vimorg,
        "github-plugins": scrape_github_plugins,
        "github-vim-scripts": scrape_github_vim_scripts,
        "github-dotfiles": scrape_github_dotfiles,
    }

    parser.add_argument("number", nargs="?", default=6000, type=int,
            help="Maximum # of objects to scrape from each source"
            " (default: 6000)")
    parser.add_argument("--source", "-s", choices=scrape_fns.keys(),
            default="all", help="Source to scrape from (default: all)")

    args = parser.parse_args()

    sources = scrape_fns.keys() if args.source == "all" else [args.source]
    for source in sources:
        scrape_fn = scrape_fns[source]
        try:
            scrape_fn(args.number)
        except Exception:
            logging.exception("scrape.py: error in %s " % (scrape_fn))
