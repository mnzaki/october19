export default ($q, $compile) => {
  'ngInject';
  var invalidSelector = '.ng-invalid';

  return {
    restrict: 'A',
    require: 'form',
    compile: (elem, attrs, transclude) => {
      // add ng-model to all inputs with a name
      angular.forEach(elem[0].querySelectorAll('input[name]'), (el) => {
        el.setAttribute('ng-model', attrs.resourceForm + '.' + el.getAttribute('name'));
      });

      return ($scope, $element, $attrs, formCtrl) => {
        var resource = formCtrl.resource = $scope.$eval($attrs.resourceForm);

        formCtrl.$submitResource = submitResource;
        formCtrl.$setValue = setValue;

        // FIXME check if element is a <form> and only then .on('submit')
        // but it doesn't hurt anyway
        $element.on('submit', formCtrl.$submitResource);

        function setValue(key, val) {
          var ctrl = formCtrl[key];
          resource[key] = ctrl.$modelValue = val;
          ctrl.$setDirty();
        }

        function submitResource() {
          if (formCtrl.$invalid) {
            // touch all untouched invalid fields, to activate errors
            var untouchedInvalidFields =
              $element[0].querySelectorAll(invalidSelector + '.ng-untouched');
            angular.forEach(untouchedInvalidFields, function (el) {
              angular.element(el).controller('ngModel').$setTouched();
            });

            // focus the first invalid field
            var firstInvalid = $element[0].querySelector(invalidSelector);
            if (firstInvalid) firstInvalid.focus();

            // and bail out
            return $q.reject();
          }

          if (!formCtrl.$dirty) return $q.resolve(resource);

          // if there's any on submit hook, run it
          // if it returns a falsy value (other that undefined) then stop
          var proceed = $scope.$eval($attrs.adResourceSubmit);
          if (proceed !== undefined && !proceed) return $q.reject();

          var promise = resource.id ? resource.$updateChanged(formCtrl) : resource.$save();
          promise = promise.then(function() {
            var nestedPromises = [];
            angular.forEach(formCtrl, function(val, key) {
              // nested resource!
              if (key[0] != '$' && val && val.$submitResource) {
                nestedPromises.push(val.$submitResource());
              }
            });
            return $q.all(nestedPromises).then(function() {
              formCtrl.$setPristine();
              return resource;
            });
          }).catch(function(err) {
            console.log('resource form error', err);
            return $q.reject(err);
          });

          $scope.$broadcast('resourceSubmitted', promise);
          $scope.$emit('resourceSubmitted', promise)
          return promise;
        }
      };
    }
  }
}
