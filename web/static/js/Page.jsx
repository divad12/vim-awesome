"use strict";

var React = require("react");

var Footer = require("./Footer.jsx");
var Sidebar = require("./Sidebar.jsx");

var Page = React.createClass({
  componentDidUpdate: function() {
    // Google Analytics pageview tracking for single page app
    // Thank you https://gist.github.com/daveaugustine/1771986#comment-958107
    var ga = window.ga;
    if (ga) {
      var relativeUrl = window.location.pathname + window.location.search;
      ga("send", "pageview", relativeUrl);
    }
  },

  render: function() {
    return <div className="page-container">
      <Sidebar query={this.props.location.query} />
      <div className="content">
        {this.props.children}
        <Footer />
      </div>
    </div>;
  }
});

module.exports = Page;
