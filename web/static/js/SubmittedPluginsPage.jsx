"use strict";

var React = require("react");
var utils = require('./utils');

var SubmittedPluginsPage = React.createClass({
  getInitialState: function() {
    return {
      list: []
    }
  },

  componentDidMount: function() {
    utils.http.get('/api/submitted-plugins')
      .then(function (result) {
        console.log(result);
        this.setState({ list: result.list });
      }.bind(this))
      .catch(function (err) {
        console.log('ERROR', err);
      })
  },
  render: function() {
    return (
      <table className="submitted-plugins-table">
        <tr>
          <th>name</th>
          <th>author</th>
          <th>Actions</th>
        </tr>
        {this.state.list.map(function(item) {
        return (
          <tr>
            <td>{item.name}</td>
            <td>{item.author}</td>
            <td>
              <a href={'/submitted-plugins/' + item.id}>Details</a>
            </td>
          </tr>
        )
        })}
      </table>
    );
  }
});

module.exports = SubmittedPluginsPage;
