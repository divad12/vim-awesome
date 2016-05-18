"use strict";

var $ = require("jquery");
var _ = require("underscore");
var React = require("react");
var render = require("react-dom").render;
var Router = require("react-router").Router;
var browserHistory = require("react-router").browserHistory;
var Route = require("react-router").Route;
var IndexRoute = require("react-router").IndexRoute;
var marked = require("marked");
var moment = require("moment");
var store = require("store");
var transitionTo = require("react-router").transitionTo;

// For React devtools
window.React = React;
// Bootstrap JS depends on jQuery being set globally
// TODO(alpert): Figure out how to load these from npm more smartly
window.jQuery = $;
require("../lib/js/bootstrap-typeahead.js");
require("../lib/js/bootstrap-tooltip.js");
require("../lib/js/bootstrap-popover.js");
require("../lib/js/bootstrap-transition.js");
require("../lib/js/bootstrap-collapse.js");
require("../lib/js/bootstrap-dropdown.js");

var AboutPage = require("./AboutPage.jsx");
var Category = require("./Category.jsx");
var NotFound = require("./NotFound.jsx");
var Page = require("./Page.jsx");
var Plugin = require("./Plugin.jsx");
var SearchBox = require("./SearchBox.jsx");
var Spinner = require("./Spinner.jsx");
var SubmitPage = require("./SubmitPage.jsx");
var Tags = require("./Tags.jsx");
var ThanksForSubmittingPage = require("./ThanksForSubmittingPage.jsx");

var KEYCODES = require("./constants/keycodes.js");

// TODO(david): We might want to split up this file more.

// Renderer used to change relative image URL to absolute in Markdown
var markedRenderer = new marked.Renderer();

var clamp = function(num, min, max) {
  return Math.min(Math.max(num, min), max);
};

/**
 * Scrolls the window so that the entirety of `domNode` is visible.
 * @param {Element} domNode The DOM node to scroll into view.
 * @param {number=} context An optional amount of context (minimum distance
 * from top or bottom of screen) to keep in pixels. Defaults to 0.
 */
var scrollToNode = function(domNode, context) {
  context = context || 0;
  var windowTop = $(window).scrollTop();
  var windowHeight = $(window).height();
  var windowBottom = windowHeight + windowTop;
  var elementTop = $(domNode).offset().top;
  var elementBottom = elementTop + $(domNode).height();

  if (elementBottom + context > windowBottom) {
    window.scrollTo(0, elementBottom + 100 - windowHeight);
  } else if (elementTop - context < windowTop) {
    window.scrollTo(0, Math.max(0, elementTop - context));
  }
};

var Pager = React.createClass({
  propTypes: {
    currentPage: React.PropTypes.number.isRequired,
    totalPages: React.PropTypes.number.isRequired
  },

  componentDidMount: function() {
    window.addEventListener("keyup", this.onWindowKeyDown, false);
  },

  componentWillUnmount: function() {
    window.removeEventListener("keyup", this.onWindowKeyDown, false);
  },

  onWindowKeyDown: function(e) {
    var tag = e.target.tagName;
    var key = e.keyCode;

    if (tag !== "INPUT" && tag !== "TEXTAREA") {
      if (key === KEYCODES.P) {
        this.goToPrevPage();
      } else if (key === KEYCODES.N) {
        this.goToNextPage();
      }
    }
  },

  goToPage: function(page) {
    var newPage = clamp(page, 1, this.props.totalPages);
    this.props.onPageChange(newPage);
  },

  goToPrevPage: function() {
    this.goToPage(this.props.currentPage - 1);
  },

  goToNextPage: function() {
    this.goToPage(this.props.currentPage + 1);
  },

  onPrevClick: function(e) {
    e.preventDefault();
    this.goToPrevPage();
  },

  onNextClick: function(e) {
    e.preventDefault();
    this.goToNextPage();
  },

  render: function() {
    var currentPage = this.props.currentPage;
    var totalPages = this.props.totalPages;

    if (totalPages <= 1) {
      return <div />;
    }

    // TODO(david): Have buttons for page numbers, including first page, last
    //     page, and current page.
    return <div className="pagination">
      <ul>
        {currentPage > 1 &&
          <li>
            <a className="pager-button prev-page-button" href="#"
                onClick={this.onPrevClick}>
              {"\u2190"}<code>P</code>
            </a>
          </li>
        }
        <li>
          <a className="page-number">Page {currentPage} of {totalPages}</a>
        </li>
        {currentPage < totalPages &&
          <li>
            <a className="pager-button next-page-button" href="#"
                onClick={this.onNextClick}>
              <code>N</code> Next page
              <span className="right-arrow">{"\u2192"}</span>
            </a>
          </li>
        }
      </ul>
    </div>;
  }
});


