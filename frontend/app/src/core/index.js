import angular from 'angular';

import ngResource from 'angular-resource';
import LocalStorageModule from 'angular-local-storage';

import ResourceProvider from './resource.provider';
import AuthenticationProvider from './authentication.provider';

export default angular.module('core', [
  ngResource,
  LocalStorageModule
])
  .provider('resource', ResourceProvider)
  .provider('authentication', AuthenticationProvider)
  .run(($location, $http) => {
    'ngInject';

    /* for django server defaults
     *
    $http.defaults.xsrfHeaderName = 'X-CSRFToken';
    $http.defaults.xsrfCookieName = 'csrftoken';
    */

    if (!$location.path()) $location.path('/');
  })
  .name;
