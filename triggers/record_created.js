const perform = (z, bundle) => {
  // TODO
};

module.exports = {
  key: 'record_created',
  noun: 'Record',
  display: {
    label: 'Record Created',
    description: 'Triggers when a new record is created.',
    directions: 'Log into Fulcrum and paste the below URL into the webhook setup field.',
    important: true,
    hidden: false,
  },
  operation: {
    type: 'hook',
    perform: perform,
    inputFields: [
      {
        key: 'app',
        label: 'App',
        helpText: 'Select an App.',
        type: 'string',
        required: true,
        dynamic: 'app.id.name',
      },
    ],
    outputFields: [
      { key: 'altitude', type: 'string' },
      { key: 'assigned_to', type: 'string' },
      { key: 'created_at', type: 'string' },
      { key: 'created_by', type: 'string' },
      { key: 'device_created_at', type: 'string' },
      { key: 'device_updated_at', type: 'string' },
      { key: 'horizontal_accuracy', type: 'integer' },
      { key: 'id', type: 'string' },
      { key: 'latitude', type: 'string' },
      { key: 'longitude', type: 'string' },
      { key: 'status', type: 'string' },
      { key: 'updated_at', type: 'string' },
      { key: 'updated_by', type: 'string' },
      { key: 'version', type: 'integer' },
    ],
    sample: {
      status: 'Complete',
      updated_by: 'test@example.com',
      horizontal_accuracy: 5,
      created_at: '2015-01-07 02:27:33 UTC',
      altitude: 11.257470460529,
      updated_at: '2015-01-07 02:27:33 UTC',
      created_by: 'test@example.com',
      device_updated_at: '2015-01-07 02:26:54 UTC',
      longitude: -82.6910411194737,
      version: 1,
      latitude: 27.8223296860492,
      device_created_at: '2015-01-04 23:56:13 UTC',
      id: 'f286cbe2-25da-470c-aa64-c349334f156f',
    },
  },
};
