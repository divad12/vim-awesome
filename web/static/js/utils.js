"use strict";

var _ = require("lodash");
var $ = require("jquery");

// Given a search string, find the values that have a given prefix.
function getQueriesWithPrefix(queryString, prefix) {
  function hasPrefix(query) {
    var parts = query.split(":");
    return parts[0] === prefix && parts[1];
  }

  function getValue(query) {
    return query.split(":")[1];
  }

  var queries = queryString.split(" ");
  var queriesWithPrefix = _.filter(queries, hasPrefix);
  return _.map(queriesWithPrefix, getValue);
}

var httpCall = function(url, method, data) {
  return new Promise(function (resolve, reject) {
    $.ajax({
      dataType: "json",
      method: method,
      url: url,
      data: data || {},
      success: resolve,
      error: function(data) {
        return reject(data.responseJSON);
      }
    });
  });
};

var get = function (url, data) {
  return httpCall(url, 'GET', data);
}

var post = function (url, data) {
  return httpCall(url, 'POST', data);
}

module.exports = {
  getQueriesWithPrefix: getQueriesWithPrefix,
  http: {
    get: get,
    post: post
  }
}
