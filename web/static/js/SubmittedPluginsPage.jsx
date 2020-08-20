/* eslint-disable no-console */
"use strict";

var React = require("react");
var utils = require('./utils');
var Pager = require('./Pager.jsx');

var SubmittedPluginsPage = React.createClass({
  getInitialState: function() {
    return {
      plugins: [],
      currentPage: 1,
      resultsPerPage: 50,
      totalResults: 0,
      totalPages: 1
    }
  },

  componentDidMount: function() {
    var query = this.props.location.query || 1;
    return this.getResults(query.page);
  },

  getResults: function(page) {
    page = page || 1;
    utils.http.get('/api/submitted-plugins?page=' + page)
      .then(function (result) {
        this.setState({
          plugins: result.plugins,
          currentPage: result.current_page,
          totalPages: result.total_pages,
          totalResults: result.total_results,
          resultsPerPage: result.results_per_page
        });
      }.bind(this))
      .catch(function (err) {
        console.log('ERROR', err);
      });
  },
  onPageChange: function (page) {
    this.setState({ currentPage: page });
    return this.getResults(page);
  },

  rejectPlugin: function (plugin) {
    return function (e) {
      e.preventDefault();
      if (!confirm('Are you sure you want to reject this plugin?')) {
        return;
      }

      return utils.http.delete('/api/submitted-plugins/' + plugin.id)
        .then(function () {
          return this.getResults(this.state.currentPage);
        }.bind(this))
        .catch(function (err) {
          console.log('ERROR REJECTING PLUGIN', err);
        });
    }.bind(this);
  },
  render: function() {
    return (
      <div>
        <table className="submitted-plugins-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Author</th>
              <th>Vimorg</th>
              <th>Github</th>
              <th>Submitted at</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
          {this.state.plugins.map(function(item) {
            return (
              <tr key={item.id}>
                <td><a href={'/submitted-plugins/' + item.id}>{item.name}</a></td>
                <td>{item.author}</td>
                <td>{item['vimorg-link'] && <a href={item['vimorg-link']} target="_blank">Vim.org</a> || '-'}</td>
                <td>{item['github-link'] && <a href={item['github-link']} target="_blank">Github</a> || '-'}</td>
                <td>{(new Date(item.submitted_at * 1000)).toLocaleDateString()}</td>
                <td>
                  <a href={'/submitted-plugins/' + item.id}>Details</a>
                  {' '}<button onClick={this.rejectPlugin(item)}><i className="icon-trash"></i></button>
                </td>
              </tr>
            )
          }.bind(this))}
          </tbody>
        </table>
        <Pager
          currentPage={this.state.currentPage}
          totalPages={this.state.totalPages}
          onPageChange={this.onPageChange}
        />
      </div>
    );
  }
});

module.exports = SubmittedPluginsPage;
