const _ = require('lodash');

const performList = (z, bundle) => {
  return z.request({
    url: 'https://api.fulcrumapp.com/api/v2/forms.json'
  }).then(response => {
    return _.map(response.data.forms, form => {
      return {
        id: form.id,
        name: form.name
      };
    });
  });
};

module.exports = {
  key: 'app',
  noun: 'App',
  list: {
    display: {
      label: 'New App',
      description: 'Trigger when a new App is created in your account.',
      hidden: true
    },
    operation: {
      perform: performList,
      sample: {
        forms: [
          {
            image_large:
              'https://fulcrumapp.s3.amazonaws.com/form-images/large_5035119aa9344825c5001e91-24f08356-d567-48c9-880f-3e51f8147b7c.png',
            record_count: 161,
            name: 'OpenStreetView',
            created_at: '2012-08-22T17:06:34Z',
            image_small:
              'https://fulcrumapp.s3.amazonaws.com/form-images/small_5035119aa9344825c5001e91-24f08356-d567-48c9-880f-3e51f8147b7c.png',
            updated_at: '2014-08-15T20:42:36Z',
            id: '5035119aa9344825c5001e91',
            bounding_box: [
              27.791837,
              -84.248931,
              40.8093708660834,
              -73.2166399341758,
            ],
            elements: [
              {
                required: false,
                data_name: 'pictures',
                label: 'Pictures',
                disabled: false,
                key: '256d535f-aa2d-885e-4d10-1b180ea73b50',
                hidden: false,
                type: 'PhotoField',
              },
              {
                default_value: 'Untouched',
                required: false,
                multiple: false,
                data_name: 'status',
                allow_other: false,
                label: 'Status',
                disabled: false,
                key: '234dfcb9-ba57-2935-18f8-49750f4bace9',
                hidden: false,
                choices: [
                  { value: 'Digitized', label: 'Digitized' },
                  { value: 'Partially digitized', label: 'Partially digitized' },
                  { value: 'Untouched', label: 'Untouched' },
                ],
                type: 'ChoiceField',
              },
            ],
            image_thumbnail:
              'https://fulcrumapp.s3.amazonaws.com/form-images/thumb_5035119aa9344825c5001e91-24f08356-d567-48c9-880f-3e51f8147b7c.png',
            auto_assign: false,
            status_field: {},
            image:
              'https://fulcrumapp.s3.amazonaws.com/form-images/5035119aa9344825c5001e91-24f08356-d567-48c9-880f-3e51f8147b7c.png',
            description: 'Streetside pictures for OSM field verification.',
          },
        ],
        total_count: 1,
        current_page: 1,
        total_pages: 1,
        per_page: 20000,
      }
    }
  }
};