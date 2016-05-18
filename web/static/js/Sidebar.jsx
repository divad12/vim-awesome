"use strict";

var $ = require("jquery");
var _ = require("underscore");
var React = require("react");
var browserHistory = require("react-router").browserHistory;

var SidebarCategory = require("./SidebarCategory.jsx");
var utils = require("./utils.js");
var fetchAllCategories = require("./fetchAllCategories.js");


var Sidebar = React.createClass({
  getInitialState: function() {
    return {
      categories: []
    };
  },

  componentDidMount: function() {
    fetchAllCategories(function(categories) {
      if (this.isMounted()) {
        this.setState({categories: categories});
      }
    }.bind(this));

    // This event is triggered by Bootstrap's collapse widget (which creates the
    // accordion) when a category is expanded.
    $(this.refs.categories).on('show', this.onCategoryShow);
  },

  onCategoryShow: function(e) {
    var category = $(e.target).data('category');
    browserHistory.push({query: {"q": "cat:" + category}});
  },

  render: function() {
    var query = this.props.query.q || '';
    var selectedTags = utils.getQueriesWithPrefix(query, 'tag');
    var categories = _.reject(this.state.categories, {id: "uncategorized"});

    return <div className="sidebar">
      <h1 className="title">
        <a href="/">
          <span className="vim">Vim</span>Awesome
        </a>
      </h1>
      <div className="tac">
        <div className="subtitle">
          <div className="line1">Awesome Vim plugins</div>
          <div className="from">from</div>
          <div className="line2">across the Universe</div>
          <div className="from-line"></div>
        </div>
      </div>
      <ul ref="categories" className="categories">{
        categories.map(function(category) {
          return <SidebarCategory
            key={category.id}
            category={category}
            selectedTags={selectedTags}
          />
        })
      }</ul>
      <a href="/submit" className="submit-plugin">
        <i className="icon-plus"></i>Submit plugin
      </a>
    </div>;
  }
});

module.exports = Sidebar;
