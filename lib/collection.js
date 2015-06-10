/**
 * Created by Luigi Ilie Aron on 27.01.15.
 * email: luigi@kreditech.com
 */
'use strict';
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
