utils = require '../lib/utils'
Trigger = require './trigger'

module.exports = class RecordTrigger extends Trigger
  shouldProcess: ->
    @data.form_id is @trigger_fields.form

  setup: ->

  fetchForm: ->
    return @form if @form

    @form ||= utils.fetchForm(@data.form_id, @token)

    @elements = utils.flattenElements(@form.elements)

    @form

  run: ->
    @fetchForm()

    @output = {}

    @output.event_type = switch @type
      when 'record.create' then 'Create'
      when 'record.update' then 'Update'
      when 'record.delete' then 'Delete'

    @result(@output)

  result: ->
    utils.makeRecord(@form, @elements, @data, @output)
