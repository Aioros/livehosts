'use strict';

// Define the `hostData` module
angular
  .module('hostData', [])
  .component('hostData', {
    templateUrl: 'lib/host-data/host-data.template.html',
    controller: ['storage', '$scope', function HostDataController(storage, $scope) {
      var self = this;
      self.data = [];

      chrome.tabs.query({currentWindow: true, active : true}, function(tabArray) {
        self.currentTab = tabArray[0].id;
      });

      self.getRules = function() {
        storage.retrieve(function(storageData) {
          $scope.$apply(function() {
            self.data = storageData;
            $scope.hostForm.$setPristine();
          });
        });
      };

      self.getRules();

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
        var existingHost = self.data.find(host => host.hostName === self.newRule.hostName);
        if (!existingHost) {
          self.data.push({
            hostName: self.newRule.hostName,
            ips: [{
              ip: self.newRule.ip,
              active: true
            }]
          });
          $scope.hostForm.$setDirty();
        } else {
          let existingIp = existingHost.ips.find(rule => rule.ip === self.newRule.ip);
          if (!existingIp) {
            existingHost.ips.push({
              ip: self.newRule.ip,
              active: true
            });
            $scope.hostForm.$setDirty();
          } else {
            // do nothing
          }
        }
        self.newRule.hostName = "";
        self.newRule.ip = "";
      }

      self.deleteRule = function($scope) {
        $scope.$parent.host.ips = $scope.$parent.host.ips.filter(rule => rule.ip !== $scope.rule.ip);
        if ($scope.$parent.host.ips.length === 0)
          self.data = self.data.filter(host => host.hostName !== $scope.$parent.host.hostName);
        $scope.hostForm.$setDirty();
      }

      self.saveRules = function() {
        storage.save(self.data);
        $scope.hostForm.$setPristine();
      }

    }]

  });
