import homePage from './homePage.component';

export default angular.module('home', [])
  .component('homePage', homePage)

  .config(($stateProvider) => {
    'ngInject';

    $stateProvider.state('home', {
      url: '/',
      layout: '2col',
      views: {
        col1: {
          template: '<home-page></home-page>',
        },
        col2: {
          template: '<home-sidebar></home-sidebar>'
        }
      }
    });
  .name
