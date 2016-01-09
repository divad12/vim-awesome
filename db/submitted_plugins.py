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


def check_plugin(plugin_data):
    r.connect().use("vim_awesome")
    check = r.table('submitted_plugins').filter(r.row['vimorg-link'] == plugin_data['vimorg-link']).run(r_conn())
    return len(list(check))

