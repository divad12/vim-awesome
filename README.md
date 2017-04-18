[![Build Status](https://travis-ci.org/vim-awesome/vim-awesome.svg?branch=master)](https://travis-ci.org/vim-awesome/vim-awesome)

# Vim Awesome

Vim Awesome wants to be a comprehensive, accurate, and up-to-date directory of
Vim plugins.

Many recent Vim plugins are announced on Hacker News or specialized boards, and
have since become widely used. But how does a new user find out about these? We
wanted to solve that problem and others with Vim Awesome — an open-sourced
community resource for discovering new and popular Vim plugins.

[Technical report on the details](https://github.com/vim-awesome/vim-awesome/raw/master/docs/report.pdf)

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
1. Install RethinkDB version 2.3.0 from http://rethinkdb.com/docs/install/.
  (You may have to dig into the
  [download archives](http://download.rethinkdb.com/).)

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
  $ npm install -g webpack
  $ npm install
  ```

1. Start a local server serving port 5001 by invoking, in the project root
   directory,

  ```sh
  $ make
  ```

1. Initialize the database, tables, and indices:

  ```sh
  $ make init_db
  ```

1. Seed the database with some test data. Download [this database dump](https://github.com/vim-awesome/vim-awesome/releases/download/v1.2/rethinkdb_dump_2016-04-14.tar.gz), and then run


  ```sh
  $ rethinkdb restore -i vim_awesome /path/to/vim_awesome_rethinkdb_dump.tar.gz
  ```

1. Open the website in your browser!

  ```sh
  $ open http://localhost:5001
  ```

## Contributing

Take a look at [some of these issues](https://github.com/vim-awesome/vim-awesome/issues?labels=easyfix&state=open) to get started.

Chat with us on [Gitter](https://gitter.im/vim-awesome/vim-awesome)!

## Acknowledgements

Thanks Ethan Schoonover for use of the Solarized colour scheme.

Much inspiration for this website, both conception and design, came from
[unheap.com](http://unheap.com), a resource for browsing jQuery plugins.

Built with [React](http://facebook.github.io/react/), a JavaScript library for
building UIs, and [RethinkDB](http://rethinkdb.com/), a document-oriented
database.
