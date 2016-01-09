import itertools
import json
import logging
import re

import flask
from flask import request
from cache import cache
import requests
import rethinkdb as r

import web.api.api_util as api_util
import db


try:
    import secrets
    _HIPCHAT_TOKEN = secrets.HIPCHAT_TOKEN
    _HIPCHAT_ROOM_ID = secrets.HIPCHAT_ROOM_ID
except ImportError:
    _HIPCHAT_TOKEN = None
    _HIPCHAT_ROOM_ID = None


api = flask.Blueprint("api", __name__, url_prefix="/api")

r_conn = db.util.r_conn


def _should_skip_get_plugins_cache():
    """Whether the current request to /api/plugins should not be cached."""
    page = int(request.args.get('page', 1))
    search = request.args.get('query', '')

    # Only cache empty searches for now.
    # TODO(david): Also cache simple category and tag searches. May also want
    #     to actually use a proper cache backend like Redis so we can
    #     arbitrarily cache (right now we use an in-memory cache).
    should_cache = search == '' and (1 <= page <= 10)
    return not should_cache


def _make_get_plugins_cache_key():
    """Get a cache key for the /api/plugins route.

    By default this is just request.path which ignores query params.
    """
    page = int(request.args.get('page', 1))
    search = request.args.get('query', '')
    return '%s_%s_%s' % (request.path, page, search)


# TODO(david): Consider saving categories just as special tags. Would make
#     search implementation simpler but determining which category a plugin
#     belongs to harder. See discussion on
#     http://phabricator.benalpert.com/D171
def _apply_category_filters(results, tokens):
    """Consumes and applies category filters (e.g. "cat:other") to results.

    Arguments:
        results: List of search result plugins.
        tokens: Remaining search text tokens that have not been consumed.

    Returns:
        (results, tokens): Results that match the given category, and tokens
        that have not been consumed.
    """
    category_filter = lambda t: t.startswith('cat:')
    category_tokens = filter(category_filter, tokens)
    tokens = list(itertools.ifilterfalse(category_filter, tokens))

    if category_tokens:
        category_ids = set(t[len('cat:'):] for t in category_tokens)
        results = filter(lambda plugin:
                plugin['category'] in category_ids, results)

    return results, tokens


def _apply_tag_filters(results, tokens):
    """Consumes and applies tag filters (e.g. "tag:python") to search results.

    Arguments:
        results: List of search result plugins.
        tokens: Remaining search text tokens that have not been consumed.

    Returns:
        (results, tokens): Results that match the given tag, and tokens
        that have not been consumed.
    """
    tag_filter = lambda t: t.startswith('tag:')
    tag_tokens = filter(tag_filter, tokens)
    tokens = list(itertools.ifilterfalse(tag_filter, tokens))

    if tag_tokens:
        required_tags = set(t[len('tag:'):] for t in tag_tokens)
        results = filter(lambda plugin:
                required_tags <= set(plugin['tags']), results)

    return results, tokens


def _apply_keyword_filters(results, tokens):
    """Filters results that match the given keywords (tokens).

    Arguments:
        results: List of search result plugins.
        tokens: Keywords to filter results on.

    Returns:
        List of plugins that match the given keywords.
    """
    if tokens:
        # Create a regex that matches a string S iff for each keyword K in
        # `search` there is a corresponding word in S that begins with K.
        tokens_regex = (r'\b%s' % re.escape(t) for t in tokens)
        search_regex = re.compile('.*'.join(tokens_regex))

        # Surprisingly, regex matching like this is slightly faster than
        # prefix-matching two sorted lists of tokens.
        results = filter(lambda plugin:
                search_regex.search(plugin['keywords']), results)

    return results


@api.route('/plugins', methods=['GET'])
@cache.cached(timeout=60 * 60 * 25, key_prefix=_make_get_plugins_cache_key,
        unless=_should_skip_get_plugins_cache)
