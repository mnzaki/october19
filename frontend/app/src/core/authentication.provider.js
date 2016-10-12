export default class AuthenticationProvider {
  storageKey = 'auth_tokens'
  minExpiresTimeLeft = 15 * 60 * 1000 // 15 minutes
  apiUrl = '/api'
  socialLoginBegin = '/social/login/'
  socialLoginEnd   = '/login_popup.html'

  $get($q, $http, localStorageService, resources) {
    'ngInject';

    var authObj = {};
    setAuthObject(localStorageService.get(self.storageKey));

    return {
      getAuthObject,
      isLoggedIn,
      deauthenticate,
      authenticate,
      refreshToken,
      finishSocialLogin,
      socialLoginPath,
    };

    function getAuthObject() {
      return authObj;
    }

    function setAuthObject(obj) {
      angular.copy(obj, authObj);

      if (!authObj.access_token) {
        return deauthenticate().then(function() {
          return authObj;
        });
      }

      // FIXME why no dynamic?
      if (authObj.user.type === 'owner') {
        authObj.user = new resources.owner(authObj.user);
      } else {
        authObj.user = new resources.customer(authObj.user);
      }

      if (authObj.expires) {
        var msLeft = authObj.expires - Date.now();
        if (msLeft < self.minExpiresTimeLeft) {
          return refreshToken();
        }
      } else if (authObj.expires_in) {
        authObj.expires = Date.now() + authObj.expires_in * 1000;
      }

      localStorageService.set(self.storageKey, authObj);
      resourceProvider.setAccessToken(authObj.access_token);

      return $q.resolve(authObj);
    }


    function isLoggedIn() {
      return !!(authObj.access_token);
    }

    function deauthenticate() {
      localStorageService.remove(self.storageKey);
      angular.copy({}, authObj);
      return $http.get(self.apiUrl + '/logout').then(function(){
        return $q.resolve(true);
      });
    }

    function _authReq(data) {
      // FIXME force https on /login
      return $http.post(self.apiUrl + '/login', data)
        .then(function (resp) {
          return setAuthObject(resp.data);
        })
        .catch(function(){
          deauthenticate();
          return $q.reject(false);
        });
    }

    function authenticate(email, password, cb) {
      return _authReq({
        username: email,
        password: password,
        grant_type: 'password'
      });
    }

    function refreshToken() {
      if (!authObj.refresh_token) return $q.reject(false);

      return _authReq({
        username: authObj.user.email,
        refresh_token: authObj.refresh_token,
        grant_type: 'refresh_token'
      });
    }

    /**
     * Complete the social login process for the given backend
     *
     * If the user has gone through social login, they are now authenticated
     * with the backed. We simply post to /login to get a new token
     */
    function finishSocialLogin(backend) {
      return _authReq();
    }

    /**
     * Generate the path for social login with given backend.
     * The social login process begins by visiting this path
     *
     * FIXME move this from here to somewhere configurable
     */
    function socialLoginPath(backend) {
      return self.socialLoginBegin + backend + '/?next=' + self.socialLoginEnd;
    }
  }
}
