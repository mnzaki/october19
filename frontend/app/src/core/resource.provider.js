export default class ResourceProvider {
  apiUrl = '/api'
  resources = {}
  accessToken

  $get($resource, $q, $http, $rootScope) {
    'ngInject';

    var provider = this;

    /**
     * $http response interceptor to handle errors centrally
     */
    var responseInterceptor = {
      responseError: function (resp) {
        // FIXME what to send to the soldier's wife?
        return $q.reject(resp);
      }
    };

    return {
      createResource,
      createResources
    };

    function createResources(resourceDefs) {
      angular.forEach(resourceDefs, function(val, key) {
        createResource(key, val);
      });
      return provider.resources;
    }

    /**
     * Creates a new $resource class with various bits of additional
     * functionality:
     *
     * 1. prepends api url to resources
     * 2. auth using access_token param
     * 3. adds 'id' param/field by default
     * 4. multipart form data support for POST/PATCH/PUT
     * 5. process requests with metadata by placing metadat on '$$meta' key
     *
     * A request is considered to have metadata if it has a key 'result' or
     * 'results'. All other keys are considered metadata.
     *
     * NOTE: interceptors and transform{Request,Response} are overridden
     * by this helper, make sure you know what you are doing.
     *
     * @arg {String}  url URL of the resource
     * @arg {Object}  [paramDefaults] default values for resource parameters
     * @arg {Object}  [resActions] actions to attach to the object
     * @arg {Object}  [opts]
     * @arg {Boolean} [opts.addId=true] add 'id' to the paramDefaults
     * @arg {Boolean} [opts.json=true] API endpoint can handle JSON data
     * @arg {Boolean} [opts.multipart=false] API endpoint can handle multipart form data
     *
     * @returns {Object} the class resulting from calling $resource()
     */
    function createResource(resourceName, opts) {
      // default options
      var options = {
        name: resourceName,
        url: null,
        params: {},
        actions: {
          get:      {method: 'GET'},
          save:     {method: 'POST'},
          update:   {method: 'PATCH'},
          query:    {method: 'GET', isArray: true},
          remove:   {method: 'DELETE'},
          'delete': {method: 'DELETE'}
        },
        addId: true,
        json: true,
        multipart: false,
        metadata: false,
        nested: null,
        deferredDeleteAction: 'delete'
      };
      angular.merge(options, opts);

      if (options.addId) {
        options.params.id = '@id';
      }

      var ngResourceClass = $resource(
        provider.apiUrl + options.url,
        options.params,
        options.actions);

      ngResourceClass.options = options;

      angular.forEach(options.actions, function(action, name) {
        action.options = options;
        action.hasBody = /^(POST|PUT|PATCH)$/i.test(action.method);

        // prepend the apiUrl
        if (action.url) {
          action.url = provider.apiUrl + action.url;
        }

        // add interceptor for handling response errors
        action.interceptor = responseInterceptor

        // massage response for actions with metadata
        if (options.metadata) {
          action.transformResponse =
            $http.defaults.transformResponse.concat([
              transformResponse.bind(action)
            ]);
        }

        if (!action.headers) action.headers = {};

        // for methods with a body, massage the request into shape
        // see transformRequest documentation for details
        if (action.hasBody) {
          action.transformRequest = transformRequest.bind(action, ngResourceClass);
          if (!action.headers['Content-type']) {
            action.headers['Content-type'] = getContentTypeHeader;
          }
        }

        action.headers['Authorization'] = function() {
          return 'Bearer ' + provider.accessToken;
        };
      });

      angular.extend(ngResourceClass.prototype, {
        /**
         * Instance method to be called by nested resource instances on
         * success of any action.
         *
         * Currently deletes an element on successful delete.
         */
        $onNestedAction: function(nested, action) {
          if (action.method === 'DELETE') {
            this.$removeNested(nested.$$parentKey, nested);
          } else {
            this.$instantiateNestedResources();
          }
        },

        /**
         * Create a new nested resource at the key specified by dataKey with
         * initial data.
         */
        $addNested: function(dataKey, data, idx) {
          // if no data is specified, we consider the second argument the idx
          if (!angular.isObject(data)) {
            idx = data;
            data = {};
          }

          var isArr = angular.isArray(this[dataKey]);
          if (isArr) {
            if (idx === undefined || idx > this[dataKey].length)
              idx = this[dataKey].length;
            else if (idx < 0)
              idx = this[dataKey].length + 1 + idx;

            this[dataKey].splice(idx, 0, data);
          } else {
            this[dataKey] = data;
          }

          this.$instantiateNestedResources();

          return isArr ? this[dataKey][idx] : this[dataKey];
        },

        /**
         * Remove a nested resource at the key specified by dataKey.
         * We depend on resource having $$parent data
         */
        $removeNested: function(dataKey, resource) {
          var resClass = provider.resources[options.nested[dataKey]];

          var fkKey = resClass.options.parent[options.name];
          delete resource[fkKey];

          var ref = this[dataKey];
          if (angular.isArray(ref)) {
            var idx = R.findIndex(function (obj) {
              return obj.id == resource.id;
            }, ref);
            ref.splice(idx, 1);
          } else {
            delete this[dataKey];
          }
          return resource;
        },

        $isNested: function (key) {
          return options.nested && options.nested[key];
        },

        /**
         * Ensure that any nested resources are wrapped in Resource objects
         * with up-to-date $$parent/$$parentKey values
         */
        $instantiateNestedResources: function() {
          var resource = this;
          // if there are nested resources, instantiate them
          if (options.nested) {
            angular.forEach(options.nested, function(resName, dataKey) {
              var cls = provider.resources[resName];

              function instantiate(d, idx) {
                var nested = d instanceof cls ? d : new cls(d);
                nested.$init();
                nested[cls.options.parent[options.name]] = resource.id;
                return angular.extend(nested, {
                  $$parent: resource,
                  $$parentKey: dataKey
                });
              }

              if (angular.isObject(resource[dataKey])) {
                if (angular.isArray(resource[dataKey])) {
                  resource[dataKey] = resource[dataKey].map(instantiate);
                } else {
                  resource[dataKey] = instantiate(resource[dataKey]);
                }
              }
            });
          }
        },

        $updateChanged: function(formCtrl) {
          var self = this, data = {};
          angular.forEach(formCtrl, function(model, key) {
            if (key[0] == '$' || !formCtrl.hasOwnProperty(key) ||
                self[key] === undefined ||
                !model.$dirty || !model.$valid ||
                model.$modelValue === undefined) return;
            data[key] = model.$modelValue
          });

          if (R.keys(data).length == 0) return $q.resolve(self);
          return ngResourceClass.update({id: self.id}, data).$promise.then(function(newResource) {
            return angular.extend(self, newResource);
          });
        },


        $forEachTranslated: function(cb, lang) {
          var self = this,
              lang = lang || self.$$lang,
              suffix = '_' + lang;
          if (!lang) return;

          function ap(item) {
            item.$forEachTranslated && item.$forEachTranslated(cb, lang);
          }

          Object.keys(self).forEach(function(key) {
            if (key[0] == '$') return;
            var transKey = key + suffix;
            if (self.hasOwnProperty(transKey)) {
              cb.call(self, key, transKey);
            } else if (self.$isNested(key) && self[key]) {
              if (angular.isArray(self[key])) self[key].forEach(ap);
              else ap(self[key]);
            }
          });
        },

        $saveTranslation: function(lang) {
          this.$forEachTranslated(function (key, transKey) {
              this[transKey] = this[key];
          }, lang);
        },

        $setLanguage: function(lang) {
          this.$forEachTranslated(function (key, transKey) {
              this[key] = this[transKey];
          }, lang);
          this.$$lang = lang;
        },

        /**
         * Initialize the resource object. This is meant to be run whenever
         * a new instance is first created. Using inheritence required too
         * many hacks to work with ngResource properly, so instead this code
         * is here and is called at the two points after which a new
         * instance is created:
         *
         * 1. class call to one of the action methods
         * 2. new nested resources being instantiated
         *
         */
        $init: function() {
          var self = this;
          if (self.$$inited) return;

          self.$instantiateNestedResources();

          if (typeof self.$$deleted === 'undefined') {
            self.$$deleted = false;
          }

          self.$$lang = self.$$lang || undefined;

          self.$$inited = true;
          return self;
        },

        $trackLanguage: function(scope) {
          var self = this;
          self.$untrackLanguage();
          self.$unbind = $rootScope.$on('$translateChangeSuccess', function(event, data) {
            self.$setLanguage(data.language);
          });

          scope.$on('$destroy', self.$untrackLanguage.bind(self));
          // FIXME potential problem: language changes then we start
          // tracking, will not trigger
        },

        $untrackLanguage: function() {
          var self = this;
          if (!self.$unbind) return;
          self.$unbind();
          self.$unbind = null;
        }
      });

      angular.forEach(options.actions, function(action, name) {
        // actions are defined on the class itself, and instance calls are
        // routed to the same action functions
        var origFn = ngResourceClass[name];
        ngResourceClass[name] = function() {
          var self = this;
          var isInstanceCall = self instanceof ngResourceClass;

          if (isInstanceCall) {
            // ensure we are inited
            self.$init();
          }

          // if this object is marked as $$deleted, then call the action
          // configured with deferredDeleteAction instead
          if (isInstanceCall && self.$$deleted &&
              action.hasBody && action.method !== 'DELETE') {
            return self['$'+options.deferredDeleteAction]();
          }

          // if this is an instance call, then we already have data
          // if there are nested objects in this data, we need to save them
          // as not all server requests return the nested objects with them,
          // so they would get destroyed on the call to
          // angular.copy(data, this)
          var savedNestedResources, savedParent;
          if (isInstanceCall) {
            if (options.nested) {
              savedNestedResources = {};
              angular.forEach(options.nested, function(resName, dataKey) {
                savedNestedResources[dataKey] = self[dataKey];
              });
            }
            if (self.$$parent) {
              savedParent = self.$$parent;
            }
          }

          var result = origFn.apply(self, arguments);

          // if this is a class call, and result is not an object
          // then there's nothing left to do here
          if (!isInstanceCall && !angular.isObject(result))
            return result;

          // otherwise we need to take care of a few things:
          // - add a temp metadata object to avoid existence checks when
          //   using the api
          if (options.metadata) result.$$meta = {};

          // - mod the resource object with:
          //   - nested resource instances
          //   - metadata returned in the request
          //   - saved nested resources (see comments above)
          //   - parent info, by notifying the parent of the action
          //   - metadata about object property changes
          //
          // but only after the request is done
          var promise = isInstanceCall ? result : result.$promise;
          promise = promise.then(function(data) {
            if (!angular.isObject(data)) return;

            if (action.isArray) {
              data.forEach(function(d) {
                d.$init();
              });

              //   if action expects metadata, and it's an array, then
              //   transformResponse passes it as the last element.
              //   we place it on the array
              if (options.metadata) angular.merge(data, data.pop());
            } else {
              if (savedNestedResources) {
                angular.forEach(savedNestedResources, function(val, key) {
                  // FIXME if it's an array, shouldn't we merge them?
                  if (data[key] === undefined ||
                      angular.isArray(savedNestedResources[key]))
                    data[key] = savedNestedResources[key];
                });
              }

              data.$init();

              if (savedParent) {
                savedParent.$onNestedAction(data, action);
              }
            }

            return data;
          });

          if (isInstanceCall) result = promise;
          else result.$promise = promise;

          return result;
        };
      });

      return provider.resources[options.name] = ngResourceClass;
    }

    /**
     * 'Content-type' header getter that decides whether encoding will be
     * JSON or multipart by looking for files in the data object.
     */
    function getContentTypeHeader(action) {
      var hasFiles;

      try {
        angular.forEach(action.data, function isFileRec(val) {
          if (val instanceof File) throw 'found';
          if (val && val.constructor !== Object) return;

          angular.forEach(val, function(v, k) {
            if (k[0] !== '$') isFileRec(v);
          });
        });
      } catch(err) {
        if (err === 'found') hasFiles = true;
        else throw err;
      }

      if (hasFiles) {
        if (!action.options.multipart) {
          throw new Error('resource does not support multipart requests!');
        }
        return undefined; // we let the browser handle it
      } else {
        if (!action.options.json) {
          throw new Error('resource does not support JSON requests!');
        }
        return 'application/json';
      }
    }

    /**
     * Request transformer that serializes data to either JSON or multipart
     * formdata depending on whether or not it has file objects.
     *
     * For all requests, any Resource objects are removed from the data
     *
     * The function expects to be bound to a resource action config object.
     */
    function transformRequest(ngResourceClass, data, getHeader) {
      var action = this;

      /**
       * Deep clone a data object, but:
       * 1. ignore embedded ngResource objects (unless noIgnoreResource)
       * 2. clear out empty arrays
       * 3. ignore keys that start with '$'
       */
      function cloneCleanedData(obj, noIgnoreResource) {
        if (!angular.isObject(obj) || obj instanceof File) return obj;

        var ret;
        if (angular.isArray(obj)) {
          if (!obj.length) return obj;
          ret = [];
          obj.forEach(function(val) {
            if (val === undefined) {
              ret.push(undefined);
            } else {
              val = cloneCleanedData(val);
              if (val !== undefined) ret.push(val);
            }
          });
          // clear out empty arrays
          if (!ret.length) ret = undefined;
        } else {
          if (obj instanceof Date) return obj.toISOString();
          // an Object instance, but is it a resource? Quack!
          if (!noIgnoreResource && obj.$get) return;

          ret = {};

          angular.forEach(obj, function(val, key) {
            // ignore keys starting with '$'
            if (key[0] === '$') return;

            if (val === undefined) {
              ret[key] = undefined;
            } else {
              val = cloneCleanedData(val);
              if (val !== undefined) ret[key] = val;
            }
          });
        }

        return ret;
      }

      // FIXME this is a preposterous hack
      if (data.$saveTranslation === undefined) {
        ['$forEachTranslated', '$saveTranslation'].forEach(function(hackety) {
          data[hackety] = ngResourceClass.prototype[hackety].bind(data);
        });
      }
      // copy over translated values to proper fields
      data.$saveTranslation();

      data = cloneCleanedData(data, true);

      if (!angular.isObject(data)) return data;

      switch(getHeader('Content-type')) {
        case 'application/json': return angular.toJson(data);
        case null:
        case undefined:
          var fd = new FormData();
          angular.forEach(data, function(val, key) {
            fd.append(key, val);
          });
          return fd;
      }
    }

    /**
     * Response transformer that massages a response object:
     *
     * 1. If the response contains a 'results' or 'result' key,
     *    then consider that the data, and all other keys are
     *    collected into a '$$meta' object on the result
     *
     * The function expects to be bound to a resource action config object.
     */
    function transformResponse(data, getHeader, status) {
      var options = this.options;
      if (status === 200 && data instanceof Object) {
        if (options.metadata) {
          var res = data.result || data.results;
          if (res) {
            delete data.result;
            delete data.results;
            if (angular.isArray(res)) res.push({$$meta: data});
            else res.$$meta = data;
            data = res;
          }
        }
      }
      return data;
    }
  }
}
