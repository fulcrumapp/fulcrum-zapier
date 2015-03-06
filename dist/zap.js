(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (process){
var Utils, trim;

trim = function(value) {
  return value.replace(/^\s+|\s+$/gm, '');
};

Utils = (function() {
  function Utils() {}

  Utils.prototype.TEST = process && process.env && process.env.test === 'test';

  Utils.prototype.API = 'https://api.fulcrumapp.com/api/v2';

  Utils.prototype.flattenElements = function(elements) {
    return _.tap([], (function(_this) {
      return function(flat) {
        return _.each(elements, function(element) {
          var children;
          flat.push(element);
          if (element.type === 'Section') {
            children = _this.flattenElements(element.elements);
            return Array.prototype.push.apply(flat, children);
          }
        });
      };
    })(this));
  };

  Utils.prototype.pushArray = function(array, values) {
    return Array.prototype.push.apply(array, values);
  };

  Utils.prototype.request = function(url, token) {
    var data, params, request, response;
    params = {
      method: 'GET',
      url: url,
      auth: null,
      headers: {
        'X-ApiToken': token
      }
    };
    response = null;
    data = null;
    if (this.TEST) {
      request = require('sync-request');
      response = request(params.method, params.url, {
        headers: params.headers
      });
      data = response.body;
    } else {
      response = z.request(params);
      data = response.content;
    }
    return JSON.parse(data);
  };

  Utils.prototype.addressValue = function(value) {
    var city, country, county, lines, num, state, street, suite, zip;
    num = (value != null ? value.sub_thoroughfare : void 0) || '';
    street = (value != null ? value.thoroughfare : void 0) || '';
    city = (value != null ? value.locality : void 0) || '';
    county = (value != null ? value.sub_admin_area : void 0) || '';
    state = (value != null ? value.admin_area : void 0) || '';
    zip = (value != null ? value.postal_code : void 0) || '';
    suite = (value != null ? value.suite : void 0) || '';
    country = (value != null ? value.country : void 0) || '';
    lines = [];
    lines.push(trim("" + num + " " + street + " " + suite));
    lines.push(trim("" + (_.compact([city, state]).join(', ')) + " " + zip));
    lines.push(trim("" + county));
    lines.push(trim("" + country));
    return _.filter(_.compact(lines), function(v) {
      return !_.isEmpty(trim(v || ''));
    }).join("\n");
  };

  Utils.prototype.fetchResource = function(resourceName, id, token) {
    var url;
    url = "" + this.API + "/" + resourceName + "/" + id + ".json";
    return this.request(url, token);
  };

  Utils.prototype.fetchForm = function(formID, token) {
    var form;
    form = this.fetchResource('forms', formID, token).form;
    this.fetchFormDependencies(form, token);
    return form;
  };

  Utils.prototype.fetchPreviousRecordVersion = function(record, token) {
    return this.fetchRecordHistoryVersion(record.id, record.version - 1, token);
  };

  Utils.prototype.fetchRecordHistoryVersion = function(recordID, version, token) {
    var url;
    url = "" + this.API + "/records/history.json?record_id=" + recordID + "&version=" + version;
    return _.find(this.request(url, token).records, function(record) {
      return record.version === version;
    });
  };

  Utils.prototype.fetchMemberships = function(token) {
    var url;
    if (this.memberships) {
      return this.memberships;
    }
    url = "" + this.API + "/memberships.json?skip_associations=true";
    return this.memberships = this.request(url, token).memberships;
  };

  Utils.prototype.fetchFormDependencies = function(form, token) {
    var hasChoiceList;
    hasChoiceList = _.find(this.flattenElements(form.elements), function(element) {
      return element.type === 'ChoiceField' && (element.choice_list_id != null);
    });
    if (hasChoiceList) {
      return this.fetchChoiceLists(token);
    }
  };

  Utils.prototype.fetchChoiceLists = function(token) {
    var url;
    if (this.choiceLists) {
      return this.choiceLists;
    }
    url = "" + this.API + "/choice_lists.json";
    this.choiceLists = this.request(url, token).choice_lists;
    this.choiceListsMap = {};
    _.each(this.choiceLists, (function(_this) {
      return function(list) {
        return _this.choiceListsMap[list.id] = list;
      };
    })(this));
    return this.choiceLists;
  };

  Utils.prototype.fetchUserEmail = function(user_id, token) {
    var user;
    if (!user_id) {
      return null;
    }
    this.fetchMemberships(token);
    user = _.find(this.memberships, function(user) {
      return user.user_id === user_id;
    });
    if (user) {
      return user.email;
    } else {
      return null;
    }
  };

  Utils.prototype.choiceLabel = function(element, value) {
    var choices, labels, valueLabels, _ref;
    choices = element.choice_list_id ? ((_ref = this.choiceListsMap[element.choice_list_id]) != null ? _ref.choices : void 0) || [] : element.choices;
    labels = [];
    if (value.choice_values) {
      valueLabels = _.map(value.choice_values, function(item) {
        var choice;
        choice = _.find(choices, function(choice) {
          return choice.value === item;
        });
        if (choice) {
          return choice.label || item;
        }
      });
    }
    this.pushArray(labels, valueLabels);
    if (value.other_values) {
      this.pushArray(labels, value.other_values);
    }
    return _.compact(labels).join(', ');
  };

  Utils.prototype.makeValues = function(element, value) {
    var serializer;
    if (_.isNull(value) || _.isUndefined(value)) {
      return this.makeValue([element.data_name], ['']);
    }
    serializer = this["serialize_" + element.type];
    if (serializer) {
      return serializer.call(this, element, value);
    }
    return this.serialize_Default(element, value);
  };

  Utils.prototype.makeValue = function(keys, values) {
    var output;
    output = {};
    _.each(keys, function(key, index) {
      return output[key] = values[index];
    });
    return output;
  };

  Utils.prototype.makeRecords = function(form, elements, records, token) {
    return _.map(records, (function(_this) {
      return function(record) {
        return _this.makeRecord(form, elements, record, token, {
          event_type: 'Create'
        });
      };
    })(this));
  };

  Utils.prototype.makeRecord = function(form, elements, data, token, output) {
    output || (output = {});
    output.id = data.id;
    output.form_id = data.form_id;
    output.project_id = data.project_id;
    output.status = data.status;
    output.created_at = data.created_at;
    output.updated_at = data.updated_at;
    output.device_created_at = data.client_created_at;
    output.device_updated_at = data.client_updated_at;
    output.created_by = data.created_by;
    output.updated_by = data.updated_by;
    output.assigned_to = data.assigned_to;
    output.latitude = data.latitude;
    output.longitude = data.longitude;
    output.altitude = data.altitude;
    output.accuracy = data.horizontal_accuracy;
    output.version = data.version;
    if (data.assigned_to_id) {
      output.assigned_to_email = this.fetchUserEmail(data.assigned_to_id, token);
    } else {
      output.assigned_to_email = null;
    }
    if (data.created_by_id) {
      output.created_by_email = this.fetchUserEmail(data.created_by_id, token);
    } else {
      output.created_by_email = null;
    }
    if (data.updated_by_id) {
      output.updated_by_email = this.fetchUserEmail(data.updated_by_id, token);
    } else {
      output.updated_by_email = null;
    }
    _.each(elements, (function(_this) {
      return function(element) {
        var key, values, _results;
        values = _this.makeValues(element, data.form_values[element.key]);
        _results = [];
        for (key in values) {
          _results.push(output[key] = values[key]);
        }
        return _results;
      };
    })(this));
    return output;
  };

  Utils.prototype.serialize_ChoiceField = function(element, value) {
    var choices, keys, values;
    choices = [];
    if (value.choice_values) {
      this.pushArray(choices, value.choice_values);
    }
    if (value.other_values) {
      this.pushArray(choices, value.other_values);
    }
    keys = [element.data_name, element.data_name + '_label'];
    values = [_.compact(choices).join(", "), this.choiceLabel(element, value)];
    return this.makeValue(keys, values);
  };

  Utils.prototype.serialize_ClassificationField = function(element, value) {
    return this.serialize_Choice(element, value);
  };

  Utils.prototype.serialize_Repeatable = function(element, value) {
    return this.makeValue([element.data_name], ["Repeatable fields are not supported."]);
  };

  Utils.prototype.serialize_AddressField = function(element, value) {
    return this.makeValue([element.data_name], [this.addressValue(value)]);
  };

  Utils.prototype.serialize_PhotoField = function(element, value) {
    var captions, keys, photos, url, values;
    photos = [];
    captions = [];
    _.each(value, function(photo) {
      photos.push(photo.photo_id);
      return captions.push(photo.caption || '');
    });
    keys = [element.data_name + '_id', element.data_name + '_captions', element.data_name + '_url'];
    url = "https://web.fulcrumapp.com/photos/view?photos=" + photos.join(",");
    values = [photos.join(", "), _.compact(captions).join(", "), url];
    return this.makeValue(keys, values);
  };

  Utils.prototype.serialize_VideoField = function(element, value) {
    var captions, keys, url, values, videos;
    videos = [];
    captions = [];
    _.each(value, function(video) {
      videos.push(video.video_id);
      return captions.push(video.caption || '');
    });
    keys = [element.data_name + '_id', element.data_name + '_captions', element.data_name + '_url'];
    url = "https://web.fulcrumapp.com/videos/view?videos=" + videos.join(",");
    values = [videos.join(", "), _.compact(captions).join(", "), url];
    return this.makeValue(keys, values);
  };

  Utils.prototype.serialize_SignatureField = function(element, value) {
    return makeValue([element.data_name], [value.signature_id]);
  };

  Utils.prototype.serialize_Choice = function(element, value) {
    var choices;
    choices = [];
    if (value.choice_values) {
      this.pushArray(choices, value.choice_values);
    }
    if (value.other_values) {
      this.pushArray(choices, value.other_values);
    }
    return this.makeValue([element.data_name], [_.compact(choices).join(', ')]);
  };

  Utils.prototype.serialize_Default = function(element, value) {
    value = value ? value.toString() : '';
    return this.makeValue([element.data_name], [value]);
  };

  return Utils;

})();

module.exports = new Utils;



}).call(this,require('_process'))
},{"_process":21,"sync-request":2}],2:[function(require,module,exports){
'use strict';

var Response = require('http-response-object');
var handleQs = require('then-request/lib/handle-qs.js');

module.exports = doRequest;
function doRequest(method, url, options, callback) {
  var xhr = new window.XMLHttpRequest();

  // check types of arguments

  if (typeof method !== 'string') {
    throw new TypeError('The method must be a string.');
  }
  if (typeof url !== 'string') {
    throw new TypeError('The URL/path must be a string.');
  }
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  if (options === null || options === undefined) {
    options = {};
  }
  if (typeof options !== 'object') {
    throw new TypeError('Options must be an object (or null).');
  }
  if (typeof callback !== 'function') {
    callback = undefined;
  }

  method = method.toUpperCase();
  options.headers = options.headers || {};

  // handle cross domain

  var match;
  var crossDomain = !!((match = /^([\w-]+:)?\/\/([^\/]+)/.exec(options.uri)) && (match[2] != window.location.host));
  if (!crossDomain) options.headers['X-Requested-With'] = 'XMLHttpRequest';

  // handle query string
  if (options.qs) {
    url = handleQs(url, options.qs);
  }

  // handle json body
  if (options.json) {
    options.body = JSON.stringify(options.json);
    options.headers['content-type'] = 'application/json';
  }

  // method, url, async
  xhr.open(method, url, false);

  for (var name in options.headers) {
    xhr.setRequestHeader(name.toLowerCase(), options.headers[name]);
  }

  // avoid sending empty string (#319)
  xhr.send(options.body ? options.body : null);


  var headers = {};
  xhr.getAllResponseHeaders().split('\r\n').forEach(function (header) {
    var h = header.split(':');
    if (h.length > 1) {
      headers[h[0].toLowerCase()] = h.slice(1).join(':').trim();
    }
  });
  return new Response(xhr.status, headers, xhr.responseText);
}

},{"http-response-object":3,"then-request/lib/handle-qs.js":4}],3:[function(require,module,exports){
'use strict';

module.exports = Response;

/**
 * A response from a web request
 *
 * @param {Number} statusCode
 * @param {Object} headers
 * @param {Buffer} body
 */
function Response(statusCode, headers, body) {
  if (typeof statusCode !== 'number') {
    throw new TypeError('statusCode must be a number but was ' + (typeof statusCode));
  }
  if (headers === null) {
    throw new TypeError('headers cannot be null');
  }
  if (typeof headers !== 'object') {
    throw new TypeError('headers must be an object but was ' + (typeof headers));
  }
  this.statusCode = statusCode;
  this.headers = {};
  for (var key in headers) {
    this.headers[key.toLowerCase()] = headers[key];
  }
  this.body = body;
}

Response.prototype.getBody = function (encoding) {
  if (this.statusCode >= 300) {
    var err = new Error('Server responded with status code '
                    + this.statusCode + ':\n' + this.body.toString());
    err.statusCode = this.statusCode;
    err.headers = this.headers;
    err.body = this.body;
    throw err;
  }
  return encoding ? this.body.toString(encoding) : this.body;
};

},{}],4:[function(require,module,exports){
'use strict';

var parse = require('qs').parse;
var stringify = require('qs').stringify;

module.exports = handleQs;
function handleQs(url, query) {
  url = url.split('?');
  var start = url[0];
  var qs = (url[1] || '').split('#')[0];
  var end = url[1] && url[1].split('#').length > 1 ? '#' + url[1].split('#')[1] : '';

  var baseQs = parse(qs);
  for (var i in query) {
    baseQs[i] = query[i];
  }
  qs = stringify(baseQs);
  if (qs !== '') {
    qs = '?' + qs;
  }
  return start + qs + end;
}

},{"qs":5}],5:[function(require,module,exports){
module.exports = require('./lib/');

},{"./lib/":6}],6:[function(require,module,exports){
// Load modules

var Stringify = require('./stringify');
var Parse = require('./parse');


// Declare internals

var internals = {};


module.exports = {
    stringify: Stringify,
    parse: Parse
};

},{"./parse":7,"./stringify":8}],7:[function(require,module,exports){
// Load modules

var Utils = require('./utils');


// Declare internals

var internals = {
    delimiter: '&',
    depth: 5,
    arrayLimit: 20,
    parameterLimit: 1000
};


internals.parseValues = function (str, options) {

    var obj = {};
    var parts = str.split(options.delimiter, options.parameterLimit === Infinity ? undefined : options.parameterLimit);

    for (var i = 0, il = parts.length; i < il; ++i) {
        var part = parts[i];
        var pos = part.indexOf(']=') === -1 ? part.indexOf('=') : part.indexOf(']=') + 1;

        if (pos === -1) {
            obj[Utils.decode(part)] = '';
        }
        else {
            var key = Utils.decode(part.slice(0, pos));
            var val = Utils.decode(part.slice(pos + 1));

            if (!obj.hasOwnProperty(key)) {
                obj[key] = val;
            }
            else {
                obj[key] = [].concat(obj[key]).concat(val);
            }
        }
    }

    return obj;
};


internals.parseObject = function (chain, val, options) {

    if (!chain.length) {
        return val;
    }

    var root = chain.shift();

    var obj = {};
    if (root === '[]') {
        obj = [];
        obj = obj.concat(internals.parseObject(chain, val, options));
    }
    else {
        var cleanRoot = root[0] === '[' && root[root.length - 1] === ']' ? root.slice(1, root.length - 1) : root;
        var index = parseInt(cleanRoot, 10);
        var indexString = '' + index;
        if (!isNaN(index) &&
            root !== cleanRoot &&
            indexString === cleanRoot &&
            index >= 0 &&
            index <= options.arrayLimit) {

            obj = [];
            obj[index] = internals.parseObject(chain, val, options);
        }
        else {
            obj[cleanRoot] = internals.parseObject(chain, val, options);
        }
    }

    return obj;
};


internals.parseKeys = function (key, val, options) {

    if (!key) {
        return;
    }

    // The regex chunks

    var parent = /^([^\[\]]*)/;
    var child = /(\[[^\[\]]*\])/g;

    // Get the parent

    var segment = parent.exec(key);

    // Don't allow them to overwrite object prototype properties

    if (Object.prototype.hasOwnProperty(segment[1])) {
        return;
    }

    // Stash the parent if it exists

    var keys = [];
    if (segment[1]) {
        keys.push(segment[1]);
    }

    // Loop through children appending to the array until we hit depth

    var i = 0;
    while ((segment = child.exec(key)) !== null && i < options.depth) {

        ++i;
        if (!Object.prototype.hasOwnProperty(segment[1].replace(/\[|\]/g, ''))) {
            keys.push(segment[1]);
        }
    }

    // If there's a remainder, just add whatever is left

    if (segment) {
        keys.push('[' + key.slice(segment.index) + ']');
    }

    return internals.parseObject(keys, val, options);
};


module.exports = function (str, options) {

    if (str === '' ||
        str === null ||
        typeof str === 'undefined') {

        return {};
    }

    options = options || {};
    options.delimiter = typeof options.delimiter === 'string' || Utils.isRegExp(options.delimiter) ? options.delimiter : internals.delimiter;
    options.depth = typeof options.depth === 'number' ? options.depth : internals.depth;
    options.arrayLimit = typeof options.arrayLimit === 'number' ? options.arrayLimit : internals.arrayLimit;
    options.parameterLimit = typeof options.parameterLimit === 'number' ? options.parameterLimit : internals.parameterLimit;

    var tempObj = typeof str === 'string' ? internals.parseValues(str, options) : str;
    var obj = {};

    // Iterate over the keys and setup the new object

    var keys = Object.keys(tempObj);
    for (var i = 0, il = keys.length; i < il; ++i) {
        var key = keys[i];
        var newObj = internals.parseKeys(key, tempObj[key], options);
        obj = Utils.merge(obj, newObj);
    }

    return Utils.compact(obj);
};

},{"./utils":9}],8:[function(require,module,exports){
// Load modules

var Utils = require('./utils');


// Declare internals

var internals = {
    delimiter: '&',
    indices: true
};


internals.stringify = function (obj, prefix, options) {

    if (Utils.isBuffer(obj)) {
        obj = obj.toString();
    }
    else if (obj instanceof Date) {
        obj = obj.toISOString();
    }
    else if (obj === null) {
        obj = '';
    }

    if (typeof obj === 'string' ||
        typeof obj === 'number' ||
        typeof obj === 'boolean') {

        return [encodeURIComponent(prefix) + '=' + encodeURIComponent(obj)];
    }

    var values = [];

    if (typeof obj === 'undefined') {
        return values;
    }

    var objKeys = Object.keys(obj);
    for (var i = 0, il = objKeys.length; i < il; ++i) {
        var key = objKeys[i];
        if (!options.indices &&
            Array.isArray(obj)) {

            values = values.concat(internals.stringify(obj[key], prefix, options));
        }
        else {
            values = values.concat(internals.stringify(obj[key], prefix + '[' + key + ']', options));
        }
    }

    return values;
};


module.exports = function (obj, options) {

    options = options || {};
    var delimiter = typeof options.delimiter === 'undefined' ? internals.delimiter : options.delimiter;
    options.indices = typeof options.indices === 'boolean' ? options.indices : internals.indices;

    var keys = [];

    if (typeof obj !== 'object' ||
        obj === null) {

        return '';
    }

    var objKeys = Object.keys(obj);
    for (var i = 0, il = objKeys.length; i < il; ++i) {
        var key = objKeys[i];
        keys = keys.concat(internals.stringify(obj[key], key, options));
    }

    return keys.join(delimiter);
};

},{"./utils":9}],9:[function(require,module,exports){
// Load modules


// Declare internals

var internals = {};


exports.arrayToObject = function (source) {

    var obj = {};
    for (var i = 0, il = source.length; i < il; ++i) {
        if (typeof source[i] !== 'undefined') {

            obj[i] = source[i];
        }
    }

    return obj;
};


exports.merge = function (target, source) {

    if (!source) {
        return target;
    }

    if (typeof source !== 'object') {
        if (Array.isArray(target)) {
            target.push(source);
        }
        else {
            target[source] = true;
        }

        return target;
    }

    if (typeof target !== 'object') {
        target = [target].concat(source);
        return target;
    }

    if (Array.isArray(target) &&
        !Array.isArray(source)) {

        target = exports.arrayToObject(target);
    }

    var keys = Object.keys(source);
    for (var k = 0, kl = keys.length; k < kl; ++k) {
        var key = keys[k];
        var value = source[key];

        if (!target[key]) {
            target[key] = value;
        }
        else {
            target[key] = exports.merge(target[key], value);
        }
    }

    return target;
};


exports.decode = function (str) {

    try {
        return decodeURIComponent(str.replace(/\+/g, ' '));
    } catch (e) {
        return str;
    }
};


exports.compact = function (obj, refs) {

    if (typeof obj !== 'object' ||
        obj === null) {

        return obj;
    }

    refs = refs || [];
    var lookup = refs.indexOf(obj);
    if (lookup !== -1) {
        return refs[lookup];
    }

    refs.push(obj);

    if (Array.isArray(obj)) {
        var compacted = [];

        for (var i = 0, il = obj.length; i < il; ++i) {
            if (typeof obj[i] !== 'undefined') {
                compacted.push(obj[i]);
            }
        }

        return compacted;
    }

    var keys = Object.keys(obj);
    for (i = 0, il = keys.length; i < il; ++i) {
        var key = keys[i];
        obj[key] = exports.compact(obj[key], refs);
    }

    return obj;
};


exports.isRegExp = function (obj) {
    return Object.prototype.toString.call(obj) === '[object RegExp]';
};


exports.isBuffer = function (obj) {

    if (obj === null ||
        typeof obj === 'undefined') {

        return false;
    }

    return !!(obj.constructor &&
        obj.constructor.isBuffer &&
        obj.constructor.isBuffer(obj));
};

},{}],10:[function(require,module,exports){
var triggers;

triggers = {
  RecordChanged: require('./record-changed'),
  RecordCreated: require('./record-created'),
  RecordDeleted: require('./record-deleted'),
  RecordUpdated: require('./record-updated'),
  RecordAssigned: require('./record-assigned'),
  RecordProjectChanged: require('./record-project-changed'),
  RecordStatusChanged: require('./record-status-changed')
};

module.exports = {
  process: function(event, bundle) {
    return (new triggers[event]).process(bundle);
  }
};



},{"./record-assigned":11,"./record-changed":12,"./record-created":13,"./record-deleted":14,"./record-project-changed":15,"./record-status-changed":16,"./record-updated":18}],11:[function(require,module,exports){
var RecordAssigned, RecordTrigger, utils,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

utils = require('../lib/utils');

RecordTrigger = require('./record-trigger');

module.exports = RecordAssigned = (function(_super) {
  __extends(RecordAssigned, _super);

  function RecordAssigned() {
    return RecordAssigned.__super__.constructor.apply(this, arguments);
  }

  RecordAssigned.prototype.shouldProcess = function() {
    return RecordAssigned.__super__.shouldProcess.call(this) && this.isntDeleted() && this.currentAssignment() && (this.currentAssignment() !== this.previousAssignment());
  };

  RecordAssigned.prototype.isntDeleted = function() {
    return this.type !== 'record.delete';
  };

  RecordAssigned.prototype.currentAssignment = function() {
    return this.data.assigned_to_id;
  };

  RecordAssigned.prototype.previousAssignment = function() {
    if (this.data.version === 1) {
      return null;
    }
    return utils.fetchPreviousRecordVersion(this.data, this.token).assigned_to_id;
  };

  RecordAssigned.prototype.result = function() {
    if (this.data.assigned_to_id) {
      this.data.assigned_to_email = utils.fetchUserEmail(this.data.assigned_to_id, this.token);
    }
    return RecordAssigned.__super__.result.call(this);
  };

  return RecordAssigned;

})(RecordTrigger);



},{"../lib/utils":1,"./record-trigger":17}],12:[function(require,module,exports){
var RecordChanged, RecordTrigger, utils,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

utils = require('../lib/utils');

RecordTrigger = require('./record-trigger');

module.exports = RecordChanged = (function(_super) {
  __extends(RecordChanged, _super);

  function RecordChanged() {
    return RecordChanged.__super__.constructor.apply(this, arguments);
  }

  return RecordChanged;

})(RecordTrigger);



},{"../lib/utils":1,"./record-trigger":17}],13:[function(require,module,exports){
var RecordCreated, RecordTrigger, utils,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

utils = require('../lib/utils');

RecordTrigger = require('./record-trigger');

module.exports = RecordCreated = (function(_super) {
  __extends(RecordCreated, _super);

  function RecordCreated() {
    return RecordCreated.__super__.constructor.apply(this, arguments);
  }

  RecordCreated.prototype.shouldProcess = function() {
    return RecordCreated.__super__.shouldProcess.call(this) && this.type === 'record.create';
  };

  return RecordCreated;

})(RecordTrigger);



},{"../lib/utils":1,"./record-trigger":17}],14:[function(require,module,exports){
var RecordDeleted, RecordTrigger, utils,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

utils = require('../lib/utils');

RecordTrigger = require('./record-trigger');

module.exports = RecordDeleted = (function(_super) {
  __extends(RecordDeleted, _super);

  function RecordDeleted() {
    return RecordDeleted.__super__.constructor.apply(this, arguments);
  }

  RecordDeleted.prototype.shouldProcess = function() {
    return RecordDeleted.__super__.shouldProcess.call(this) && this.type === 'record.delete';
  };

  return RecordDeleted;

})(RecordTrigger);



},{"../lib/utils":1,"./record-trigger":17}],15:[function(require,module,exports){
var RecordProjectChanged, RecordTrigger, utils,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

utils = require('../lib/utils');

RecordTrigger = require('./record-trigger');

module.exports = RecordProjectChanged = (function(_super) {
  __extends(RecordProjectChanged, _super);

  function RecordProjectChanged() {
    return RecordProjectChanged.__super__.constructor.apply(this, arguments);
  }

  RecordProjectChanged.prototype.shouldProcess = function() {
    return RecordProjectChanged.__super__.shouldProcess.call(this) && this.isntDeleted() && this.currentProject() !== this.previousProject();
  };

  RecordProjectChanged.prototype.isntDeleted = function() {
    return this.type !== 'record.delete';
  };

  RecordProjectChanged.prototype.currentProject = function() {
    return this.data.project_id;
  };

  RecordProjectChanged.prototype.previousProject = function() {
    if (this.data.version === 1) {
      return null;
    }
    return utils.fetchPreviousRecordVersion(this.data, this.token).project_id;
  };

  return RecordProjectChanged;

})(RecordTrigger);



},{"../lib/utils":1,"./record-trigger":17}],16:[function(require,module,exports){
var RecordStatusChanged, RecordTrigger, utils,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

utils = require('../lib/utils');

RecordTrigger = require('./record-trigger');

module.exports = RecordStatusChanged = (function(_super) {
  __extends(RecordStatusChanged, _super);

  function RecordStatusChanged() {
    return RecordStatusChanged.__super__.constructor.apply(this, arguments);
  }

  RecordStatusChanged.prototype.shouldProcess = function() {
    return RecordStatusChanged.__super__.shouldProcess.call(this) && this.isntDeleted() && this.currentStatus() !== this.previousStatus();
  };

  RecordStatusChanged.prototype.isntDeleted = function() {
    return this.type !== 'record.delete';
  };

  RecordStatusChanged.prototype.currentStatus = function() {
    return this.data.status;
  };

  RecordStatusChanged.prototype.previousStatus = function() {
    if (this.data.version === 1) {
      return null;
    }
    return utils.fetchPreviousRecordVersion(this.data, this.token).status;
  };

  return RecordStatusChanged;

})(RecordTrigger);



},{"../lib/utils":1,"./record-trigger":17}],17:[function(require,module,exports){
var RecordTrigger, Trigger, utils,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

utils = require('../lib/utils');

Trigger = require('./trigger');

module.exports = RecordTrigger = (function(_super) {
  __extends(RecordTrigger, _super);

  function RecordTrigger() {
    return RecordTrigger.__super__.constructor.apply(this, arguments);
  }

  RecordTrigger.prototype.shouldProcess = function() {
    return this.data.form_id === this.trigger_fields.app;
  };

  RecordTrigger.prototype.setup = function() {};

  RecordTrigger.prototype.fetchForm = function() {
    if (this.form) {
      return this.form;
    }
    this.form || (this.form = utils.fetchForm(this.data.form_id, this.token));
    this.elements = utils.flattenElements(this.form.elements);
    return this.form;
  };

  RecordTrigger.prototype.run = function() {
    this.fetchForm();
    this.output = {};
    this.output.event_type = (function() {
      switch (this.type) {
        case 'record.create':
          return 'Create';
        case 'record.update':
          return 'Update';
        case 'record.delete':
          return 'Delete';
      }
    }).call(this);
    return this.result(this.output);
  };

  RecordTrigger.prototype.result = function() {
    return utils.makeRecord(this.form, this.elements, this.data, this.token, this.output);
  };

  return RecordTrigger;

})(Trigger);



},{"../lib/utils":1,"./trigger":19}],18:[function(require,module,exports){
var RecordTrigger, RecordUpdated, utils,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

utils = require('../lib/utils');

RecordTrigger = require('./record-trigger');

module.exports = RecordUpdated = (function(_super) {
  __extends(RecordUpdated, _super);

  function RecordUpdated() {
    return RecordUpdated.__super__.constructor.apply(this, arguments);
  }

  RecordUpdated.prototype.shouldProcess = function() {
    return RecordUpdated.__super__.shouldProcess.call(this) && this.type === 'record.update';
  };

  return RecordUpdated;

})(RecordTrigger);



},{"../lib/utils":1,"./record-trigger":17}],19:[function(require,module,exports){
var Trigger;

module.exports = Trigger = (function() {
  function Trigger() {}

  Trigger.prototype.skip = [];

  Trigger.prototype.shouldProcess = function() {
    return true;
  };

  Trigger.prototype.process = function(bundle) {
    this.bundle = bundle;
    this.token = this.bundle.auth_fields.api_key;
    this.trigger_fields = this.bundle.trigger_fields;
    this.json = JSON.parse(this.bundle.request.content);
    this.data = this.json.data;
    this.type = this.json.type;
    if (!this.shouldProcess()) {
      return this.skip;
    }
    this.setup();
    return this.run();
  };

  Trigger.prototype.setup = function() {};

  return Trigger;

})();



},{}],20:[function(require,module,exports){
var processPostPollBundle, scope, triggers, utils;

triggers = require('./triggers');

utils = require('./lib/utils');

scope = new Function('return this')();

processPostPollBundle = function(bundle) {
  var elements, form, results;
  results = JSON.parse(bundle.response.content).records;
  if (results.length < 1) {
    return [];
  }
  form = utils.fetchForm(results[0].form_id, bundle.auth_fields.api_key);
  elements = utils.flattenElements(form.elements);
  return utils.makeRecords(form, elements, results, bundle.auth_fields.api_key);
};

scope.Zap = {
  record_changed_catch_hook: function(bundle) {
    return triggers.process('RecordChanged', bundle);
  },
  record_created_catch_hook: function(bundle) {
    return triggers.process('RecordCreated', bundle);
  },
  record_updated_catch_hook: function(bundle) {
    return triggers.process('RecordUpdated', bundle);
  },
  record_deleted_catch_hook: function(bundle) {
    return triggers.process('RecordDeleted', bundle);
  },
  record_assigned_catch_hook: function(bundle) {
    return triggers.process('RecordAssigned', bundle);
  },
  record_project_changed_catch_hook: function(bundle) {
    return triggers.process('RecordProjectChanged', bundle);
  },
  record_status_changed_catch_hook: function(bundle) {
    return triggers.process('RecordStatusChanged', bundle);
  },
  record_changed_post_poll: processPostPollBundle,
  record_created_post_poll: processPostPollBundle,
  record_updated_post_poll: processPostPollBundle,
  record_deleted_post_poll: processPostPollBundle,
  record_assigned_post_poll: processPostPollBundle,
  record_project_changed_post_poll: processPostPollBundle,
  record_status_changed_post_poll: processPostPollBundle,
  app_post_poll: function(bundle) {
    var forms;
    forms = JSON.parse(bundle.response.content).forms;
    return _.sortBy(forms, 'name');
  }
};

module.exports = scope.Zap;



},{"./lib/utils":1,"./triggers":10}],21:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}]},{},[20]);
