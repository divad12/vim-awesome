"use strict";

var $ = require("jquery");
var React = require("react");
var store = require("store");
var browserHistory = require("react-router").browserHistory;
var findDOMNode = require("react-dom").findDOMNode;

var Plugin = React.createClass({
  getInitialState: function() {
    var pluginId = this.props.plugin.slug;
    var pluginStore = pluginId && store.enabled &&
        store.get("plugin-" + pluginId);

    return {
      hasVisited: pluginStore && pluginStore.hasVisited
    };
  },

  componentDidMount: function() {
    this.addBootstrapTooltips();
  },

  componentWillUnmount: function() {
    $(findDOMNode(this)).find('[title]').tooltip('destroy');
  },

  componentDidUpdate: function() {
    this.addBootstrapTooltips();
  },

  addBootstrapTooltips: function() {
    $(findDOMNode(this)).find('[title]').tooltip({
      animation: false,
      container: 'body'
    });
  },

  goToDetailsPage: function() {
    browserHistory.push("plugin/" + this.props.plugin.slug);
  },

  render: function() {
    // TODO(david): Animations on initial render
    var plugin = this.props.plugin;
    if (!plugin || !plugin.name) {
      return <li className="plugin"></li>;
    }

    var hasNavFocus = this.props.hasNavFocus;
    return <li
        className={"plugin" + (hasNavFocus ? " nav-focus" : "") +
            (this.state.hasVisited ? " visited" : "")}
        onMouseEnter={this.props.onMouseEnter}>
      {/* TODO(captbaritone): Use react-router Link */}
      <a href={"/plugin/" + plugin.slug}>
        <h3 className={"plugin-name " + plugin.category}>{plugin.name}</h3>
        {plugin.author && <span className="by">by</span>}
        {plugin.author &&
          <span className="author">{" " + plugin.author}</span>}
        {plugin.github_stars > 0 &&
          <div className="github-stars"
              title={plugin.github_stars + " stars on GitHub"}>
            {plugin.github_stars}<i className="icon-star"></i>
          </div>
        }
        {plugin.plugin_manager_users > 0 &&
          <div className="plugin-users"
              title={plugin.plugin_manager_users +
              " Vundle/Pathogen/NeoBundle users on GitHub"}>
            {plugin.plugin_manager_users}<i className="icon-user"></i>
          </div>
        }
        <p className="short-desc">{plugin.short_desc}</p>
      </a>
    </li>;
  }
});

module.exports = Plugin;
