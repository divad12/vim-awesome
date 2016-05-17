"use strict";

var React = require("react");

var Footer = React.createClass({
  render: function() {
    return <div className="site-footer">
      <div className="first-row clearfix">
        <div className="about-section">
          <div className="about">
            Vim Awesome is a directory of Vim plugins sourced from GitHub,
            Vim.org, and user submissions. Plugin usage data is extracted from
            dotfiles repos on GitHub.
          </div>
          <div className="credits">
            Made with vim and vigor by
            {' '}<a target="_blank" href="https://twitter.com/divad12">
              David Hu
            </a>,
            {' '}<a target="_blank" href="http://benalpert.com">
              Ben Alpert
            </a>, and
            {' '}<a target="_blank" href="https://github.com/xymostech">
              Emily Eisenberg
            </a>.
          </div>
        </div>
        <div className="github-section">
          <a href="https://github.com/vim-awesome/vim-awesome"
              className="github-link">
            Contribute
            <i className="icon-github"></i>
            on GitHub
          </a>
        </div>
        <div className="links-section">
          <ul className="links">
            <li><a href="/about">About</a></li>
            <li><a href="/submit">Submit</a></li>
            <li><a target="_blank" href="https://twitter.com/vimawesome">
                Twitter
            </a></li>
            <li><a target="_blank" href="mailto:emacs@vimawesome.com">
                Email us
            </a></li>
          </ul>
        </div>
      </div>
    </div>;
  }
});

module.exports = Footer;
