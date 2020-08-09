"use strict";

var _ = require("lodash");
var React = require("react");
var utils = require('./utils');
var browserHistory = require("react-router").browserHistory;

var LoginPage = React.createClass({
  getInitialState: function() {
    return {
      username: '',
      password: '',
      error: '',
      submitting: false
    };
  },

  onUsernameChange: function(e) {
    this.setState({ username: e.target.value });
  },

  onPasswordChange: function(e) {
    this.setState({ password: e.target.value });
  },

  usernameIsValid: function() {
    return this.state.username !== '';
  },

  passwordIsValid: function() {
    return this.state.password !== '';
  },

  formIsValid: function() {
    return _.every([
        this.usernameIsValid(),
        this.passwordIsValid()
    ]);
  },

  onSubmit: function(e) {
    e.preventDefault();
    this.setState({submitting: true, error: '' });

    if (!this.formIsValid()) {
      return this.setState({ submitting: false, error: 'Form is not valid' });
    }

    return utils.http.post('/api/login', {
      username: this.state.username,
      password: this.state.password
    }).then(function (response) {
      if (response.token) {
        utils.setUser(response, response.token);
      }
      // Use location.href to trigger refresh of whole app (Mostly sidebar)
      window.location.href = '/';
    }).catch(function(err) {
      return this.setState({ error: err.msg });
    }.bind(this));
  },

  render: function() {
    var submitting = this.state.submitting;
    var err = this.state.error;
    return (
      <div className="login-page">
        <h1>Login</h1>
        {err && <div className="error-msg tac">{err}</div>}
        <form className="form-horizontal" action="/api/login" method="POST" onSubmit={this.onSubmit} >
          <div className="control-group">
            <label className="control-label" htmlFor="name-input">Username</label>
            <div className="controls">
              <input type="text" name="username" id="username-input"
                className={submitting && !this.usernameIsValid() ? 'error' : ''}
                value={this.state.username}
                onChange={this.onUsernameChange} />
            </div>
          </div>
          <div className="control-group">
            <label className="control-label" htmlFor="author-input">Password </label>
            <div className="controls">
              <input type="password" name="password" id="password-input"
                className={submitting && !this.passwordIsValid() ? 'error' : ''}
                value={this.state.password}
                onChange={this.onPasswordChange} />
            </div>
          </div>
          <div className="control-group">
            <div className="controls">
              <button type="submit">
                Submit
                <span className="right-arrow">{"\u2192"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
);
  }
});

module.exports = LoginPage;
