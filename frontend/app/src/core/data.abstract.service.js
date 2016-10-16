export default class DataService {
  objects
  ended = false
  curRequest
  curPollRequest

  pagination = {
    limit: 10,
    offset: 0
  }

  processObject(obj) {
    return obj;
  }

  getPollTimestamp() {
    return this.objects && this.objects[0] && this.objects[0].created;
  }

  constructor(resources, $q, $interval) {
    'ngInject';
    this.$q = $q;
    this.$interval = $interval;
    this.resourceClass = resources[this.getResourceName()];
  }

  /*
   * poll for new objects every `timeout` interval, as long as `scope` is still
   * active
   */
  scopeCount = 0
  pollIntervalPromise
  startPollForScope(scope, delay) {
    if (!delay) delay = 2; // enfore minimum delay of 2 seconds
    this.scopeCount++;
    if (this.scopeCount == 1) {
      this.pollIntervalPromise =
        this.$interval(() => this.pollForNew(), delay * 1000);
    }
    scope.$on('$destroy', () => this.stopPollForScope(scope));
  }

  stopPollForScope(scope) {
    if (!this.pollIntervalPromise) return;
    this.scopeCount--;
    if (this.scopeCount == 0) {
      this.$interval.cancel(this.pollIntervalPromise);
      this.pollIntervalPromise = null;
    }
  }

  pollForNew() {
    var self = this;
    if (!self.objects) return;

    self.cancelPollForNew();

    var extraParams = {
      offset: 0,
      limit: self.pagination.limit,
      from_time: self.getPollTimestamp()
    };

    self.curPollRequest =
      self.resourceClass.poll(self.serializeParams(extraParams));
    return self.curPollRequest.$promise = self.curPollRequest.$promise.then((data) => {
      data.forEach((d) => self.processObject(d));
      self.objects.unshift.apply(self.objects, data);
      self.curPollRequest = null;
      return data;
    });
  }

  cancelPollForNew() {
    if (this.curPollRequest && this.curPollRequest.$cancelRequest)
      this.curPollRequest.$cancelRequest();
    this.curPollRequest = null;
  }

  loadMore() {
    if (this.ended || this.curRequest || !this.objects) return;

    var self = this;
    self.pagination.offset += self.pagination.limit;
    return self.query().then((data) => {
      if (self.objects === data) return;
      self.objects.push.apply(self.objects, data)
    });
  }

  refreshData() {
    this.pagination.offset = 0;
    this.cancelQuery();
    this.cancelPollForNew();
    return this.query().then((data) => this.objects = data);
  }

  cancelQuery() {
    this.ended = false;
    if (this.curRequest && this.curRequest.$cancelRequest)
      this.curRequest.$cancelRequest();
    this.curRequest = null;
  }

  query() {
    var self = this;
    if (!self.curRequest) {
      self.curRequest = self.resourceClass.query(self.serializeParams());
      self.curRequest.$promise = self.curRequest.$promise.then((data) => {
        data.forEach((d) => self.processObject(d));
        return data;
      });

      self.curRequest.$promise.finally(() => {
        self.ended = self.curRequest.length == 0;
        self.curRequest = null;
      });
      return self.curRequest.$promise;
    }
    return self.$q.reject();
  }

  serializeParams(extraParams) {
    var params = angular.merge({}, this.params, this.pagination, extraParams);

    var formattedParams = {
      limit: params.limit,
      offset: params.offset,
      from_time: params.from_time
    };

    angular.forEach(params.filters, (v, k) => {
      if (v) formattedParams['filters['+k+']'] = v || 0;
    });

    return formattedParams;
  }
}
