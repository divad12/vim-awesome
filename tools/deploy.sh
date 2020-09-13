#!/usr/bin/env bash

# Updates and restarts the vim-awesome webapp on the machine.
# Can be run either directly on the machine, or by running
#
# $ cat deploy.sh | ssh vim@vimawesome.com DEPLOYER=`whoami` sh
#
# Env Args:
#    $DEPLOYER: `whoami`

# Bail on errors
# TODO(david): Rollback properly on fail.
set -e

cd $HOME

# Generate a new directory to clone to
NEW_CLONE=repos/vim-awesome-`date +%s`

# Do the clone
echo "Cloning vim-awesome"
git clone https://github.com/vim-awesome/vim-awesome.git $NEW_CLONE > /dev/null

# TODO(david): Use virtualenv so we don't have to sudo pip install
echo "Installing Python requirements"
sudo pip install -r $NEW_CLONE/requirements.txt

echo "Installing Node requirements"
( cd $NEW_CLONE && npm install --only=production)

echo "Installing Ruby requirements"
( cd $NEW_CLONE && bundle install )

echo "Precompile JSX and bundle JS files"
( cd $NEW_CLONE && NODE_ENV=production node_modules/.bin/webpack --config conf/webpack.config.js )

echo "Compass compile sass files"
( cd $NEW_CLONE && \
  bundle exec compass compile --config conf/compass.rb \
    --output-style compressed )

echo "Linking in secrets.py"
( cd $NEW_CLONE && ln -s $HOME/secrets.py . )

echo "Linking new vim-awesome into place"
ln -snf $NEW_CLONE vim-awesome

# Kill the old gunicorn server, if it exists
# TODO(david): Use a proper daemon. Also send SIGHUP instead of SIGINT:
#     http://gunicorn-docs.readthedocs.org/en/latest/faq.html#server-stuff
if [ -e .gunicorn.pid ]
then
    echo "Killing gunicorn"
    PID=$(cat .gunicorn.pid)
    if ! kill $PID > /dev/null 2>&1; then
      echo "Warning: Unable to find Gunicorn running as PID: $PID" >&2
    fi
fi

echo "Creating any new tables and indices"
( cd $NEW_CLONE && make init_db )

echo "Restarting gunicorn"
PYTHONPATH="/home/vim/vim-awesome" \
  FLASK_CONFIG="$HOME/vim-awesome/conf/flask_prod.py" \
  gunicorn \
  --config vim-awesome/conf/gunicorn.py server:app

# TODO(david): Send some requests to warm-up caches after deploy.

echo "Removing old vim-awesome clones"
for old in $(ls repos/ | head -n -2)
do
    rm -rf repos/$old
done

echo "Installing crontab"
( cd $NEW_CLONE && crontab crontab )

echo "Installing logrotate config"
sudo ln -sfnv $HOME/$NEW_CLONE/conf/etc/logrotate.d/vim-awesome-cron /etc/logrotate.d

PYTHONPATH=$NEW_CLONE python $NEW_CLONE/tools/notify_deploy.py $DEPLOYER
