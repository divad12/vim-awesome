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
  return new Promise(function (resolve, reject) { // eslint-disable-line no-undef
    var additionalData = {};
    var token = localStorage.getItem('token');
    if (token) {
      additionalData.headers = {
        'Authorization': 'Bearer ' + token
      };
    }
    $.ajax($.extend({
      dataType: "json",
      method: method,
      url: url,
      data: data || {},
      success: resolve,
      error: function(data) {
        return reject(data.responseJSON);
      }
    }, additionalData));
  });
};

var get = function (url, data) {
  return httpCall(url, 'GET', data);
};

var post = function (url, data) {
  return httpCall(url, 'POST', data);
};

var del = function (url, data) {
  return httpCall(url, 'DELETE', data);
};

var getUser = function() {
  var token = localStorage.getItem('token');

  if (!token) {
    return null;
  }

  var username = localStorage.getItem('username');
  var role = localStorage.getItem('role');
  return {
    token: token,
    username: username,
    role: role
  };
}

var setUser = function(user, token) {
  if (token) {
    localStorage.setItem('token', token);
  }
  localStorage.setItem('username', user.username);
  localStorage.setItem('role', user.role);
}

var unsetUser = function() {
  localStorage.removeItem('token');
  localStorage.removeItem('username');
  localStorage.removeItem('role');
};

module.exports = {
  getQueriesWithPrefix: getQueriesWithPrefix,
  http: {
    get: get,
    post: post,
    delete: del
  },
  setUser: setUser,
  getUser: getUser,
  unsetUser: unsetUser
}
