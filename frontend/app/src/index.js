import angular from 'angular';
import uiRouter from 'angular-ui-router';

import core from './core';
import layout from './layout';
import user from './user';
import wall from './wall';
import resourceDefinitions from './resources';

angular.module('app', [
  uiRouter,
  core,
  layout,
  user,
  wall
])
  .service('resources', function(resource) {
    'ngInject';
    return resource.createResoure(resourceDefinitions);
  });
