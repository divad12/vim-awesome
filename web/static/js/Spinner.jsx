"use strict";

var React = require("react");

var Spinner = React.createClass({
  render: function() {
    return <div className="spinner">
      <div className="rect1" />
      <div className="rect2" />
      <div className="rect3" />
      <div className="rect4" />
      <div className="rect5" />
    </div>;
  }
});

module.exports = Spinner;
