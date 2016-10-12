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
  .name;
