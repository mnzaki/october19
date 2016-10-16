import templateUrl from './appRoot.html';
import oneColumnLayoutUrl from './appRoot.1col.html';
import twoColumnLayoutUrl from './appRoot.2col.html';

export default {
  templateUrl,

  controller: function($rootScope) {
    'ngInject';

    this.layouts = {
      'default': '1col',
      '1col': oneColumnLayoutUrl,
      '2col': twoColumnLayoutUrl
    };

    var updateLayout = (layout) => {
      this.layout = this.layouts[layout || this.layouts.default];
    }
    updateLayout();
    $rootScope.$on('$stateChangeSuccess',
                   (event, toState) => updateLayout(toState.layout));
  }
}
