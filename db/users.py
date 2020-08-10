import time

import rethinkdb as r

import db.util

r_conn = db.util.r_conn


class RequiredProperty(object):
    pass


_ROW_SCHEMA = {

    # Primary key.
    'username': RequiredProperty(),
    'password': '',
    'enabled': False,
    'role': '',

    # Unix timestamp in seconds
    'created_at': 0,
    'updated_at': 0
}


def ensure_table():
    db.util.ensure_table('users', primary_key='username')


def find(username):
    return r.table('users').get(username).run(r_conn())


def insert(user):
    if _username_taken(user.get('username')):
        raise Exception('This username is already taken')
    user['created_at'] = int(time.time())
    user['updated_at'] = int(time.time())
    user['enabled'] = True
    return r.table('users').insert(user).run(r_conn())


def _username_taken(username):
    return bool(r.table('users').get(username).run(r_conn()))
