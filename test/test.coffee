if typeof(_) is 'undefined'
  global._ = require 'underscore'

if typeof($) is 'undefined'
  global.$ = require 'jquery'

process.env.test = 'test'

fs = require 'fs'
path = require 'path'
zap = require '../zap'
utils = require '../lib/utils'

formID = 'e5602f5a-9045-4621-b438-164d48c5dc0e'
token = ''

payload = JSON.parse(fs.readFileSync(path.join(__dirname, '/fixtures/payload.json')))

bundle =
  request:
    content: JSON.stringify(payload)
  response:
    content: JSON.stringify(records: [payload.data])
  trigger_fields:
    form: formID
  auth_fields:
    api_key: token

fixtures =
  'https://api.fulcrumapp.com/api/v2/forms/e5602f5a-9045-4621-b438-164d48c5dc0e.json':
    JSON.parse(fs.readFileSync(path.join(__dirname, "/fixtures/payload-form.json")))
  'https://api.fulcrumapp.com/api/v2/memberships.json?skip_associations=true':
    JSON.parse(fs.readFileSync(path.join(__dirname, "/fixtures/payload-memberships.json")))


utils.fetchPreviousRecordVersion = (data, token) ->
  payload.data

utils.request = (url, token) ->
  fixtures[url]

bundleFor = (event) ->
  eventPayload = fs.readFileSync(path.join(__dirname, "/fixtures/payload-#{event}.json")).toString()

  bundle.request.content = eventPayload
  bundle.response.content = JSON.stringify(records: [JSON.parse(eventPayload).data])
  bundle

shouldBeNull = (value) ->
  (value is null).should.be.true

shouldHaveNoValue = (value) ->
  (value is NO_VALUE).should.be.true

shouldBeUndefined = (value) ->
  (value is undefined).should.be.true

describe 'Status Change Event', ->
  it 'detects a changed status when the status changes', ->
    result = Zap.record_status_changed_catch_hook(bundleFor('status-change'))
    result.should.not.eql([])

  it 'does not detect a changed status when the status does not change', ->
    result = Zap.record_status_changed_catch_hook(bundleFor('no-change'))
    result.should.eql([])

describe 'Assignment Change Event', ->
  it 'detects a changed assignment when the assignment changes', ->
    result = Zap.record_assigned_catch_hook(bundleFor('assigned'))
    result.should.not.eql([])

  it 'does not detect a changed assignment when the assignment does not change', ->
    result = Zap.record_assigned_catch_hook(bundleFor('no-change'))
    result.should.eql([])

  it 'does not detect a changed assignment when the assignment changes to blank', ->
    result = Zap.record_assigned_catch_hook(bundleFor('unassigned'))
    result.should.eql([])
