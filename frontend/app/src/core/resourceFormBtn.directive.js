export default ($timeout) => {
  'ngInject';

  return {
    restrict: 'A',
    link: function ($scope, $element) {
      $scope.$on('resourceSubmitted', function(ev,promise) {
        var hasNgDisabled = $element.attr('ng-disabled')
        // if it hasNgDisabled, we don't mess with it
        if (!hasNgDisabled) $element.attr('disabled', true);

        promise.then(function() {
          removeClassButton($element, 'success', hasNgDisabled);
        }).catch(function() {
          removeClassButton($element, 'error', hasNgDisabled);
        })
      })
    }
  };

  function removeClassButton(el, klass, hasNgDisabled) {
    el.removeClass('progress').addClass(klass);
    $timeout(function() {
      el.removeClass('success error')
      // if it hasNgDisabled, we don't mess with it
      if (!hasNgDisabled) el.removeAttr('disabled');
    }, 2500);
  }
}
