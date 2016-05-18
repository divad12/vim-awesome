"use strict";

var _ = require("underscore");
var React = require("react");

var Category = require("./Category.jsx");
var Tags = require("./Tags.jsx");

var GITHUB_REGEX = new RegExp('github.com/(.*?)/([^/?#]+)');

// TODO(david): Form validation on submit! Not done right now because we
//     currently just save this raw data to be manually reviewed.
var SubmitPage = React.createClass({
  getInitialState: function() {
    return {
      name: '',
      author: '',
      github: '',
      tags: [],
      category: "uncategorized",
      submitting: false
    };
  },

  onTagsChange: function(tags) {
    this.setState({tags: _.uniq(tags)});
  },

  onCategoryChange: function(category) {
    this.setState({category: category});
  },

  nameIsValid: function() {
    return this.state.name !== '';
  },

  authorIsValid: function() {
    return this.state.author !== '';
  },

  githubIsValid: function() {
    return this.state.github === '' || GITHUB_REGEX.test(this.state.github);
  },

  onNameChange: function(e) {
    return this.setState({name: e.target.value});
  },

  onAuthorChange: function(e) {
    return this.setState({author: e.target.value});
  },

  onGithubChange: function(e) {
    return this.setState({github: e.target.value});
  },

  formIsValid: function() {
    return _.every([
        this.nameIsValid(),
        this.authorIsValid(),
        this.githubIsValid()
    ]);
  },

  // TODO(captbaritone): Submit the form via API
  onSubmit: function(e) {
    // Enable validation errors
    this.setState({submitting: true});

    // Should the for actually submit?
    if (!this.formIsValid()) {
        e.preventDefault();
    }
  },

  render: function() {
    var submitting = this.state.submitting;
    return <div className="submit-page">
      <h1>Submit plugin</h1>
      <form className="form-horizontal" action="/api/submit"
          method="POST" onSubmit={this.onSubmit} >
        <div className="control-group">
          <label className="control-label" htmlFor="name-input">Name</label>
          <div className="controls">
            <input type="text" name="name" id="name-input"
                className={submitting && !this.nameIsValid() ? 'error' : ''}
                placeholder="e.g. Fugitive" value={this.state.name}
                onChange={this.onNameChange} />
          </div>
        </div>
        <div className="control-group">
          <label className="control-label" htmlFor="author-input">
            Author
          </label>
          <div className="controls">
            <input type="text" name="author" id="author-input"
                className={submitting && !this.authorIsValid() ? 'error' : ''}
                placeholder="e.g. Tim Pope" value={this.state.author}
                onChange={this.onAuthorChange} />
          </div>
        </div>
        <div className="control-group">
          <label className="control-label" htmlFor="github-input">
            GitHub link (optional)
          </label>
          <div className="controls">
            <input type="text" name="github-link" id="github-input"
                className={submitting && !this.githubIsValid() ? 'error' : ''}
                placeholder="e.g. https://github.com/tpope/vim-fugitive"
                value={this.state.github} onChange={this.onGithubChange} />
          </div>
        </div>
        <div className="control-group">
          <label className="control-label" htmlFor="vimorg-input">
            Vim.org link (optional)
          </label>
          <div className="controls">
            <input type="text" name="vimorg-link" id="vimorg-input"
                placeholder={"e.g. " +
                    "http://www.vim.org/scripts/script.php?script_id=2975"} />
          </div>
        </div>
        <div className="control-group">
          <label className="control-label" htmlFor="category-input">
            Category
          </label>
          <div className="controls">
            <Category category={this.state.category} editOnly={true}
                onCategoryChange={this.onCategoryChange} />
          </div>
        </div>
        <div className="control-group">
          <label className="control-label" htmlFor="tags-input">
            Tags (up to four keywords for search)
          </label>
          <div className="controls">
            <Tags tags={this.state.tags} editOnly={true}
                onTagsChange={this.onTagsChange} />
          </div>
        </div>
        <div className="control-group">
          <div className="controls">
            <p className="other-info-blurb">
              All other information, including descriptions, will be
              automatically extracted from the GitHub or Vim.org link.
            </p>
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
        <input type="hidden" name="category"
            value={this.state.category} />
        <input type="hidden" name="tags"
            value={JSON.stringify(this.state.tags)} />
      </form>
    </div>;
  }
});

module.exports = SubmitPage;
