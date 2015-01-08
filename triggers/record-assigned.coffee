utils = require '../lib/utils'

RecordTrigger = require './record-trigger'

module.exports = class RecordAssigned extends RecordTrigger
  shouldProcess: ->
    super() and @isntDeleted() and @currentAssignment() and (@currentAssignment() isnt @previousAssignment())

  isntDeleted: ->
    @type isnt 'record.delete'

  currentAssignment: ->
    @data.assigned_to_id

  previousAssignment: ->
    return null if @data.version is 1

    utils.fetchPreviousRecordVersion(@data, @token).assigned_to_id

  # add `assigned_to_email` so it can be used in the output
  result: ->
    if @data.assigned_to_id
      @data.assigned_to_email = utils.fetchUserEmail(@data.assigned_to_id, @token)

    super()
