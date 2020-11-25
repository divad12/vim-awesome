"use strict"

var React = require("react");
var store = require("store");

var Popover = require("react-bootstrap/lib/Popover");
var OverlayTrigger = require("react-bootstrap/lib/OverlayTrigger");

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
    var bundleUri = (this.props.github_url || "").replace(
        /^https?:\/\/github.com\//, "");

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

// Instructions for installing a plugin with Dein.
var DeinInstructions = React.createClass({
  render: function() {
    var urlPath = (this.props.github_url || "").replace(
        /^https?:\/\/github.com\//, "");
    var bundleUri = urlPath.replace(/^vim-scripts\//, "");

    return <div>
      <p>Place this in your <code>.vimrc:</code></p>
      <pre>call dein#add('{bundleUri}')</pre>
      <p>&hellip; then run the following in Vim:</p>
      <pre>:source %<br/>:call dein#install()</pre>
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

// Help text explaining what Dein is and linking to more details.
var DeinTabPopover = React.createClass({
  render: function() {
    return <div>
      New fast, asynchronous and simple Vim/Neovim plugin manager written by
      NeoBundle's author.
      <br/><br/>See{' '}
      <a href="https://github.com/Shougo/dein.vim" target="_blank">
        <i className="icon-github" /> Shougo/dein.vim
      </a>
    </div>;
  }
});

var InstallTab = React.createClass({
  // TODO(captbaritone): Keep popover visible when moving mouse into the
  // popover: https://github.com/react-bootstrap/react-bootstrap/issues/1622
  // https://github.com/react-bootstrap/react-bootstrap/issues/850
  render: function() {
    return <OverlayTrigger trigger={["focus", "hover"]} placement="left"
      overlay={<Popover id={this.props.popoverId}>{this.props.popover}</Popover>}
      animation={false}>
      <li onClick={this.props.onTabClick}
        className={this.props.active ? "active" : ""}>
        {this.props.dispalyName}
      </li>
    </OverlayTrigger>
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

  onTabClick: function(installMethod) {
    this.setState({tabActive: installMethod});
    if (store.enabled) {
      store.set("installTab", installMethod);
    }
  },

  getTab: function(key, label, popover) {
    return <InstallTab onTabClick={this.onTabClick.bind(this, key)}
      active={this.state.tabActive === key}
      popover={popover}
      popoverId={key + "Pop"}
      dispalyName={label}
    />;
  },

  getInstructions: function() {
    switch (this.state.tabActive) {
      case "vundle":
        return <VundleInstructions github_url={this.props.github_url} />;
      case "neoBundle":
        return <NeoBundleInstructions github_url={this.props.github_url} />;
      case "vimPlug":
        return <VimPlugInstructions github_url={this.props.github_url} />;
      case "pathogen":
        return <PathogenInstructions github_url={this.props.github_url} />;
      case "dein":
        return <DeinInstructions github_url={this.props.github_url} />;
    }
  },

  render: function() {
    return <div className="install row-fluid">
      <div className="tabs-column">
        <h3 className="install-label">Install from</h3>
        <ul className="install-tabs">
          {this.getTab("vundle", "Vundle", <VundleTabPopover />)}
          {this.getTab("neoBundle", "NeoBundle", <NeoBundleTabPopover />)}
          {this.getTab("vimPlug", "VimPlug", <VimPlugTabPopover />)}
          {this.getTab("pathogen", "Pathogen", <PathogenTabPopover />)}
          {this.getTab("dein", "Dein", <DeinTabPopover />)}
        </ul>
      </div>
      <div className="content-column">
        {this.getInstructions()}
      </div>
    </div>;
  }
});

module.exports = Install;
