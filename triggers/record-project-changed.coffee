utils = require '../lib/utils'

RecordTrigger = require './record-trigger'

module.exports = class RecordProjectChanged extends RecordTrigger
  shouldProcess: ->
    super() and @isntDeleted() and @currentProject() isnt @previousProject()

  isntDeleted: ->
    @type isnt 'record.delete'

  currentProject: ->
    @data.project_id

  previousProject: ->
    return null if @data.version is 1

    utils.fetchPreviousRecordVersion(@data, @token).project_id
