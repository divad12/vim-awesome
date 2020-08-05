"use strict";

var _ = require("lodash");
var React = require("react");

var LoginPage = React.createClass({
  getInitialState: function() {
    return {
      username: '',
      password: '',
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
    this.setState({submitting: true});

    if (!this.formIsValid()) {
        e.preventDefault();
    }
  },

  render: function() {
    var submitting = this.state.submitting;
    return (
      <div className="login-page">
        <h1>Login</h1>
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