var PluginList = React.createClass({
  getInitialState: function() {
    return {
      plugins: [],
      selectedIndex: -1,
      hoverDisabled: false,
      isLoading: false
    };
  },

  componentDidMount: function() {
    this.fetchPlugins(this.props);
    window.addEventListener("keydown", this.onWindowKeyDown, false);
  },

  componentWillReceiveProps: function(nextProps) {
    if (nextProps.searchQuery !== this.props.searchQuery) {
      this.setState({isLoading: true});
      this.fetchPluginsDebounced(nextProps);
    } else if (nextProps.currentPage !== this.props.currentPage) {
      this.setState({isLoading: true});
      this.fetchPluginsThrottled(nextProps);
    }
  },

  shouldComponentUpdate: function(nextProps, nextState) {
    // Only re-render when new plugins have been fetched.
    return !_.isEqual(nextState, this.state);
  },

  componentWillUnmount: function() {
    clearTimeout(this.reenableHoverTimeout);
    window.removeEventListener("keydown", this.onWindowKeyDown, false);
  },

  select: function() {
    if (this.state.selectedIndex === -1) {
      this.setState({selectedIndex: 0});
    }
  },

  unselect: function() {
    if (this.state.selectedIndex !== -1) {
      this.setState({selectedIndex: -1});
    }
  },

  onWindowKeyDown: function(e) {
    // TODO(david): Duplicated code from SearchBox
    var tag = e.target.tagName;
    var key = e.keyCode;

    if (tag !== "INPUT" && tag !== "TEXTAREA") {
      if (key === KEYCODES.J || key === KEYCODES.K) {
        // Go to next or previous plugin
        var direction = (key === KEYCODES.J ? 1 : -1);
        var maxIndex = this.state.plugins.length - 1;
        var newIndex = clamp(
          this.state.selectedIndex + direction,
          0, maxIndex);

        // Disable hover when navigating plugins, because when the screen
        // scrolls, a MouseEnter event will be fired if the mouse is over a
        // plugin, causing the selection to jump back.
        this.setState({selectedIndex: newIndex, hoverDisabled: true});

        // Re-enable hover after a delay
        clearTimeout(this.reenableHoverTimeout);
        this.reenableHoverTimeout = setTimeout(function() {
          this.setState({hoverDisabled: false});
        }.bind(this), 400);

        // Scroll to the navigated plugin if available.
        if (this.refs && this.refs.navFocus) {
          scrollToNode(this.refs.navFocus, 105 /* context */);
        }
      } else if ((key === KEYCODES.ENTER || key === KEYCODES.O) &&
          this.refs && this.refs.navFocus) {
        e.preventDefault();
        this.refs.navFocus.goToDetailsPage();
      }
    }
  },

  onPluginMouseEnter: function(index) {
    // TODO(david): This is not as quick/snappy as CSS :hover ...
    if (this.state.hoverDisabled) {
      return;
    }
    this.setState({selectedIndex: index});
  },

  fetchPlugins: function(params) {
    this.setState({isLoading: true});

    // Abort any pending XHRs so that we don't update from a stale query.
    if (this.fetchPluginsXhr) {
      this.fetchPluginsXhr.abort();
    }

    this.fetchPluginsXhr = $.ajax({
      url: "/api/plugins",
      dataType: "json",
      data: {
        query: params.searchQuery,
        page: params.currentPage
      },
      success: this.onPluginsFetched
    });
  },

  onPluginsFetched: function(data) {
    this.setState({
      plugins: data.plugins,
      totalPages: data.total_pages,
      totalResults: data.total_results,
      resultsPerPage: data.results_per_page,
      isLoading: false
    });

    // TODO(david): Give this prop a default value.
    this.props.onPluginsFetched();

    if (this.state.selectedIndex !== -1) {
      this.setState({selectedIndex: 0});
    }
  },

  fetchPluginsDebounced: _.debounce(function() {
    this.fetchPlugins.apply(this, arguments);
  }, 300),

  fetchPluginsThrottled: _.throttle(function() {
    this.fetchPlugins.apply(this, arguments);
  }, 500),

  render: function() {
    // TODO(david): We should not update the page number and other
    // search-params UI until new data has arrived to keep things consistent.

    var plugins = _.map(this.state.plugins, function(plugin, index) {
      var hasNavFocus = (index === this.state.selectedIndex);
      return <Plugin
        ref={hasNavFocus ? "navFocus" : ""}
        key={plugin.slug}
        hasNavFocus={hasNavFocus}
        plugin={plugin}
        onMouseEnter={this.onPluginMouseEnter.bind(this, index)} />;
    }, this);

    var totalPages = this.state.totalPages || 0;
    var totalResults = this.state.totalResults || 0;
    var currentPage = this.props.currentPage;
    var resultsPerPage = this.state.resultsPerPage;
    var firstPlugin = (currentPage - 1) * resultsPerPage + 1;
    var lastPlugin = firstPlugin + this.state.plugins.length - 1;

    return <div className={"plugins-container" + (
        this.state.isLoading ? " loading" : "")}>
      {this.state.isLoading && <Spinner />}
      <div className="browsing-plugins">
        {currentPage > 1 && resultsPerPage ?
            'Plugins ' + firstPlugin + '-' + lastPlugin + ' of ' + totalResults
            : totalResults + ' plugins'}
      </div>
      <ul className="plugins">{plugins}</ul>
      <Pager currentPage={currentPage}
          totalPages={totalPages} onPageChange={this.props.onPageChange} />
    </div>;
  }
});

