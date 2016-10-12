import angular from 'angular';

import appRoot from './appRoot.component';
import navbar from './navbar.component';

export default angular.module('layout', [])
  .component('appRoot', appRoot)
  .component('navbar', navbar)
  .name
