/**
 * Created by Luigi Ilie Aron on 27.01.15.
 * email: luigi@kreditech.com
 */
'use strict';
var couchbase = require('couchbase'),
    elasticSearch = require('elasticsearch'),
    _ = require('lodash');

/**
 * Manage a connection to a CB & ES Server
 *
 * @param {Object} config
 * @return {Object}
 * @api private
 */
var Connection = module.exports = function Connection(config, collections, cb) {
    var self = this;
    // Hold the config object
    this.config = config || {};

    // Build Database connection
    this._buildConnection(collections, function (err, db) {
        if (err) {
            return cb(err);
        }

        // Store the DB object
        self.db = db;

        // Return the connection
        cb(null, self);
    });
};

/////////////////////////////////////////////////////////////////////////////////
// PRIVATE METHODS
/////////////////////////////////////////////////////////////////////////////////

/**
 * @param view
 * @param callback
 * @private
 */
Connection.prototype._initCouchBase = function(view, callback){
    var self = this,
        config = self.config.cb,
        cb = new couchbase.Cluster('couchbase://' + config.host, config.user, config.pass),
        bucket = cb.openBucket(config.bucket.name, config.bucket.pass);

    bucket.operationTimeout = config.operationTimeout;
    var manager = bucket.manager();

    manager.upsertDesignDocument(config.bucket.name, view, function(err, res){
        if (err) {
            return callback(err, false);
        }

        callback(false, bucket);
    });
};

/**
 * @param allMappings
 * @param callback
 * @private
 */
Connection.prototype._initElasticSearch = function(allMappings, callback){
    var self = this,
        config = self.config.es,
        es = new elasticSearch.Client({host: config.host, log: config.log});

    /**
     * @param mapping
     * @param callback
     */
    function putMapping(mapping, callback){
        es.indices.putMapping(mapping, function(err){
            if (err) {
                return callback(err, false);
            }

            return callback(false, es);
        });
    }

    var clusterSettings = {
        "body": {
            "transient": {
                "indices.ttl.interval" : config.ttlInterval
            }
        }
    };

    es.cluster.putSettings(clusterSettings, function(err, res){
        if (err) throw new Error(err);
    });

    es.indices.exists({index: config.index}, function(err, res, stat){
        if (err) {
            return callback(err, false);
        }

        if (res === false) {
            var params = {
                index: config.index,
                body: {
                    settings: {
                        number_of_shards: config.numberOfShards,
                        number_of_replicas: config.numberOfReplicas
                    }
                }
            };

            return es.indices.create(params, function(err, response, status){
                if (err) {
                    return callback(err, false);
                }

                for (var key in allMappings) {
                    putMapping(allMappings[key], function(err){
                        if (err) {
                            throw new Error(err);
                        }
                    });
                }

                /** sleep 5s untill elastic search updates the mappings **/
                setTimeout(function(){
                    callback(false, es);
                }, 5000);
            });
        }

        callback(false, es);
    });
};

/**
 * Build Server and Database Connection Objects
 *
 * @param {Function} cb
 * @api private
 */
Connection.prototype._buildConnection = function _buildConnection(collections, cb) {
    var self = this,
        i = 0,
        view = {},
        mappings = [];

    var mapping = {
        index: self.config.es.index,
        type: null,
        body: {
            properties: {}
        }
    };

    view.views = {};
    view.options = {
        updateInterval         : 2500,
        updateMinChanges       : 1,
        replicaUpdateMinChanges: 1
    };

    view.views['rawBucket'] = {
        map: "function (doc, meta) {" +
            "emit(meta.id, {doc: doc, meta: meta});" +
        "}"
    };

    Object.keys(collections).forEach(function(key){
        var name = key.replace("model", "");
        view.views[name] = {
            map: "function (doc, meta) {" +
                "if(doc._TYPE && doc._TYPE == '" + name + "') {" +
                    "emit(meta.id, {doc: doc, meta: meta});" +
                "}" +
            "}"
        };

        if (typeof collections[key].mapping == 'object') {
            var _tmp = _.cloneDeep(mapping);
            _tmp.type = name;
            _tmp.body.properties = collections[key].mapping;
            _tmp.body.properties._TYPE = {type: 'string', analyzer: 'keyword'};
            _tmp.body.properties.id = {type: 'integer', analyzer: 'standard'};
            _tmp.body.properties.createdAt = {type: 'date', format: 'dateOptionalTime'};
            _tmp.body.properties.updatedAt = {type: 'date', format: 'dateOptionalTime'};

            if ('_ttl' in collections[key].attributes &&
                collections[key].attributes._ttl.hasOwnProperty('defaultsTo') &&
                collections[key].attributes._ttl.defaultsTo == 'number')
            {
                _tmp.body._ttl = {
                    "enabled": true,
                    "default": collections[key].attributes._ttl.defaultsTo
                };
            }

            mappings.push(_tmp);
        }

        i++;
        if (Object.keys(collections).length == i) {
            self._initCouchBase(view, function(err, bucket){
                if (err) {
                    return cb(err, false);
                }

                self._initElasticSearch(mappings, function(err, es){
                    if (err) {
                        return cb(err, false);
                    }

                    cb(false, {cb: bucket, es: es});
                });
            });
        }
    });
};
