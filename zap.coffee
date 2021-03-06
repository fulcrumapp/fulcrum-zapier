trim = (value) ->
  value.replace(/^\s+|\s+$/gm,'')

class Utils
  API: 'https://api.fulcrumapp.com/api/v2'

  flattenElements: (elements) ->
    _.tap [], (flat) =>
      _.each elements, (element) =>
        flat.push(element)

        if element.type is 'Section'
          children = @flattenElements(element.elements)

          Array::push.apply(flat, children)

  pushArray: (array, values) ->
    Array::push.apply(array, values)

  request: (url, token) ->
    params =
      method: 'GET'
      url: url
      auth: null
      headers: { 'X-ApiToken': token }

    response = z.request(params)
    data = response.content

    JSON.parse(data)

  addressValue: (value) ->
    num     = value?.sub_thoroughfare or ''
    street  = value?.thoroughfare or ''
    city    = value?.locality or ''
    county  = value?.sub_admin_area or ''
    state   = value?.admin_area or ''
    zip     = value?.postal_code or ''
    suite   = value?.suite or ''
    country = value?.country or ''

    lines = []
    lines.push(trim("#{num} #{street} #{suite}"))
    lines.push(trim("#{_.compact([city, state]).join(', ')} #{zip}"))
    lines.push(trim("#{county}"))
    lines.push(trim("#{country}"))

    _.filter(_.compact(lines), (v) -> not _.isEmpty(trim(v or ''))).join("\n")

  fetchResource: (resourceName, id, token) ->
    url = "#{@API}/#{resourceName}/#{id}.json"

    @request(url, token)

  fetchForm: (formID, token) ->
    form = @fetchResource('forms', formID, token).form
    @fetchFormDependencies(form, token)
    form

  fetchPreviousRecordVersion: (record, token) ->
    @fetchRecordHistoryVersion(record.id, record.version - 1, token)

  fetchRecordHistoryVersion: (recordID, version, token) ->
    url = "#{@API}/records/history.json?record_id=#{recordID}&version=#{version}"

    _.find @request(url, token).records, (record) -> record.version is version

  fetchMemberships: (token) ->
    return @memberships if @memberships

    url = "#{@API}/memberships.json?skip_associations=true"

    @memberships = @request(url, token).memberships

  fetchFormDependencies: (form, token) ->
    hasChoiceList = _.find @flattenElements(form.elements), (element) ->
      element.type is 'ChoiceField' and element.choice_list_id?

    @fetchChoiceLists(token) if hasChoiceList

  fetchChoiceLists: (token) ->
    return @choiceLists if @choiceLists

    url = "#{@API}/choice_lists.json"

    @choiceLists = @request(url, token).choice_lists

    @choiceListsMap = {}

    _.each @choiceLists, (list) =>
      @choiceListsMap[list.id] = list

    @choiceLists

  fetchUserEmail: (user_id, token) ->
    return null unless user_id

    @fetchMemberships(token)

    user = _.find @memberships, (user) -> user.user_id is user_id

    if user then user.email else null

  choiceLabel: (element, value) ->
    choices = if element.choice_list_id
      @choiceListsMap[element.choice_list_id]?.choices or []
    else
      element.choices

    labels = []

    if value.choice_values
      valueLabels = _.map value.choice_values, (item) ->
        choice = _.find choices, (choice) -> choice.value is item

        if choice then choice.label or item

    @pushArray(labels, valueLabels)
    @pushArray(labels, value.other_values) if value.other_values

    _.compact(labels).join(', ')

  makeValues: (element, value) ->
    if _.isNull(value) or _.isUndefined(value)
      return @makeValue([element.data_name], [''])

    serializer = @["serialize_#{element.type}"]

    if serializer
      return serializer.call(@, element, value)

    @serialize_Default(element, value)

  makeValue: (keys, values) ->
    output = {}

    _.each keys, (key, index) ->
      output[key] = values[index]

    output

  makeRecords: (form, elements, records, token) ->
    _.map records, (record) =>
      @makeRecord(form, elements, record, token, event_type: 'Create')

  makeRecord: (form, elements, data, token, output) ->
    output ||= {}

    output.id = data.id
    output.form_id = data.form_id
    output.project_id = data.project_id
    output.status = data.status
    output.created_at = data.created_at
    output.updated_at = data.updated_at
    output.device_created_at = data.client_created_at
    output.device_updated_at = data.client_updated_at
    output.created_by = data.created_by
    output.updated_by = data.updated_by
    output.assigned_to = data.assigned_to
    output.latitude = data.latitude
    output.longitude = data.longitude
    output.altitude = data.altitude
    output.accuracy = data.horizontal_accuracy
    output.version = data.version

    if data.assigned_to_id
      output.assigned_to_email = @fetchUserEmail(data.assigned_to_id, token)
    else
      output.assigned_to_email = null

    if data.created_by_id
      output.created_by_email = @fetchUserEmail(data.created_by_id, token)
    else
      output.created_by_email = null

    if data.updated_by_id
      output.updated_by_email = @fetchUserEmail(data.updated_by_id, token)
    else
      output.updated_by_email = null

    _.each elements, (element) =>
      values = @makeValues(element, data.form_values[element.key])

      for key of values
        output[key] = values[key]

    output

  serialize_ChoiceField: (element, value) ->
    choices = []

    @pushArray(choices, value.choice_values) if value.choice_values
    @pushArray(choices, value.other_values) if value.other_values

    keys = [element.data_name,
            element.data_name + '_label']

    values = [_.compact(choices).join(", "),
              @choiceLabel(element, value)]

    @makeValue(keys, values)

  serialize_ClassificationField: (element, value) ->
    @serialize_Choice(element, value)

  serialize_Repeatable: (element, value) ->
    @makeValue([element.data_name], ["Repeatable fields are not supported."])

  serialize_AddressField: (element, value) ->
    @makeValue([element.data_name], [@addressValue(value)])

  serialize_PhotoField: (element, value) ->
    photos = []
    captions = []

    _.each value, (photo) ->
      photos.push(photo.photo_id)
      captions.push(photo.caption or '')

    keys = [ element.data_name + '_id'
             element.data_name + '_captions'
             element.data_name + '_url' ]

    url = "https://web.fulcrumapp.com/photos/view?photos=" + photos.join(",")

    values = [ photos.join(", ")
               _.compact(captions).join(", ")
               url ]

    @makeValue(keys, values)

  serialize_VideoField: (element, value) ->
    videos = []
    captions = []

    _.each value, (video) ->
      videos.push(video.video_id)
      captions.push(video.caption or '')

    keys = [ element.data_name + '_id'
             element.data_name + '_captions'
             element.data_name + '_url' ]

    url = "https://web.fulcrumapp.com/videos/view?videos=" + videos.join(",")

    values = [ videos.join(", ")
               _.compact(captions).join(", ")
               url ]

    @makeValue(keys, values)

  serialize_SignatureField: (element, value) ->
    @makeValue([element.data_name], [value.signature_id])

  serialize_Choice: (element, value) ->
    choices = []

    @pushArray choices, value.choice_values if value.choice_values
    @pushArray choices, value.other_values if value.other_values

    @makeValue([element.data_name], [_.compact(choices).join(', ')])

  serialize_Default: (element, value) ->
    value = if value then value.toString() else ''
    @makeValue([element.data_name], [value])

