# Vim Awesome

Vim Awesome wants to be a comprehensive, accurate, and up-to-date directory of
Vim plugins.

Many recent Vim plugins are announced on Hacker News or specialized boards, and
have since become widely used. But how does a new user find out about these? We
wanted to solve that problem and others with Vim Awesome — an open-sourced
community resource for discovering new and popular Vim plugins.

## Where does the data come from?

GitHub, Vim.org, and user submissions.

On GitHub there are more than 30 000 repos that are development environment
configurations, commonly called dotfiles. From these repos we can extract
[references to Vim plugins (as Git URIs)](https://github.com/divad12/dotfiles/blob/master/.vimrc#L23),
particularly when plugin managers are used.

Although there are orders of magnitude more Vim users than public dotfiles
repos on GitHub, it is still a useful source of relative usage data.

## Getting set up

<!-- TODO(david): Don't hardcode version here. -->
1. Install RethinkDB version 1.13.0-0 from http://rethinkdb.com/docs/install/.

1. Install Sass and Compass, which we use to generate our CSS.

  ```sh
  $ gem update --system
  $ gem install bundler
  $ bundle install
  ```

1. Install Python dependencies.

  ```sh
  $ pip install -r requirements.txt
  ```

1. Install Node dependencies.

  ```sh
  $ sudo npm install -g webpack
  $ sudo npm install
  ```

1. Start a local server serving port 5001 by invoking, in the project root
   directory,

  ```sh
  $ make
  ```

1. Make database table and indices:

  ```sh
  $ make ensure_tables_and_indices
  ```

1. Seed the database with some test data. Download [this database dump](https://dl.dropboxusercontent.com/u/18795947/vim_awesome_rethinkdb_dump.tar.gz), and then run

  ```sh
  $ rethinkdb restore -i vim_awesome /path/to/vim_awesome_rethinkdb_dump.tar.gz
  ```

1. Open the website in your browser!

  ```sh
  $ open http://localhost:5001
  ```

## Contributing

Take a look at [some of these issues](https://github.com/divad12/vim-awesome/issues?labels=easyfix&state=open) to get started.

Chat with us on #vimawesome on freenode!
