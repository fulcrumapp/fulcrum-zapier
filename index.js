const authentication = require('./authentication');
const recordAssignedTrigger = require('./triggers/record_assigned.js');
const recordCreatedTrigger = require('./triggers/record_created.js');
const recordStatusChangedTrigger = require('./triggers/record_status_changed.js');
const appResource = require('./resources/app.js');

const includeAccessToken = (request, z, bundle) => {
  if (bundle.authData.api_key) {
    request.headers['X-ApiToken'] = bundle.authData.api_key;
  }

  return request;
}

module.exports = {
  authentication: authentication,
  beforeRequest: [includeAccessToken],
  afterResponse: [],
  triggers: {
    [recordAssignedTrigger.key]: recordAssignedTrigger,
    [recordCreatedTrigger.key]: recordCreatedTrigger,
    [recordStatusChangedTrigger.key]: recordStatusChangedTrigger,
  },
  creates: {},
  searches: {},
  resources: {
    [appResource.key]: appResource
  },
  hydrators: {},
  version: require('./package.json').version,
  platformVersion: require('zapier-platform-core').version
};
