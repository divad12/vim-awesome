/* eslint-disable no-console */
"use strict";

var React = require("react");
var browserHistory = require("react-router").browserHistory;
var utils = require('./utils');

var SubmittedPluginPage = React.createClass({
  getInitialState: function() {
    return {
      plugin: null,
      similarPlugins: [],
      error: ''
    }
  },

  componentDidMount: function() {
    this.fetchPlugin()
      .then(function() {
        return this.fetchPluginsWithSameName()
      }.bind(this));
  },

  fetchPlugin: function() {
    return utils.http.get('/api/submitted-plugins/' + this.props.params.id)
      .then(function (result) {
        this.setState({ plugin: result.plugin })
      }.bind(this))
      .catch(function (err) {
        console.log('Error fetching plugin', err);
      });
  },

  fetchPluginsWithSameName: function() {
    if (!this.state.plugin || !this.state.plugin.name) {
      return null;
    }

    utils.http.get('/api/plugins?query=' + this.state.plugin.name)
      .then(function(result) {
        this.setState({ similarPlugins: result });
      }.bind(this))
      .catch(function(err) {
        console.log('Error fetching similar plugins', err);
      }.bind(this));
  },

  link: function (prop) {
    if (!prop) {
      return 'Not provided';
    }

    return <a href={prop} target="_blank">{prop}</a>;
  },

  approve: function (e) {
    e.preventDefault();
    this.setState({ error: '' });
    if (!confirm('Are you sure you want to approve this plugin?')) {
      return;
    }

    return utils.http.post('/api/submitted-plugins/' + this.props.params.id + '/approve')
      .then(function (res) {
        browserHistory.push('/?q=' + res.name)
      }.bind(this))
      .catch(function (err) {
        this.setState({ error: err.msg || 'Uknown error, check console' });
        console.log('Error approving', err);
      }.bind(this));
  },

  remove: function (e) {
    e.preventDefault();
    if (!confirm('Are you sure you want to remove this plugin?')) {
      return;
    }

    return utils.http.delete('/api/submitted-plugins/' + this.props.params.id)
      .then(function () {
        return browserHistory.push('/submitted-plugins');
      }.bind(this))
      .catch(function (err) {
        this.setState({ error: err.msg || 'Uknown error, check console' });
        console.log('ERROR DISCARDING PLUGIN', err);
      }.bind(this));
  },

  render: function() {
    var plugin = this.state.plugin;
    var err = this.state.error;
    if (!plugin) {
      return null;
    }
    return (
      <div className="submitted-plugin-info">
        {err && <div className="error-msg tac">{err}</div>}
        <p>Name: {plugin.name}</p>
        <p>Author: {plugin.author}</p>
        <p>Github link: {this.link(plugin['github-link'])}</p>
        <p>Vimorg link: {this.link(plugin['vimorg-link'])}</p>
        <p>Category: {plugin.category}</p>
        <p>Tags: {plugin.tags.join(', ') || 'No tags provided'}</p>
        <p>Submitted at: {(new Date(plugin.submitted_at * 1000)).toDateString()}</p>

        <div>
          <button onClick={this.approve}>Approve</button>{' '}
          <button onClick={this.remove}>Remove</button>
        </div>

        {this.state.similarPlugins.plugins.length &&
        <div className="similar-plugins-list">
          <p><strong>Existing plugins with similar name:</strong></p>
          {this.state.similarPlugins.plugins.map(function(plugin) {
            return (
              <p>
                <a href={'/plugin/' + plugin.slug} target="_blank">{plugin.author} - {plugin.name}</a>
              </p>
            )
          })}
        </div>
        }
      </div>
    );
  }
});

module.exports = SubmittedPluginPage;
