"use strict"

var _ = require("underscore");
var React = require("react");

var SidebarCategoryTag = React.createClass({
  render: function() {
    // TODO(Jeff): should check out classSet, in the experimental Add-ons
    var classString = "tag-link";
    if (this.props.selected) {
      classString += " highlighted-tag";
    }

    var tag = this.props.tag;
    var href = "/?q=tag:" + encodeURIComponent(tag.id);

    return <li>
      <a href={href} className={classString}>
        <span className="tag-id">{tag.id}</span>
        {tag.count > 1 && <span className="tag-count"> × {tag.count}</span>}
      </a>
    </li>;
  }
});

var SidebarCategory = React.createClass({
  render: function() {
    var selectedTags = this.props.selectedTags;
    var category = this.props.category;
    var tagsClass = category.id + "-tags";

    return <li className={"accordion-group category " + category.id}>
      <a data-toggle="collapse" data-target={"." + tagsClass}
        data-parent=".categories" className="category-link">
        <i className={category.icon}></i>{category.name}
      </a>
      <div className={"collapse " + tagsClass} data-category={category.id}>
        <ul className="category-tags">{
          category.tags.map(function(tag) {
            return <SidebarCategoryTag
              key={tag.id}
              tag={tag}
              selected={_.contains(selectedTags, tag.id)}
            />
          })
        }</ul>
      </div>
    </li>;
  }
});

module.exports = SidebarCategory;
