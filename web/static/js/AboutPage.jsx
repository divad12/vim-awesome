"use strict";

var React = require("react");

var AboutPage = React.createClass({
  render: function() {
    return <div className="about-page">

      <div className="long-desc-container long-desc">
        <h1>About</h1>
        <p>
          Vim Awesome wants to be a comprehensive, accurate, and up-to-date
          directory of Vim plugins.
        </p>
        <p>
          Many recent Vim plugins are announced on Hacker News or specialized
          boards, and have since become widely used. But how does a new user
          find out about these? We wanted to solve that problem and others
          with Vim Awesome &mdash; <strong> an open-sourced community resource
          for discovering new and popular Vim plugins </strong>.
        </p>

        <img className="vim-cleaner-img" src="/static/img/vim-cleaner.png" />
        <h2>Huh? Vim, the bathroom cleaner?</h2>
        <p>
          Yes, Vim is a cleaning product! But it's also a popular text editor
          pre-installed on many Unix systems. Because it's highly extensible,
          there have been thousands of plugins written for it.
        </p>
        <p>
          As of 2014, it is highly recommended to install plugins with
          a plugin manager such as
          {' '}<a target="_blank" href="https://github.com/gmarik/vundle">
            Vundle
          </a>,
          {' '}<a target="_blank" href="https://github.com/Shougo/neobundle.vim">
            NeoBundle
          </a>, or
          {' '}<a target="_blank" href="https://github.com/tpope/vim-pathogen">
            Pathogen
          </a>.
        </p>

        <h2>Where does the data come from?</h2>
        <p>
          GitHub, Vim.org, and user submissions.
        </p>
        <p>
          On GitHub there are more than 30 000 repos that are
          development environment configurations, commonly called
          {' '}<em>dotfiles</em>. From these repos we can extract{' '}
          <a href="https://github.com/divad12/dotfiles/blob/master/.vimrc#L23"
              target="_blank">
            references to Vim plugins (as Git URIs)
          </a>,
          particularly when plugin managers are used.
        </p>
        <p>
          Although there are orders of magnitude more Vim users than public
          dotfiles repos on GitHub, it is still a useful source of relative
          usage data.
        </p>

        <h2>Contribute?</h2>
        <p>
          Why, thank you! There are lots of things you can do to help out:
        </p>
        <ul>
          <li>
            Tackle a{' '}
            <a href="https://github.com/vim-awesome/vim-awesome/issues?labels=easyfix&amp;state=open">
              starter issue on GitHub
            </a> (or report an issue!).
          </li>
          <li>
            Categorize and tag some of{' '}
            <a href="/?q=cat:uncategorized">
              these plugins
            </a>.
          </li>
          <li>
            <a href="/submit">
              Submit
            </a>{' '}
            new plugins.
          </li>
          <li>
            Share this site if you find it useful! :)
          </li>
        </ul>

        <h2>Acknowledgements</h2>
        <p>
          Thank you Ethan Schoonover for use of the
          {' '}<a target="_blank" href="http://ethanschoonover.com/solarized">
            Solarized
          </a>{' '}
          colour scheme.
        </p>
        <p>
          Much inspiration for this website, both conception and design, came
          from <a target="_blank" href="http://unheap.com">unheap.com</a>,
          a resource for browsing jQuery plugins.
        </p>
        <p>
          Built with
          {' '}<a target="_blank" href="http://facebook.github.io/react/">
            React
          </a>, a JavaScript library for building UIs, and
          {' '}<a target="_blank" href="http://rethinkdb.com/">
            RethinkDB
          </a>, a document-oriented database.
        </p>
      </div>
    </div>;
  }
});

module.exports = AboutPage;
