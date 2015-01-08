utils = require '../lib/utils'

RecordTrigger = require './record-trigger'

module.exports = class RecordStatusChanged extends RecordTrigger
  shouldProcess: ->
    super() and @isntDeleted() and @currentStatus() isnt @previousStatus()

  isntDeleted: ->
    @type isnt 'record.delete'

  currentStatus: ->
    @data.status

  previousStatus: ->
    return null if @data.version is 1

    utils.fetchPreviousRecordVersion(@data, @token).status
