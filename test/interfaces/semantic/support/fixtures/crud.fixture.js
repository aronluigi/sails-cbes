/**
 * Dependencies
 */

var Waterline = require('waterline');

module.exports = Waterline.Collection.extend({
    identity: 'user',
    tableName: 'userTable',
    connection: 'semantic',

    attributes: {
        firstName: 'string',
        lastName: 'string',
        email: {
            type: 'string',
            defaultsTo: 'e@test.com'
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
        list: 'array',
        obj: 'json',
        fullName: function () {
            return this.firstName + ' ' + this.lastName;
        }
    },

    mapping: {
        "_all": {
            "enabled": false
        },
        firstName: {
            type: 'string',
            analyzer: 'whitespace',
            fields: {
                raw: {
                    type: 'string',
                    index: 'not_analyzed'
                }
            }
        },
        lastName: {
            type: 'string',
            analyzer: 'whitespace'
        },
        email: {
            type: 'string',
            analyzer: 'standard'
        },
        avatar: {
            type: 'binary'
        },
        title: {
            type: 'string',
            analyzer: 'whitespace',
        },
        phone: {
            type: 'string',
            analyzer: 'keyword'
        },
        type: {
            type: 'string',
            analyzer: 'keyword'
        },
        favoriteFruit: {
            type: 'string',
            analyzer: 'whitespace'
        },
        age: {
            type: 'integer',
            index: 'not_analyzed'
        },
        createdAt: {
            type: 'date',
            format: 'dateOptionalTime'
        },
        updatedAt: {
            type: 'date',
            format: 'dateOptionalTime'
        },
        status: {
            type: 'boolean'
        },
        percent: {
            type: 'float'
        },
        obj: {
            type: 'object'
        }
    }
});
