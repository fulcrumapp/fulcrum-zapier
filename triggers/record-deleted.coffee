utils = require '../lib/utils'

RecordTrigger = require './record-trigger'

module.exports = class RecordDeleted extends RecordTrigger
  shouldProcess: ->
    super() and @type is 'record.delete'
