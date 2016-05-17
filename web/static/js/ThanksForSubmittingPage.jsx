"use strict";

var React = require("react");

var ThanksForSubmittingPage = React.createClass({
  render: function() {
    return <div className="thanks-for-submitting-page">
      <div className="thanks-box">
        <h1>Thanks!</h1>
        <p className="message">
          Thank you for submitting a plugin! It will be reviewed shortly.
        </p>
      </div>
    </div>;
  }
});

module.exports = ThanksForSubmittingPage;
