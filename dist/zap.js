(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Utils, trim;

trim = function(value) {
  return value.replace(/^\s+|\s+$/gm, '');
};

Utils = (function() {
  function Utils() {}

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
    var data, params, response;
    params = {
      method: 'GET',
      url: url,
      auth: null,
      headers: {
        'X-ApiToken': token
      }
    };
    response = z.request(params);
    data = response.content;
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
    return this.makeValue([element.data_name], [value.signature_id]);
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



},{}],2:[function(require,module,exports){
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



},{"./record-assigned":3,"./record-changed":4,"./record-created":5,"./record-deleted":6,"./record-project-changed":7,"./record-status-changed":8,"./record-updated":10}],3:[function(require,module,exports){
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



},{"../lib/utils":1,"./record-trigger":9}],4:[function(require,module,exports){
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



},{"../lib/utils":1,"./record-trigger":9}],5:[function(require,module,exports){
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



},{"../lib/utils":1,"./record-trigger":9}],6:[function(require,module,exports){
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



},{"../lib/utils":1,"./record-trigger":9}],7:[function(require,module,exports){
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



},{"../lib/utils":1,"./record-trigger":9}],8:[function(require,module,exports){
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



},{"../lib/utils":1,"./record-trigger":9}],9:[function(require,module,exports){
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



},{"../lib/utils":1,"./trigger":11}],10:[function(require,module,exports){
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



},{"../lib/utils":1,"./record-trigger":9}],11:[function(require,module,exports){
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



},{}],12:[function(require,module,exports){
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



},{"./lib/utils":1,"./triggers":2}]},{},[12]);
