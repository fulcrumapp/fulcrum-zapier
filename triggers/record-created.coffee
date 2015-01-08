utils = require '../lib/utils'

RecordTrigger = require './record-trigger'

module.exports = class RecordCreated extends RecordTrigger
  shouldProcess: ->
    super() and @type is 'record.create'
