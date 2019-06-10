'use strict';

// Define the `storage` service
angular
  .module('liveHosts')
  .service('storage', function() {
    var self = this;

    this.hostsKey = chrome.extension.getBackgroundPage().hostsKey;
    this.optionsKey = chrome.extension.getBackgroundPage().optionsKey;

    this.retrieveHosts = function(callback) {
      chrome.storage.sync.get(this.hostsKey, function(data) {
      	if (data[self.hostsKey]) {
      	  if (callback)
      	  	callback(data[self.hostsKey]);
      	}
      });
    };

    this.saveHosts = function(data, callback) {
      var saveData = {};
      saveData[this.hostsKey] = data;
      chrome.storage.sync.set(saveData, callback);
    };

    this.retrieveOptions = function(callback) {
      chrome.storage.sync.get(this.optionsKey, function(data) {
        if (callback)
          callback(Object.assign(
            {},
            chrome.extension.getBackgroundPage().defaultOptions,
            data[self.optionsKey]
          ));
      });
    };

});
