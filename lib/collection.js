/**
 * Module dependencies
 */
var _ = require('lodash');

/**
 * Manage A Collection
 *
 * @param {Object} definition
 * @api public
 */
var Collection = module.exports = function Collection(definition, key, connection) {
    var collectionDef = _.cloneDeep(definition);
    this.schema = collectionDef.definition;
    this.collectionName = key;

    return this;
};