// Instructions for installing a plugin with Vundle.
var VundleInstructions = React.createClass({
  render: function() {
    var urlPath = (this.props.github_url || "").replace(
        /^https?:\/\/github.com\//, "");
    var vundleUri = urlPath.replace(/^vim-scripts\//, "");

    return <div>
      <p>Place this in your <code>.vimrc:</code></p>
      <pre>Plugin '{vundleUri}'</pre>
      <p>&hellip; then run the following in Vim:</p>
      <pre>:source %<br/>:PluginInstall</pre>
      <p className="old-vundle-notice">
        For Vundle version &lt; 0.10.2, replace <code>Plugin</code> with
        {' '}<code>Bundle</code> above.
      </p>
      {/* Hack to get triple-click in Chrome to not over-select. */}
      <div>{'\u00a0' /* &nbsp; */}</div>
    </div>;
  }
});

// Instructions for installing a plugin with NeoBundle (a manager based on
// Vundle).
var NeoBundleInstructions = React.createClass({
  render: function() {
    var urlPath = (this.props.github_url || "").replace(
        /^https?:\/\/github.com\//, "");
    var bundleUri = urlPath.replace(/^vim-scripts\//, "");

    return <div>
      <p>Place this in your <code>.vimrc:</code></p>
      <pre>NeoBundle '{bundleUri}'</pre>
      <p>&hellip; then run the following in Vim:</p>
      <pre>:source %<br/>:NeoBundleInstall</pre>
      {/* Hack to get triple-click in Chrome to not over-select. */}
      <div>{'\u00a0' /* &nbsp; */}</div>
    </div>;
  }
});

// Instructions for installing a plugin with Vim-Plug.
var VimPlugInstructions = React.createClass({
  render: function() {
    var urlPath = (this.props.github_url || "").replace(
        /^https?:\/\/github.com\//, "");
    var bundleUri = urlPath.replace(/^vim-scripts\//, "");

    return <div>
      <p>Place this in your <code>.vimrc:</code></p>
      <pre>Plug '{bundleUri}'</pre>
      <p>&hellip; then run the following in Vim:</p>
      <pre>:source %<br/>:PlugInstall</pre>
      {/* Hack to get triple-click in Chrome to not over-select. */}
      <div>{'\u00a0' /* &nbsp; */}</div>
    </div>;
  }
});

// Instructions for installing a plugin with Pathogen.
var PathogenInstructions = React.createClass({
  render: function() {
    return <div>
      <p>Run the following in a terminal:</p>
      <pre>cd ~/.vim/bundle<br/>git clone {this.props.github_url}
      </pre>
      {/* Hack to get triple-click in Chrome to not over-select. */}
      <div>{'\u00a0' /* &nbsp; */}</div>
    </div>;
  }
});

// Help text explaining what Vundle is and linking to more details.
var VundleTabPopover = React.createClass({
  render: function() {
    return <div>
      Vundle is short for Vim Bundle and is a plugin manager for Vim.
      <br/><br/>See{' '}
      <a href="https://github.com/gmarik/vundle" target="_blank">
        <i className="icon-github" /> gmarik/vundle
      </a>
    </div>;
  }
});

// Help text explaining what NeoBundle is and linking to more details.
var NeoBundleTabPopover = React.createClass({
  render: function() {
    return <div>
      NeoBundle is a Vim plugin manager based on Vundle but extended with more
      features.
      <br/><br/>See{' '}
      <a href="https://github.com/Shougo/neobundle.vim" target="_blank">
        <i className="icon-github" /> Shougo/neobundle.vim
      </a>
    </div>;
  }
});

// Help text explaining what Vim-Plug is and linking to more details.
var VimPlugTabPopover = React.createClass({
  render: function() {
    return <div>
      Vim-Plug is a Vim plugin manager similar to NeoBundle.
      <br/><br/>See{' '}
      <a href="https://github.com/junegunn/vim-plug" target="_blank">
        <i className="icon-github" /> junegunn/vim-plug
      </a>
    </div>;
  }
});

// Help text explaining what Pathogen is and linking to more details.
var PathogenTabPopover = React.createClass({
  render: function() {
    return <div>
      Pathogen makes it super easy to install plugins and runtime files
      in their own private directories.
      <br/><br/>See{' '}
      <a href="https://github.com/tpope/vim-pathogen" target="_blank">
        <i className="icon-github" /> tpope/vim-pathogen
      </a>
    </div>;
  }
});

// The installation instructions (via Vundle, etc.) widget on the details page.
var Install = React.createClass({
  getInitialState: function() {
    var tabActive = (store.enabled && store.get("installTab")) || "vundle";
    return {
      tabActive: tabActive
    };
  },

  componentDidMount: function() {
    var popovers = {
      vundleTab: <VundleTabPopover />,
      neoBundleTab: <NeoBundleTabPopover />,
      vimPlugTab: <VimPlugTabPopover />,
      pathogenTab: <PathogenTabPopover />
    };

    var self = this;
    _.each(popovers, function(component, ref) {
      var markup = 'TEST'; //React.renderComponentToString(component);
      var $tabElem = $(self.refs[ref]);
      $tabElem.popover({
        html: true,
        content: markup,
        placement: "left",
        animation: false,
        trigger: "hover",
        container: $tabElem
      });
    });
  },

  onTabClick: function(installMethod) {
    this.setState({tabActive: installMethod});
    if (store.enabled) {
      store.set("installTab", installMethod);
    }
  },

  render: function() {
    return <div className="install row-fluid">
      <div className="tabs-column">
        <h3 className="install-label">Install from</h3>
        <ul className="install-tabs">
          <li onClick={this.onTabClick.bind(this, "vundle")} ref="vundleTab"
              className={this.state.tabActive === "vundle" ? "active" : ""}>
            Vundle
          </li>
          <li onClick={this.onTabClick.bind(this, "neoBundle")}
              ref="neoBundleTab"
              className={this.state.tabActive === "neoBundle" ? "active" : ""}>
            NeoBundle
          </li>
          <li onClick={this.onTabClick.bind(this, "vimPlug")}
              ref="vimPlugTab"
              className={this.state.tabActive === "vimPlug" ? "active" : ""}>
            VimPlug
          </li>
          <li onClick={this.onTabClick.bind(this, "pathogen")}
              ref="pathogenTab"
              className={this.state.tabActive === "pathogen" ? "active" : ""}>
            Pathogen
          </li>
        </ul>
      </div>
      <div className="content-column">
        {this.state.tabActive === "vundle" &&
            <VundleInstructions github_url={this.props.github_url} />}
        {this.state.tabActive === "neoBundle" &&
            <NeoBundleInstructions github_url={this.props.github_url} />}
        {this.state.tabActive === "vimPlug" &&
            <VimPlugInstructions github_url={this.props.github_url} />}
        {this.state.tabActive === "pathogen" &&
            <PathogenInstructions github_url={this.props.github_url} />}
      </div>
    </div>;
  }
});

var Markdown = React.createClass({
  render: function() {
    markedRenderer.image = this.replaceRelativeUrlWithGithubImgSrc;
    var markedHtml = marked(this.props.children || '',
      {renderer: markedRenderer});
    return <div
      dangerouslySetInnerHTML={{__html: markedHtml}}
    />;
  },

  /**
   * Replaces the relative img URL to the absolute img URL in a README.md file
   * See docs: https://www.npmjs.org/package/marked
   * @param {string} href The source of the image
   * @param {string} title The title of the image
   * @param {string} text The alt of the image
   */
  replaceRelativeUrlWithGithubImgSrc: function(href, title, text) {
    // Checks if the href is not an absolute URL
    // http://stackoverflow.com/questions/10687099/how-to-test-if-a-url-string-is-absolute-or-relative
    if (!href.match(/^(?:[a-z]+:)?\/\//i)) {
      return "<img src='" + this.props.githubRepoUrl + "/raw/master/" +
        href + "' alt='" + text + "' />";
    } else {
      return "<img src='" + href + "' alt='" + text + "' />";
    }
  }
});

var Plaintext = React.createClass({
  render: function() {
    // TODO(david): Linkify <a> tags
    // TODO(david): Linkify "vimscript #2136" references (e.g. surround-vim'
    //     vim.org long description)
    return <div className={"plain " + (this.props.className || '')}>
      {this.props.children}
    </div>;
  }
});

// Permalink page with more details about a plugin.
var PluginPage = React.createClass({
  getInitialState: function() {
    return {};
  },

  updateTitle: function() {
    if (!this._previousTitle) {
      this._previousTitle = document.title;
    }
    if (this.state.name) {
      document.title = this.state.name + " - Vim Awesome";
    }
  },

  resetTitle: function() {
    if (this._previousTitle) {
      document.title = this._previousTitle;
    }
  },

  componentDidMount: function() {
    this.fetchPlugin();
    this.updateTitle();
    window.addEventListener("keydown", this.onWindowKeyDown, false);

    this.tagXhrQueue = $.Deferred();
    this.tagXhrQueue.resolve();
  },

  componentWillUnmount: function() {
    this.resetTitle();
    window.removeEventListener("keydown", this.onWindowKeyDown, false);
  },

  componentDidUpdate: function() {
    this.updateTitle();
  },

  fetchPlugin: function() {
    $.getJSON("/api/plugins/" + this.props.params.slug, function(data) {
      this.setState(data);

      // Save in localStorage that this plugin has been visited.
      if (store.enabled) {
        var pluginStore = store.get("plugin-" + data.slug) || {};
        pluginStore.hasVisited = true;
        store.set("plugin-" + data.slug, pluginStore);
      }
    }.bind(this));
  },

  // TODO(david): Maybe use keypress?
  onWindowKeyDown: function(e) {
    var tag = e.target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") {
      return;
    }

    var key = e.keyCode;
    var direction;
    var gPressed = (key === KEYCODES.G && !e.altKey && !e.ctrlKey &&
        !e.shiftKey && !e.metaKey);

    if (key === KEYCODES.J || key === KEYCODES.K) {
      // Scroll page in small increments with j/k.
      direction = (key === KEYCODES.J ? 1 : -1);
      window.scrollBy(0, direction * 100);
    } else if (key === KEYCODES.U || key === KEYCODES.D) {
      // Scroll page in large increments with u/d.
      direction = (key === KEYCODES.D ? 1 : -1);
      window.scrollBy(0, direction * 400);
    } else if (key === KEYCODES.G && e.shiftKey) {
      // Scroll to bottom of page with shift+G.
      window.scrollTo(0, $(document).height());
    } else if (this.gLastPressed && gPressed) {
      // Scroll to top of page with gg (or by holding down g (yes this is what
      // Vim does as well -- TIL)).
      window.scrollTo(0, 0);
    }

    this.gLastPressed = gPressed;
  },

  onCategoryChange: function(categoryId) {
    this.setState({category: categoryId});

    $.ajax({
      url: "/api/plugins/" + this.props.params.slug + "/category/" +
        categoryId,
      type: "PUT"
    });
  },

  // TODO(david): Should we adopt the "handleTagsChange" naming convention?
  onTagsChange: function(tags) {
    var newTags = _.uniq(tags);
    this.setState({tags: newTags});

    // We queue up AJAX requests to avoid race conditions on the server.
    var self = this;
    this.tagXhrQueue.done(function() {
      $.ajax({
        url: "/api/plugins/" + self.props.params.slug + "/tags",
        type: "POST",
        contentType: "application/json",
        dataType: "json",
        data: JSON.stringify({tags: newTags}),
        success: function() {
          self.tagXhrQueue.resolve();
        }
      });
    });
  },

  render: function() {
    if (!this.state.slug) {
      return <div className="plugin-page">
        <Spinner />
      </div>;
    }

    // TODO(david): Need to also scrape the link to the archive download (for
    //     the manual install mode).
    var longDesc = this.state.github_readme || this.state.vimorg_long_desc;
    var installDetails = this.state.vimorg_install_details;

    // TODO(david): Handle rst filetype
    var readmeFilename = (
        this.state.github_readme_filename || '').toLowerCase();
    var longDescType = "plain";
    if (_.contains(["md", "markdown", "mkd", "mkdn"],
        readmeFilename.split(".").pop())) {
      longDescType = "markdown";
    } else if (readmeFilename === "readme") {
      longDescType = "mono";
    }

    var vimOrgUrl = this.state.vimorg_id &&
        ("http://www.vim.org/scripts/script.php?script_id=" +
        encodeURIComponent(this.state.vimorg_id));

    return <div className="plugin-page">
      <Plugin plugin={this.state} />

      <div className="row-fluid">
        <div className="span9 dates">
          <div className="row-fluid">
            <div className="span6">
              <h3 className="date-label">Created</h3>
              <div className="date-value">
                {moment.unix(this.state.created_at).fromNow()}
              </div>
            </div>
            <div className="span6">
              <h3 className="date-label">Updated</h3>
              <div className="date-value">
                {moment.unix(this.state.updated_at).fromNow()}
              </div>
            </div>
          </div>
        </div>
        <div className="span3 links">
          <a href={vimOrgUrl || "#"} target="_blank" className={"vim-link" +
              (vimOrgUrl ? "" : " disabled")}>
            <i className="vim-icon dark"></i>
            <i className="vim-icon light"></i>
            Vim.org
          </a>
          <a href={this.state.github_url || "#"} target="_blank" className={
              "github-link" + (this.state.github_url ? "" : " disabled")}>
            <i className="github-icon dark"></i>
            <i className="github-icon light"></i>
            GitHub
          </a>
        </div>
      </div>

      <div className="row-fluid">
        <div className="span9">
          <Install github_url={this.state.github_url} />
        </div>
        <div className="span3">
          <div className="row-fluid">
            <div className="span12">
              <Category category={this.state.category}
                  onCategoryChange={this.onCategoryChange} />
            </div>
          </div>
          <div className="row-fluid">
            <div className="span12">
              <Tags tags={this.state.tags} onTagsChange={this.onTagsChange} />
            </div>
          </div>
        </div>
      </div>

      {(longDesc || installDetails) &&
        <div className="row-fluid long-desc-container">
          <div className="long-desc">
            {longDescType === "markdown" &&
              <Markdown githubRepoUrl={this.state.github_url}>
                {longDesc}
              </Markdown>
            }
            {longDescType === "mono" &&
                <Plaintext className="mono">{longDesc}</Plaintext>}
            {longDescType === "plain" && <Plaintext>{longDesc}</Plaintext>}
            {!!installDetails &&
              <div>
                <h2>Installation</h2>
                <Plaintext>{installDetails}</Plaintext>
              </div>
            }
          </div>
        </div>
      }

    </div>;
  }
});

var PluginListPage = React.createClass({
  // TODO(david): What happens if user goes to non-existent page?
  // TODO(david): Update title so that user has meaningful history entries.

  getInitialState: function() {
    return this.getStateFromProps(this.props);
  },

  componentWillReceiveProps: function(nextProps) {
    // TODO(david): pushState previous results so we don't re-fetch. Or, set up
    //     a jQuery AJAX hook to cache all GET requests!!!! That will help with
    //     so many things!!! (But make sure not to exceed a memory threshold.)
    this.setState(this.getStateFromProps(nextProps));
  },

  onSearchFocus: function() {
    this.refs.pluginList.unselect();
  },

  onSearchBlur: function() {
    this.refs.pluginList.select();
  },

  onSearchChange: function(query) {
    this.setState({
      searchQuery: query,
      currentPage: 1
    });
    this.refs.pluginList.unselect();
  },

  getStateFromProps: function(props) {
    var queryParams = props.location.query;
    var currentPage = +(queryParams.p || 1);

    return {
      currentPage: currentPage,
      searchQuery: queryParams.q || ""
    };
  },

  updateUrlFromState: function() {
    var queryObject = {};

    if (this.state.currentPage !== 1) {
      queryObject.p = this.state.currentPage;
    }

    if (this.state.searchQuery) {
      queryObject.q = this.state.searchQuery;
    }

    // TODO(alpert): Probably don't want to make a new history entry for each
    // char when typing slowly into the search box
    transitionTo("plugin-list", null, queryObject);
  },

  onPluginsFetched: function() {
    // Update the URL when the page content has been updated if necessary.
    if (!_.isEqual(this.getStateFromProps(this.props), this.state)) {
      this.updateUrlFromState();
    }

    // Scroll to top
    window.scrollTo(0, 0);
  },

  onPageChange: function(page) {
    this.setState({currentPage: page});
  },

  render: function() {
    return <div>
      <SearchBox searchQuery={this.state.searchQuery}
          onChange={this.onSearchChange} onFocus={this.onSearchFocus}
          onBlur={this.onSearchBlur} />
      <div className="keyboard-tips">
        Tip: use <code>/</code> to search,{' '}
        <code>J</code>/<code>K</code> to navigate,{' '}
        <code>N</code>/<code>P</code> to flip pages
      </div>
      <PluginList ref="pluginList" searchQuery={this.state.searchQuery}
          currentPage={this.state.currentPage}
          onPluginsFetched={this.onPluginsFetched}
          onPageChange={this.onPageChange} />
    </div>;
  }
});

render((
  <Router history={browserHistory}>
    <Route path="/" component={Page}>
      <IndexRoute component={PluginListPage} />
      <Route path="plugin/:slug" component={PluginPage} />
      <Route path="submit" component={SubmitPage} />
      <Route path="thanks-for-submitting" component={ThanksForSubmittingPage} />
      <Route path="about" component={AboutPage} />
      <Route path="*" component={NotFound} />
    </Route>
  </Router>), document.getElementById('app'));

// Hijack internal nav links to use router to navigate between pages
// Adapted from https://gist.github.com/tbranyen/1142129
// TODO(captbaritone): It may be possible to remove this hack by moving to
// react-router Link
$(document).on("click", "a", function(evt) {
  if (evt.which === 2 ||  // middle click
      evt.altKey || evt.ctrlKey || evt.metaKey || evt.shiftKey) {
    return;
  }
  var href = $(this).attr("href");
  var protocol = this.protocol;

  // Only hijack URL to use router if it's relative (internal link) and not a
  // hash fragment.
  if (href && href.substr(0, protocol.length) !== protocol &&
      href[0] !== '#') {
    evt.preventDefault();
    browserHistory.push(this.pathname + this.search);

    // Scroll to top. Chrome has this weird issue where it will retain the
    // current scroll position, even if it's beyond the document's height.
    window.scrollTo(0, 0);
  }
});
