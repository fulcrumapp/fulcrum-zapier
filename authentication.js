const testAuth = (z, bundle) => {
  return z.request({
    method: 'GET',
    url: 'https://api.fulcrumapp.com/api/v2/forms.json',
    params: {
      schema: false,
      page: 1,
      per_page: 1
    }
  }).then(response => {
    if (response.status === 401) {
      throw new z.errors.Error('The API Key you supplied is invalid', 'AuthenticationError', response.status);
    }
    return response;
  });
};

module.exports = {
  type: 'custom',
  test: testAuth,
  fields: [
    {
      key: 'api_key',
      label: 'API Key',
      helpText:
        'Go to **Settings** in your Fulcrum account and select **API Key** from the sidebar to find your key.',
      type: 'string',
      required: true,
    },
  ]
};
