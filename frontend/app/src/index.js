import angular from 'angular';
import uiRouter from 'angular-ui-router';

import core from './core';
import layout from './layout';
import resourceDefinitions from './resources';

angular.module('app', [
  uiRouter,

  core,
  layout,
])
  .service('resources', function(resource) {
    'ngInject';
    return resource.createResoure(resourceDefinitions);
  });
