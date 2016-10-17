import angular from 'angular';

import ngResource from 'angular-resource';
import LocalStorageModule from 'angular-local-storage';

import ResourceProvider from './resource.provider';
import AuthenticationProvider from './authentication.provider';

import resourceForm from './resourceForm.directive';
import resourceFormBtn from './resourceFormBtn.directive';

export default angular.module('core', [
  ngResource,
  LocalStorageModule
])
  .provider('authentication', AuthenticationProvider)
  .provider('resource', ResourceProvider)
  .service('resources', (resource) => {
    'ngInject';
    return resource.resources
  })

  .directive('resourceForm', resourceForm)
  .directive('resourceFormBtn', resourceFormBtn)

  .run(($location, $http, $state) => {
    'ngInject';

    /* for django server defaults
     *
    $http.defaults.xsrfHeaderName = 'X-CSRFToken';
    $http.defaults.xsrfCookieName = 'csrftoken';
    */

    if (!$location.path()) $location.path('/');
  })
  .name;
