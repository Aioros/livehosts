'use strict';

// Define the `storage` service
angular
  .module('liveHosts')
  .service('storage', function($http) {
    var self = this;

    //this.hostsKey = chrome.extension.getBackgroundPage().hostsKey;
    //this.optionsKey = chrome.extension.getBackgroundPage().optionsKey;

    return $http.get(chrome.runtime.getURL('config.json'))
      .then(function(config) {
        self.hostsKey = config.data.hostsKey;
        self.optionsKey = config.data.optionsKey;
        self.defaultOptions = config.data.defaultOptions;

        self.retrieveHosts = function(callback) {
          chrome.storage.sync.get(self.hostsKey, function(data) {
            if (data[self.hostsKey]) {
              if (callback)
                callback(data[self.hostsKey]);
            }
          });
        };

        self.saveHosts = function(data, callback) {
          var saveData = {};
          saveData[self.hostsKey] = data;
          chrome.storage.sync.set(saveData, callback);
        };

        self.retrieveOptions = function(callback) {
          chrome.storage.sync.get(self.optionsKey, function(data) {
            if (callback)
              callback(Object.assign(
                {},
                self.defaultOptions,
                data[self.optionsKey]
              ));
          });
        };

        return self;

      },
      function(config) {
        console.log("Error loading config");
      });

});
