/**
 * Dependencies
 */

var Waterline = require('waterline');

module.exports = Waterline.Collection.extend({
    identity: 'unique',
    tableName: 'uniqueTable',
    connection: 'semantic',

    attributes: {
        firstName: 'string',
        lastName: {
            type: 'string',
            unique: true
        },
        email: {
            type: 'string',
            defaultsTo: 'e@test.com',
            unique: true
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
            analyzer: 'keyword'
        }
    }
});
