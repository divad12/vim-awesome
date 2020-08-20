"""Utility functions for the submitted plugins table."""

import time

import rethinkdb as r

import db

r_conn = db.util.r_conn


def ensure_table():
    db.util.ensure_table('submitted_plugins')
    db.util.ensure_index('submitted_plugins', 'submitted_at')
    db.util.ensure_index('submitted_plugins', 'vimorg_id')


def insert(plugin_data):
    if not plugin_data.get('submitted_at'):
        plugin_data['submitted_at'] = int(time.time())

    r.table('submitted_plugins').insert(plugin_data).run(r_conn())


def get_list():
    return list(r.table('submitted_plugins')
                .order_by(index=r.desc('submitted_at'))
                .filter(r.row['approved'] != True, default=True)  # NOQA
                .filter(r.row['rejected'] != True, default=True)  # NOQA
                .run(r_conn()))


def get_by_id(id):
    return r.table('submitted_plugins').get(id).run(r_conn())


def reject(id):
    return r.table('submitted_plugins').get(id).update({
        'rejected': True
    }).run(r_conn())


def approve_and_enable_scraping(id, plugin_info):
    update_data = {
        'approved': True
    }
    if plugin_info['vimorg_id']:
        update_data['vimorg_id'] = plugin_info['vimorg_id']

    r.table('submitted_plugins').get(id).update(update_data).run(r_conn())

    plugin = get_by_id(id)

    if plugin_info['github_owner'] and plugin_info['github_repo_name']:
        db.github_repos.PluginGithubRepos.upsert_with_owner_repo({
            'owner': plugin_info['github_owner'],
            'repo_name': plugin_info['github_repo_name'],
            'from_submission': plugin
        })

    return plugin
