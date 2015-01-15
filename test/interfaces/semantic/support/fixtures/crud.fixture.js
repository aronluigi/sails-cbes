/**
 * Dependencies
 */

var Waterline = require('waterline');

module.exports = Waterline.Collection.extend({

  identity: 'user',
  tableName: 'userTable',
  connection: 'semantic',

  attributes: {
    first_name: 'string',
    last_name: 'string',
    email: {
      type: 'string',
      columnName: 'emailAddress'
    },
    avatar: 'binary',
    title: 'string',
    phone: 'string',
    type: 'string',
    favoriteFruit: {
      defaultsTo: 'blueberry',
      type: 'string'
    },
    age: 'integer', // integer field that's not auto-incrementable
    dob: 'datetime',
    status: {
      type: 'boolean',
      defaultsTo: false
    },
    percent: 'float',
    list: {
      type: 'array',
      columnName: 'arrList'
    },
    obj: 'json',
    fullName: function() {
      return this.first_name + ' ' + this.last_name;
    }
  },
    mapping: {
        first_name: {
            type: 'string'
        },
        last_name: {
            type: 'string'
        },
        email: {
            type: 'string'
        },
        avatar: {
            type: 'binary'
        },
        title: {
            type: 'string'
        },
        phone: {
            type: 'string'
        },
        type: {
            type: 'string'
        },
        favoriteFruit: {
            type: 'string'
        },
        age: {
            type: 'int'
        }, // integer field that's not auto-incrementable
        dob: {
            type: 'date'
        },
        status: {
            type: 'bool'
        },
        percent: {
            type: 'float'
        },
        obj: {
            type: 'object'
        }
    }

});
