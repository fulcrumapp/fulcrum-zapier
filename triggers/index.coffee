triggers =
  RecordChanged: require './record-changed'
  RecordCreated: require './record-created'
  RecordDeleted: require './record-deleted'
  RecordUpdated: require './record-updated'
  RecordAssigned: require './record-assigned'
  RecordProjectChanged: require './record-project-changed'
  RecordStatusChanged: require './record-status-changed'

module.exports =
  process: (event, bundle) ->
    (new triggers[event]).process(bundle)
