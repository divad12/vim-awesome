'use strict';
var React = require("react");
var utils = require('./utils');

var UserSidebar = React.createClass({
  getInitialState: function() {
    return {
      user: null
    };
  },

  componentDidMount: function() {
    this.fetchUserSession();
  },

  fetchUserSession: function() {
    var user = utils.getUser();
    if (user) {
      utils.http.get('/api/session')
        .then(function (user) {
          utils.setUser(user);
          this.setState({ user: utils.getUser() });
        }.bind(this))
        .catch(function (err) {
          utils.unsetUser();
          this.setState({ user: null });
          alert('Error fetching user session ' + err.msg);
        }.bind(this));
    }
  },

  logout: function(e) {
    e.preventDefault();
    utils.unsetUser();
    window.location.href = window.location.href;
  },

  render: function() {
    if (!this.state.user) {
      return null;
    }

    return (
      <div className="user-sidebar">
        <p><strong>Hi, {this.state.user.username}</strong></p>
        <a href="/submitted-plugins" className="user-sidebar-link">
          Review plugins
        </a>
        <a href="#" onClick={this.logout} className="user-sidebar-link">
          Logout
        </a>
      </div>
    )
  }
});

module.exports = UserSidebar;
