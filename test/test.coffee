if typeof(_) is 'undefined'
  global._ = require 'underscore'

if typeof($) is 'undefined'
  global.$ = require 'jquery'

process.env.test = 'test'

fs = require 'fs'
zap = require '../zap'
utils = require '../lib/utils'

formID = ''
token = ''

payload = JSON.parse(fs.readFileSync(__dirname + '/payload.json'))

bundle =
  request:
    content: JSON.stringify(payload)
  response:
    content: JSON.stringify(records: [payload.data])
  trigger_fields:
    form: formID
  auth_fields:
    api_key: token

shouldBeNull = (value) ->
  (value is null).should.be.true

shouldHaveNoValue = (value) ->
  (value is NO_VALUE).should.be.true

shouldBeUndefined = (value) ->
  (value is undefined).should.be.true

describe 'Changed Record', ->
  it 'detects a changed record', ->
    result = Zap.record_status_changed_catch_hook(bundle)
    result.should.not.eql([])
