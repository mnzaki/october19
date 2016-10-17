export default ($timeout) => {
  'ngInject';

  return {
    restrict: 'A',
    require: '^form',
    link: function ($scope, $element, $attrs, formCtrl) {
      var hasNgDisabled = $element.attr('ng-disabled')
      $scope.$watch(() => formCtrl.$invalid, disable);

      $scope.$on('resourceSubmitted', function(ev,promise) {
        disable(true);
        promise.then(function() {
          removeClassButton('success');
        }).catch(function() {
          removeClassButton('error');
        })
      });

      function disable(val) {
        // if it hasNgDisabled, we don't mess with it
        if (!hasNgDisabled) {
          val = val && formCtrl.$invalid;
          if (val) $element.attr('disabled', true);
          else $element.removeAttr('disabled');
        }
      }

      function removeClassButton(klass) {
        $element.removeClass('progress').addClass(klass);
        $timeout(function() {
          $element.removeClass('success error')
          disable(false);
        }, 2500);
      }
    }
  };

}
