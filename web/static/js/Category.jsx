"use strict";

var $ = require("jquery");
var _ = require("underscore");
var React = require("react");
var findDOMNode = require("react-dom").findDOMNode;

var fetchAllCategories = require("./fetchAllCategories.js");

// This is the category link and edit widget on the details page.
var Category = React.createClass({
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
    this.addBootstrapTooltips();
  },

  componentWillUnmount: function() {
    $(findDOMNode(this)).find('[title]').tooltip('destroy');
  },

  componentDidUpdate: function() {
    this.addBootstrapTooltips();
  },

  addBootstrapTooltips: function() {
    _.delay(function() {
      $(findDOMNode(this)).find('[title]')
        .tooltip('destroy')
        .tooltip({
          animation: false,
          container: 'body'
        });
    }.bind(this), 200);
  },

  onCategoryOptionClick: function(categoryId, e) {
    e.preventDefault();
    this.props.onCategoryChange(categoryId);
  },

  onCategoryClick: function(e) {
    if (this.props.editOnly) {
      e.preventDefault();
      this.refs.editBtn.click();
    }
  },

  render: function() {
    var categoryElements = _.chain(this.state.categories)
      .reject({id: "uncategorized"})
      .map(function(category) {
        return <li key={category.id}>
          <a title={category.description} data-placement="left" href="#"
              className="category-item"
              onClick={this.onCategoryOptionClick.bind(this, category.id)}>
            <i className={"category-icon " + category.icon}></i>
            {category.name}
          </a>
        </li>;
      }.bind(this));

    var category = _.findWhere(this.state.categories,
        {id: this.props.category}) || {};

    return <div className="category-select">
      <a title={category.description} data-placement="left"
          className={category.id + " category-link"}
          href={this.props.editOnly ? "#" : "/?q=cat:" + category.id}
          onClick={this.onCategoryClick}>
        <i className={category.icon + " category-icon"}></i> {category.name}
      </a>

      <div className="dropdown">
        <a ref="editBtn" className="dropdown-toggle" data-toggle="dropdown"
            data-target="#">
          <i className="icon-edit"></i>
        </a>
        <ul className="dropdown-menu pull-right">
          <li className="disabled">
            <a className="select-heading">Change category</a>
          </li>
          {categoryElements}
        </ul>
      </div>
    </div>;
  }
});

module.exports = Category;
