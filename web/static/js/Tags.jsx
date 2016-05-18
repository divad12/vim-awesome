"use strict";

var $ = require("jquery");
var _ = require("underscore");
var React = require("react");

var KEYCODES = require("./constants/keycodes.js");

var capitalizeFirstLetter = function(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

var startsWith = function(str, startStr) {
  return str.indexOf(startStr) === 0;
};

// A cache of all tag IDs and their counts.
var allTags = {};

// This is the tags widget on the details page.
var Tags = React.createClass({
  getInitialState: function() {
    return {
      isEditing: false,
      allTags: {}
    };
  },

  componentDidMount: function() {
    this.fetchAllTags();
  },

  componentDidUpdate: function() {
    if (this.refs && this.refs.tagInput) {
      var $input = $(this.refs.tagInput);
      if (!this.props.editOnly) {
        $input.focus();
      }
      this.initTypeahead($input);
    }
  },

  initTypeahead: function($input) {
    var allTags = this.state.allTags;

    var sortTagsByCount = function(items) {
      return _.sortBy(items, function(tag) {
        return -allTags[tag].count;
      });
    };

    // Uses Bootstrap's lightweight typeahead:
    // http://getbootstrap.com/2.3.2/javascript.html#typeahead
    $input.typeahead({
      source: _.keys(allTags),

      sorter: function(items) {
        var exactMatches = [];
        var prefixMatches = [];
        var otherMatches = [];
        var lowerCaseQuery = this.query.toLowerCase();

        // Group matches into exact matches, prefix matches, and remaining
        _.each(items, function(tag) {
          var lowerCaseTag = tag.toLowerCase();
          if (lowerCaseTag === lowerCaseQuery) {
            exactMatches.push(tag);
          } else if (startsWith(lowerCaseTag, lowerCaseQuery)) {
            prefixMatches.push(tag);
          } else {
            otherMatches.push(tag);
          }
        });

        return sortTagsByCount(exactMatches).concat(
            sortTagsByCount(prefixMatches), sortTagsByCount(otherMatches));
      },

      highlighter: function(item) {
        var Typeahead = $.fn.typeahead.Constructor;
        var tagName = capitalizeFirstLetter(item);
        var highlighted = Typeahead.prototype.highlighter.call(this,
            _.escape(tagName));
        return highlighted + "<span class=\"count\">&times; " +
            allTags[item].count + "</span>";
      },

      updater: function(item) {
        this.addTag(item);
        return "";
      }.bind(this)
    });
  },

  fetchAllTags: function() {
    if (!_.isEmpty(allTags)) {
      this.setState({allTags: allTags});
      return;
    }

    $.getJSON("/api/tags", function(data) {
      allTags = _.indexBy(data, 'id');
      this.setState({allTags: allTags});
    }.bind(this));
  },

  onEditBtnClick: function() {
    this.setState({isEditing: true});
  },

  onDoneBtnClick: function() {
    this.setState({isEditing: false});
  },

  onRemoveBtnClick: function(tag) {
    this.props.onTagsChange(_.without(this.props.tags, tag));
  },

  addTag: function(tag) {
    var tagId = tag.replace(/,$/, "").toLowerCase();
    if (tagId) {
      this.props.onTagsChange(this.props.tags.concat(tagId));
    }
  },

  onKeyUp: function(e) {
    var key = e.keyCode;
    if (key === KEYCODES.ENTER || key === KEYCODES.TAB ||
        key === KEYCODES.COMMA) {
      var $input = $(this.refs.tagInput);
      this.addTag($input.val());
      $input.val("");
    }
  },

  onKeyDown: function(e) {
    var key = e.keyCode;
    if (key === KEYCODES.ENTER) {
      e.preventDefault();  // Prevent unintended form submission
    }
  },

  render: function() {
    var MAX_TAGS = 4;
    var isEditing = this.state.isEditing || this.props.editOnly;

    var actionBtn;
    if (isEditing) {
      actionBtn = <button type="button"
          onClick={this.onDoneBtnClick} className="action-btn done-btn">
        <i className="icon-check"></i> Done
      </button>;
    } else {
      actionBtn = <button type="button"
          onClick={this.onEditBtnClick} className="action-btn edit-btn">
        <i className="icon-edit"></i> Edit
      </button>;
    }

    var tags = _.map(this.props.tags, function(tag) {
      // TODO(david): Should get tag name from map of tags that we send down.
      var tagName = capitalizeFirstLetter(tag);
      return <li key={tag} className="tag">
        <a className="tag-link" href={"/?q=tag:" + encodeURIComponent(tag)}>
          {tagName}
        </a>
        <i onClick={this.onRemoveBtnClick.bind(this, tag)}
            className="icon-remove-sign remove-btn"></i>
      </li>;
    }.bind(this));

    // TODO(david): Tags should be colored appropriately
    return <div className={"tags-select" + (isEditing ? " editing" : "")}>
      <h3 className="tags-label">Tags</h3>
      <ul className="tags-list">{tags}</ul>
      {isEditing && this.props.tags.length < MAX_TAGS &&
          <input ref="tagInput" onKeyDown={this.onKeyDown}
              onKeyUp={this.onKeyUp} type="text"
              maxLength="12" className="tag-input" placeholder="Add tag" />}
      {!this.props.editOnly && actionBtn}
    </div>;
  }
});

module.exports = Tags;
