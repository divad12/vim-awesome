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
    //if the url has a trailing slash remove it
    var url = (this.props.github_url || "").replace(/\/$/, "");
    // now get the words after last / in url (the title)
    var pos = url.lastIndexOf("/") + 1;
    var bundleName = url.substr(pos);
    return <div>
      <p>Run the following in a terminal:</p>
      <pre>git clone {this.props.github_url} ~/.vim/bundle/'{bundleName}'
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

  render: function() {
    return <div className="install row-fluid">
      <div className="tabs-column">
        <h3 className="install-label">Install from</h3>
        <ul className="install-tabs">
          <InstallTab onTabClick={this.onTabClick.bind(this, "vundle")}
            active={this.state.tabActive === "vundle"}
            popover={<VundleTabPopover />}
            popoverId="vundlePop"
            dispalyName="Vundle"
          />
          <InstallTab onTabClick={this.onTabClick.bind(this, "neoBundle")}
            active={this.state.tabActive === "neoBundle"}
            popover={<NeoBundleTabPopover />}
            popoverId="neoBundlePop"
            dispalyName="NeoBundle"
          />
          <InstallTab onTabClick={this.onTabClick.bind(this, "vimPlug")}
            active={this.state.tabActive === "vimPlug"}
            popover={<VimPlugTabPopover />}
            popoverId="vimPlugPop"
            dispalyName="VimPlug"
          />
          <InstallTab onTabClick={this.onTabClick.bind(this, "pathogen")}
            active={this.state.tabActive === "pathogen"}
            popover={<PathogenTabPopover />}
            popoverId="pathogenPop"
            dispalyName="Pathogen"
          />
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

module.exports = Install;