utils = new Utils


class Trigger
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


class RecordTrigger extends Trigger
  shouldProcess: ->
    @data.form_id is @trigger_fields.app

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
    utils.makeRecord(@form, @elements, @data, @token, @output)

class RecordAssigned extends RecordTrigger
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

class RecordChanged extends RecordTrigger

class RecordCreated extends RecordTrigger
  shouldProcess: ->
    super() and @type is 'record.create'

class RecordDeleted extends RecordTrigger
  shouldProcess: ->
    super() and @type is 'record.delete'

class RecordProjectChanged extends RecordTrigger
  shouldProcess: ->
    super() and @isntDeleted() and @currentProject() isnt @previousProject()

  isntDeleted: ->
    @type isnt 'record.delete'

  currentProject: ->
    @data.project_id

  previousProject: ->
    return null if @data.version is 1

    utils.fetchPreviousRecordVersion(@data, @token).project_id

class RecordStatusChanged extends RecordTrigger
  shouldProcess: ->
    super() and @isntDeleted() and @currentStatus() isnt @previousStatus()

  isntDeleted: ->
    @type isnt 'record.delete'

  currentStatus: ->
    @data.status

  previousStatus: ->
    return null if @data.version is 1

    utils.fetchPreviousRecordVersion(@data, @token).status

class RecordUpdated extends RecordTrigger
  shouldProcess: ->
    super() and @type is 'record.update'

triggers =
  RecordChanged: RecordChanged
  RecordCreated: RecordCreated
  RecordDeleted: RecordDeleted
  RecordUpdated: RecordUpdated
  RecordAssigned: RecordAssigned
  RecordProjectChanged: RecordProjectChanged
  RecordStatusChanged: RecordStatusChanged

processTrigger = (event, bundle) ->
  (new triggers[event]).process(bundle)


processPostPollBundle = (bundle) ->
  results = JSON.parse(bundle.response.content).records

  return [] if results.length < 1

  form = utils.fetchForm(results[0].form_id, bundle.auth_fields.api_key)

  elements = utils.flattenElements(form.elements)

  utils.makeRecords(form, elements, results, bundle.auth_fields.api_key)

Zap =
  record_changed_catch_hook: (bundle) ->
    return processTrigger('RecordChanged', bundle)

  record_created_catch_hook: (bundle) ->
    return processTrigger('RecordCreated', bundle)

  record_updated_catch_hook: (bundle) ->
    return processTrigger('RecordUpdated', bundle)

  record_deleted_catch_hook: (bundle) ->
    return processTrigger('RecordDeleted', bundle)

  record_assigned_catch_hook: (bundle) ->
    return processTrigger('RecordAssigned', bundle)

  record_project_changed_catch_hook: (bundle) ->
    return processTrigger('RecordProjectChanged', bundle)

  record_status_changed_catch_hook: (bundle) ->
    return processTrigger('RecordStatusChanged', bundle)

  record_changed_post_poll: processPostPollBundle

  record_created_post_poll: processPostPollBundle

  record_updated_post_poll: processPostPollBundle

  record_deleted_post_poll: processPostPollBundle

  record_assigned_post_poll: processPostPollBundle

  record_project_changed_post_poll: processPostPollBundle

  record_status_changed_post_poll: processPostPollBundle

  app_post_poll: (bundle) ->
    forms = JSON.parse(bundle.response.content).forms
    _.sortBy forms, 'name'