def get_plugins():
    RESULTS_PER_PAGE = 20

    page = int(request.args.get('page', 1))
    search = request.args.get('query', '')

    results = get_search_index_cached()

    if search:
        tokens = [t.lower() for t in sorted(search.split())]
        results, tokens = _apply_category_filters(results, tokens)
        results, tokens = _apply_tag_filters(results, tokens)
        results = _apply_keyword_filters(results, tokens)

    count = len(results)
    total_pages = (count + RESULTS_PER_PAGE - 1) / RESULTS_PER_PAGE  # ceil

    results = results[((page - 1) * RESULTS_PER_PAGE):
            (page * RESULTS_PER_PAGE)]

    return api_util.jsonify({
        'plugins': results,
        'total_pages': total_pages,
        'total_results': count,
        'results_per_page': RESULTS_PER_PAGE,
    })


@api.route('/plugins/<slug>', methods=['GET'])
def get_plugin(slug):
    plugin = r.table('plugins').get(slug).run(r_conn())

    if plugin:
        return api_util.jsonify(db.plugins.to_json(plugin))
    else:
        return api_util.api_not_found('No plugin with slug %s' % slug)


# TODO(david): Make it not so easy for an attacker to completely obliterate all
#     of our tags, or at least be able to recover from it.
@api.route('/plugins/<slug>/tags', methods=['POST', 'PUT'])
def update_plugin_tags(slug):
    data = json.loads(flask.request.data)
    plugin = r.table('plugins').get(slug).run(r_conn())

    if not plugin:
        return api_util.api_not_found('No plugin with slug %s' % slug)

    db.plugins.update_tags(plugin, data['tags'])
    return api_util.jsonify({
        'tags': plugin['tags']
    })


@api.route('/tags', methods=['GET'])
@cache.cached(timeout=60 * 60)
def get_tags():
    tags = r.table('tags').filter({}).run(r_conn())
    return api_util.jsonify(list(tags))


@api.route('/categories', methods=['GET'])
@cache.cached(timeout=60 * 60)
def get_categories():
    return api_util.jsonify(get_all_categories_cached())


@api.route('/plugins/<slug>/category/<category>', methods=['PUT'])
def update_plugin_category(slug, category):
    plugin = r.table('plugins').get(slug).run(r_conn())
    if not plugin:
        return api_util.api_not_found('No plugin with slug %s' % slug)

    if not category in [c['id'] for c in get_all_categories_cached()]:
        return api_util.api_bad_request('No such category %s' % category)

    # TODO(david): Also update search index (stale cache)
    plugin['category'] = category
    r.table('plugins').update(plugin).run(r_conn())
    return api_util.jsonify({
        'category': plugin['category']
    })


@api.route('/submit', methods=['POST'])
def submit_plugin():
    plugin_data = flask.request.form.to_dict()
    plugin_data['tags'] = json.loads(plugin_data['tags'])
    plugin_check = db.submitted_plugins.check_plugin(plugin_data)
    if plugin_check>0:
        return api_util.jsonify({
            'status': False,
            'message': 'This plugin is exists.'
        })
    else:
        db.submitted_plugins.insert(plugin_data)
        message = "Someone just submitted a plugin!\n%s" % (
               json.dumps(plugin_data, indent=4))  # JSON for pretty-printing
        notify(plugin_data, message)
        return api_util.jsonify({
            'status': True,
            'redirect': '/thanks-for-submitting'
        })


@cache.cached(timeout=60 * 60 * 26, key_prefix='search_index')
def get_search_index_cached():
    return db.plugins.get_search_index()


@cache.cached(timeout=60 * 60 * 27, key_prefix='all_categories')
def get_all_categories_cached():
    return db.categories.get_all()

def notify(plugin_data,message):
     # Notify HipChat of this submission.
    # TODO(david): Also have email notifications.
    if _HIPCHAT_TOKEN and _HIPCHAT_ROOM_ID:
        payload = {
           'auth_token': _HIPCHAT_TOKEN,
           'notify': 0,
           'color': 'green',
           'from': 'Vim Awesome',
           'room_id': _HIPCHAT_ROOM_ID,
           'message': message,
           'message_format': 'text',
        }

        try:
            requests.post('https://api.hipchat.com/v1/rooms/message',
                    data=payload, timeout=10)
        except Exception:
            logging.exception('Failed to notify HipChat of plugin submisson')
