#!/bin/bash

# Bail on errors
set -e

function clean_up() {
  set +e
  kill 0

  # Force kill any processes that haven't died after a while. Sometimes, but not
  # always, RethinkDB v1.11.2 refuses to be killed by SIGTERM when backgrounded
  # on OS X Mountain Lion.
  # TODO(david): This is a terrible hack. Figure out a better way to kill
  #     rethinkdb, or try upgrading.
  ( sleep 2; kill -9 0 ) &

  exit
}

# Kill all child processes on script abort
trap clean_up SIGTERM SIGINT ERR

echo "Starting compass watch"
bundle exec compass watch --config conf/compass.rb &

echo "Starting webpack"
npm run watch &

echo "Starting rethinkdb"
[ -d db/rethinkdb_data ] || rethinkdb create -d db/rethinkdb_data
rethinkdb serve -d db/rethinkdb_data &

echo "Starting flask server"
PYTHONPATH=. FLASK_CONFIG=../conf/flask_dev.py python2 web/server.py
