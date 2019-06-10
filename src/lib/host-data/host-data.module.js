'use strict';

// Define the `hostData` module
angular
  .module('hostData', [])
  .component('hostData', {
    templateUrl: 'lib/host-data/host-data.template.html',
    controller: ['storage', '$scope', function HostDataController(storage, $scope) {
      var self = this;
      self.data = [];
      self.options = {};
      self.incognito = chrome.extension.inIncognitoContext;

      chrome.tabs.query({currentWindow: true, active : true}, function(tabArray) {
        self.currentTab = tabArray[0].id;
      });

      $scope.incognitoFilter = function (rule) {
        return self.options.incognito == "share" || rule.incognito == self.incognito;
      };

      self.getRules = function() {
        storage.then(function(storage) {
          storage.retrieveHosts(function(storageData) {
            $scope.$apply(function() {
              self.data = storageData;
              //console.log(self.data);
              $scope.hostForm.$setPristine();
            });
          });
        });
      };

      self.getOptions = function() {
        storage.then(function(storage) {
          storage.retrieveOptions(function(optionsData) {
            $scope.$apply(function() {
              if (optionsData)
                self.options = optionsData;
              $scope.hostForm.$setPristine();
            });
          });
        });
      }

      self.getRules();
      self.getOptions();

      self.newRule = {hostName: "", ip: ""};

      self.changeLocalRule = function($event, $scope) {
        if (!$scope.rule.exceptions)
          $scope.rule.exceptions = [];
        if ($scope.rule.exceptions.includes(self.currentTab))
          $scope.rule.exceptions = $scope.rule.exceptions.filter(el => el !== self.currentTab)
        else
          $scope.rule.exceptions.push(self.currentTab);
        if ($scope.rule.exceptions.length === 0)
          delete $scope.rule.exceptions;
        $scope.hostForm.$setDirty();
      };

      self.changeGlobalRule = function($scope) {
        delete $scope.rule.exceptions;
        if ($scope.rule.active)
          $scope.$parent.host.ips.forEach(function(rule) {
            if (rule.ip !== $scope.rule.ip)
              rule.active = false;
          });
        $scope.hostForm.$setDirty();
      };

      self.addRule = function($event) {
        if (self.newRule.hostName.length > 0 && self.newRule.ip.length > 0) {
          //console.log(self.options);
          var ipRule = {
            ip: self.newRule.ip
          }
          if (self.options.newRuleBehaviour == "this") { // active in this tab only
            ipRule.active = false;
            ipRule.exceptions = [self.currentTab];
          } else { // active in all tabs
            ipRule.active = true;
          }
          var existingHost = self.data.find(host => 
            host.hostName === self.newRule.hostName 
              &&
            (self.options.incognito == "share" || !!host.incognito == chrome.extension.inIncognitoContext)
          );
          if (!existingHost) {
            self.data.push({
              hostName: self.newRule.hostName,
              ips: [ipRule],
              incognito: chrome.extension.inIncognitoContext
            });
            $scope.hostForm.$setDirty();
          } else {
            let existingIp = existingHost.ips.find(rule => rule.ip === self.newRule.ip);
            if (!existingIp) {
              existingHost.ips.push(ipRule);
              $scope.hostForm.$setDirty();
            } else {
              // do nothing
            }
          }
          self.newRule.hostName = "";
          self.newRule.ip = "";
        }
      };

      self.deleteRule = function($scope) {
        $scope.$parent.host.ips = $scope.$parent.host.ips.filter(rule => rule.ip !== $scope.rule.ip);
        if ($scope.$parent.host.ips.length === 0)
          self.data = self.data.filter(host => host.hostName !== $scope.$parent.host.hostName);
        $scope.hostForm.$setDirty();
      };

      self.saveRules = function() {
        storage.then(function(storage) {
          storage.saveHosts(self.data.map(rule => {
            let {$$hashKey, ...cleanRule} = rule;
            cleanRule.ips = cleanRule.ips.map(ipRule => {
              let {$$hashKey, ...cleanIp} = ipRule;
              return cleanIp;
            });
            return cleanRule;
          }), function() {
            $scope.$apply(function() {
              $scope.hostForm.$setPristine();
            });
          });
        });
      };

    }]

  });
