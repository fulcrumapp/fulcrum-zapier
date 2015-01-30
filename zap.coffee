triggers = require './triggers'
utils = require './lib/utils'

scope = (new Function('return this')())

processPostPollBundle = (bundle) ->
  results = JSON.parse(bundle.response.content).records

  return [] if results.length < 1

  form = utils.fetchForm(results[0].form_id, bundle.auth_fields.api_key)

  elements = utils.flattenElements(form.elements)

  utils.makeRecords(form, elements, results)

scope.Zap =
  record_changed_catch_hook: (bundle) ->
    return triggers.process('RecordChanged', bundle)

  record_created_catch_hook: (bundle) ->
    return triggers.process('RecordCreated', bundle)

  record_updated_catch_hook: (bundle) ->
    return triggers.process('RecordUpdated', bundle)

  record_deleted_catch_hook: (bundle) ->
    return triggers.process('RecordDeleted', bundle)

  record_assigned_catch_hook: (bundle) ->
    return triggers.process('RecordAssigned', bundle)

  record_project_changed_catch_hook: (bundle) ->
    return triggers.process('RecordProjectChanged', bundle)

  record_status_changed_catch_hook: (bundle) ->
    return triggers.process('RecordStatusChanged', bundle)

  record_changed_post_poll: processPostPollBundle

  record_created_post_poll: processPostPollBundle

  record_updated_post_poll: processPostPollBundle

  record_deleted_post_poll: processPostPollBundle

  record_assigned_post_poll: processPostPollBundle

  record_project_changed_post_poll: processPostPollBundle

  record_status_changed_post_poll: processPostPollBundle

  app_post_poll: (bundle) ->
    JSON.parse(bundle.response.content).forms

module.exports = scope.Zap
