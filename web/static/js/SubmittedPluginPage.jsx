"use strict";

var React = require("react");
var utils = require('./utils');

var SubmittedPluginPage = React.createClass({
  getInitialState: function() {
    return {
      plugin: null
    }
  },

  componentDidMount: function() {
    utils.http.get('/api/submitted-plugins/' + this.props.params.id)
      .then(function (result) {
        this.setState({ plugin: result.plugin })
      }.bind(this))
      .catch(function (err) {
        console.log('ERROR', err);
      });
  },

  link: function (prop) {
    if (!prop) {
      return 'Not provided';
    }

    return <a href={prop} target="_blank">{prop}</a>;
  },

  approve: function (e) {
    e.preventDefault();
    if (confirm('Are you sure you want to approve this plugin?')) {
      alert('Approved!');
    }
  },

  remove: function (e) {
    e.preventDefault();
    if (confirm('Are you sure you want to remove this plugin?')) {
      alert('Removed!');
    }
  },

  render: function() {
    var plugin = this.state.plugin;
    if (!plugin) {
      return null;
    }
    return (
      <div className="submitted-plugin-info">
        <p>Name: {plugin.name}</p>
        <p>Author: {plugin.name}</p>
        <p>Github link: {this.link(plugin['github-link'])}</p>
        <p>Vimorg link: {this.link(plugin['vimorg-link'])}</p>
        <p>Category: {plugin.category}</p>
        <p>Tags: {plugin.tags.join(', ') || 'No tags provided'}</p>
        <p>Submitted at: {(new Date(plugin.submitted_at * 1000)).toDateString()}</p>

        <div>
          <button onClick={this.approve}>Approve</button>{' '}
          <button onClick={this.remove}>Remove</button>
        </div>
      </div>
    );
  }
});

module.exports = SubmittedPluginPage;
