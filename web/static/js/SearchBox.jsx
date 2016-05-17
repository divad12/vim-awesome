"use strict";

var React = require("react");

var KEYCODES = require("./constants/keycodes.js");

var SearchBox = React.createClass({
  componentDidMount: function() {
    window.addEventListener("keyup", this.windowKeyUp, false);
  },

  componentWillUnmount: function() {
    window.removeEventListener("keyup", this.windowKeyUp, false);
  },

  windowKeyUp: function(e) {
    var tag = e.target.tagName;
    var key = e.keyCode;
    if (tag !== "INPUT" && tag !== "TEXTAREA" &&
        key === KEYCODES.FORWARD_SLASH) {
      var inputElement = this.refs.input;
      inputElement.focus();
      inputElement.select();
      this.props.onFocus();
    }
  },

  handleKeyUp: function(e) {
    var key = e.nativeEvent.keyCode;
    if (key === KEYCODES.ESCAPE || key === KEYCODES.ENTER) {
      this.refs.input.blur();
      this.props.onBlur();
    }
  },

  onChange: function() {
    this.props.onChange(this.refs.input.value);
  },

  render: function() {
    return <div className="search-container">
      <i className="icon-search"></i>
      <input type="text" className="search" placeholder="Search" ref="input"
          value={this.props.searchQuery} onChange={this.onChange}
          onKeyUp={this.handleKeyUp} />
    </div>;
  }
});

module.exports = SearchBox;
