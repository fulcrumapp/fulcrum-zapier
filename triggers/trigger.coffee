
module.exports = class Trigger
  skip: []

  shouldProcess: ->
    true

  process: (bundle) ->
    @bundle = bundle
    @token = @bundle.auth_fields.api_key
    @trigger_fields = @bundle.trigger_fields

    @json = JSON.parse(@bundle.request.content)

    @data = @json.data
    @type = @json.type

    return @skip unless @shouldProcess()

    @setup()

    @run()

  setup: ->
