"use strict";

var React = require("react");

var NotFound = React.createClass({
  render: function() {
    return <div className="not-found">
        <h1>404</h1>
        <p>The resource could not be found at this time, please <a href="/">try again</a>.</p>
      </div>;
  }
});

module.exports = NotFound;
