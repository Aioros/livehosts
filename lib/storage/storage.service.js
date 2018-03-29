'use strict';

// Define the `storage` service
angular
  .module('liveHosts')
  .service('storage', function() {
    var self = this;

    this.storageKey = chrome.extension.getBackgroundPage().storageKey;

    this.retrieve = function(callback) {
      chrome.storage.sync.get(this.storageKey, function(data) {
    	if (data[self.storageKey]) {
    	  if (callback)
    	  	callback(data[self.storageKey]);
    	}
      });
    };

    this.save = function(data, callback) {
      var saveData = {};
      saveData[this.storageKey] = data;
      chrome.storage.sync.set(saveData, callback);
    };

});
