utils = require '../lib/utils'

RecordTrigger = require './record-trigger'

module.exports = class RecordUpdated extends RecordTrigger
  shouldProcess: ->
    super() and @type is 'record.update'
