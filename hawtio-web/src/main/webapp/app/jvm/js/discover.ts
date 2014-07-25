/**
 * @module JVM
 */
/// <reference path="./jvmPlugin.ts"/>
module JVM {

  export var DiscoveryController = _module.controller("JVM.DiscoveryController", ["$scope", "localStorage", "jolokia", ($scope, localStorage, jolokia) => {

    $scope.discovering = true;

    $scope.$watch('agents', (newValue, oldValue) => {
      if (newValue !== oldValue) {
        $scope.selectedAgent = $scope.agents.find((a) => a['selected']);
      }
    }, true);

    $scope.closePopover = ($event) => {
      $($event.currentTarget).parents('.popover').prev().popover('hide');
    };

    function doConnect(agent) {
      if (!agent.url) {
        Core.notification('warning', 'No URL available to connect to agent');
        return;
      }
      var options:Core.ConnectToServerOptions = new Core.ConnectToServerOptions();

      var urlObject = Core.parseUrl(agent.url);
      angular.extend(options, urlObject);
      options.userName = agent.username;
      options.password = agent.password;

      Core.connectToServer(localStorage, options);
    };

    $scope.connectWithCredentials = ($event, agent) => {
      $scope.closePopover($event);
      doConnect(agent);
    };

    $scope.gotoServer = ($event, agent) => {
      if (agent.secured) {
        $($event.currentTarget).popover('show');
      } else {
        doConnect(agent);
      }
    };

    $scope.getElementId = (agent) => {
      return agent.agent_id.dasherize().replace(/\./g, "-");
    };

    $scope.getLogo = (agent) => {
      if (agent.server_product) {
        return JVM.logoRegistry[agent.server_product];
      }
      return JVM.logoRegistry['generic'];
    };

    $scope.filterMatches = (agent) => {
      if (Core.isBlank($scope.filter)) {
        return true;
      } else {
        return angular.toJson(agent).toLowerCase().has($scope.filter.toLowerCase());
      }
    };

    $scope.getAgentIdClass = (agent) => {
      if ($scope.hasName(agent)) {
        return "";
      }
      return "strong";
    };

    $scope.hasName = (agent) => {
      if (agent.server_vendor && agent.server_product && agent.server_version) {
        return true;
      }
      return false;
    };

    function render(response) {
      if (!response.value) {
        return;
      }
      var responseJson = angular.toJson(response.value.sortBy((agent) => agent['agent_id']), true);
      if ($scope.responseJson !== responseJson) {
        if ($scope.discovering) {
          $scope.discovering = false;
        }
        $scope.responseJson = responseJson;
        log.debug("agents: ", $scope.agents);
        $scope.agents = response.value;
        Core.$apply($scope);
      }
    }

    var updateRate = localStorage['updateRate'];
    if (updateRate > 0) {
      Core.register(jolokia, $scope, {
        type: 'exec', mbean: 'jolokia:type=Discovery',
        operation: 'lookupAgentsWithTimeout',
        arguments: [updateRate]
      }, onSuccess(render));
    } else {
      Core.register(jolokia, $scope, {
        type: 'exec', mbean: 'jolokia:type=Discovery',
        operation: 'lookupAgents',
        arguments: []
      }, onSuccess(render));
    }


  }]);

}
