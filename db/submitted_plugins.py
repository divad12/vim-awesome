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
                .run(r_conn()))


def get_by_id(id):
    return r.table('submitted_plugins').get(id).run(r_conn())


def delete(id):
    return r.table('submitted_plugins').get(id).delete().run(r_conn())


def approved(id):
    return r.table('submitted_plugins').get(id).update({
        'approved': True
    }).run(r_conn())
