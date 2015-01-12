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


var Collection = module.exports = function Collection(definition, key, view, connection) {
    var self = this,
        collectionDef = _.cloneDeep(definition);
    this.schema = collectionDef.definition;

    /**
     *  Create the Couchbase view for the given model
     */

    this.collectionName = key;

    if (typeof view.views == 'undefined'){
        view.views = {};
    }

    var name = key.replace("model", "")
        .replace("category", "")
        .replace("udk", "")
        .replace("collection", "");
    view.views[name] = {
        map: "function (doc, meta) {" +
        "if(doc.TYPE && doc.TYPE == '" + name + "') {" +
        "emit(meta.id, doc);" +
        "}" +
        "}"
    };

    return this;
};
