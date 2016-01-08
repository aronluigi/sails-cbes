/**
 * Created by Luigi Ilie Aron on 27.01.15.
 * email: luigi@kreditech.com
 */
'use strict';
var Errors = require('waterline-errors').adapter,
    Connection = require('./connection'),
    Collection = require('./collection'),
    fs = require('fs'),
    util = require('util'),
    async = require('async'),
    _ = require('lodash');

module.exports = (function () {
    // Keep track of all the connections used by the app
    var connections = {},
        db = null;

    var adapter = {
        // Which type of primary key is used by default
        pkFormat: 'string',
        // to track schema internally
        syncable: true,
        identity: "waterline-cbes",
        schema: false,
        // Default configuration for connections
        defaults: {
            // couch base
            cb: {
                //Server
                version: '4.1.0',
                host: 'localhost',
                port: 8091,
                user: 'root',
                pass: 'root123',
                operationTimeout: 1000 * 10, // 10 seconds

                //bucket
                bucket: {
                    name: 'testCbes',
                    pass: ''
                }
            },
            // elastic search
            es: {
                host: ['192.168.33.10:9200'],
                log: 'error',
                version: '2.1',
                index: 'test_cbes',
                maxResultWindow: 999999999,
                numberOfShards: 5,
                numberOfReplicas: 1,
                requestTimeout: 30000,
                ttlInterval: 5000 //milliseconds
            }
        },

        /**
         * @param connection
         * @param collections
         * @param cb
         * @returns {*}
         */
        registerConnection: function (connection, collections, cb) {
            if (!connection.identity) { cb(Errors.IdentityMissing); return; }
            if (connections[connection.identity]) {
                cb(Errors.IdentityDuplicate);
                return;
            }

            // Store the connection
            connections[connection.identity] = {
                config: connection,
                collections: {}
            };

            // Create new connection
            new Connection(connection, collections,function(_err, connectionObject) {
                if (_err) {
                    cb((function _createError() {
                        var msg = util.format('Failed to connect to the Couchbase/ElasticSearch clients', util.inspect(_err, false, null));
                        var err = new Error(msg);
                        err.originalError = _err;
                        return err;
                    })());
                    return;
                }

                connections[connection.identity].connection = connectionObject;
                Object.keys(collections).forEach(function(key) {
                    connections[connection.identity].collections[key] = new Collection(collections[key], key, connectionObject);
                });

                cb();
            });
        },

        /**
         * Fired when a model is unregistered, typically when the server
         * is killed. Useful for tearing-down remaining open connections,
         * etc.
         *
         * @param  {Function} cb [description]
         * @return {[type]}      [description]
         */
        teardown: function (conn, cb) {
            if (typeof conn == 'function') {
                cb = conn;
                conn = null;
            }

            if (!conn) {
                connections = {};
                cb(); return;
            }

            if (!connections[conn]) {cb(); return;}

            delete connections[conn];
            cb();
        },

        describe: function (connection, collection, cb) {
            // Add in logic here to describe a collection (e.g. DESCRIBE TABLE logic)
            return cb();
        },

        /**
         *
         * REQUIRED method if integrating with a schemaful
         * (SQL-ish) database.
         *
         */
        define: function (connection, collection, definition, cb) {
            // Add in logic here to create a collection (e.g. CREATE TABLE logic)
            return cb();
        },

        /**
         *
         * REQUIRED method if integrating with a schemaful
         * (SQL-ish) database.
         *
         */
        drop: function (connection, collection, relations, cb) {
            // Add in logic here to delete a collection (e.g. DROP TABLE logic)
            return cb();
        },

        /**
         * @param connection
         * @param collection
         * @param options
         * @param callback
         */
        find: function (connection, collection, options, callback) {
            var db = require('./db')(connections[connection].connection);

            db.find(collection, options, function(err, res){
                if (err) {
                    callback(err, false);
                } else {
                    callback(null, res);
                }
            });
        },

        /**
         * @param connection
         * @param collection
         * @param values
         * @param callback
         */
        create: function (connection, collection, values, callback) {
            var db = require('./db')(connections[connection].connection),
                originalVals = _.cloneDeep(values),
                _values = [],
                schema = connections[connection].collections[collection].schema;

            if (!Array.isArray(values)) {
                values = [values];
            }

            var uniqueFields = (function() {
                var unique = [];

                for (var key in schema) {
                    val = schema[key];

                    if (val.hasOwnProperty("unique") && val["unique"] === true) {
                        if (key != "id") {
                            unique.push(key);
                        }
                    }
                }

                return unique;
            })();

            function create() {
                if (schema.hasOwnProperty('_ttl') &&
                    schema._ttl.hasOwnProperty('defaultsTo') &&
                    typeof schema._ttl.defaultsTo == 'number')
                {
                    if (val.hasOwnProperty('_ttl') && typeof val._ttl == 'number') {
                        _ttl = val._ttl;
                    } else {
                        _ttl = schema._ttl.defaultsTo;
                    }
                }

                db.create(collection, val, _ttl, function(err, _vals){
                    if (err){
                        callback(err, false); return;
                    }

                    _values.push(_vals);

                    if ((i + 1) == values.length) {
                        callback(null, Array.isArray(originalVals) ? _values : _values[i]);
                    }
                });
            }

            for (var i in values) {
                var _ttl = 0,
                    val = values[i];

                if (uniqueFields.length > 0) {
                    var _termData = [],
                        q = {where: {or: []}};

                    for (var j in uniqueFields) {
                        var _field = uniqueFields[j],
                            _term  = {term: {}};

                        if (val[_field] && val[_field] != "undefined" && val[_field] != "") {
                            _term.term[_field] = val[_field];
                            _termData.push(_term);
                        }
                    }

                    q.where.or = _termData;

                    db.find(collection, q, function(err, res){
                        if (err || (res.length > 0)) {
                            var eExists = "Unique field already exist!";
                            callback(err || new Error(eExists));
                            return;
                        }

                        create();
                    });
                } else {
                    create();
                }
            }
        },

        /**
         * @param connection
         * @param collection
         * @param options
         * @param values
         * @param callback
         */
        update: function (connection, collection, options, values, callback) {
            var db = require('./db')(connections[connection].connection);

            db.update(collection, options, values, function(err, res){
                if (err) {
                    callback(err, false);
                } else {
                    callback(null, res);
                }
            });
        },

        /**
         * @param connection
         * @param collection
         * @param options
         * @param callback
         */
        destroy: function (connection, collection, options, callback) {
            if (
                options &&
                typeof options == 'object' &&
                Object.keys(options).length == 1 &&
                options.hasOwnProperty('where') &&
                options.where instanceof Object &&
                options.where !== null &&
                Object.keys(options.where).length == 1 &&
                options.where.hasOwnProperty('id')
            ) {
                options.where = {
                    bool: {
                        must: [
                            {
                                term: {
                                    _id: options.where.id
                                }
                            }
                        ]
                    }
                };
            }

            var db = require('./db')(connections[connection].connection);
            db.destroy(collection, options, function(err, res){
                if (err) {
                    callback(err, false);
                } else {
                    callback(null, res);
                }
            });
        },

        /**
         * @param connection
         * @param collection
         * @param options
         * @param callback
         */
        count: function (connection, collection, options, callback) {
            var db = require('./db')(connections[connection].connection);
            db.count(collection, options, function(err, res){
                if (err) {
                    callback(err, false);
                } else {
                    callback(null, res);
                }
            });
        },

        /**
         * get raw data from couchbase view
         * @param connection
         * @param collection
         * @param callback
         */
        getRawCollection: function (connection, collection, callback) {
            var db = require('./db')(connections[connection].connection);

            db.getCollection(collection, function(err, res){
                if (err) {
                    callback(err, false);
                } else {
                    callback(null, res);
                }
            });
        },

        /**
         *
         * @param connection
         * @param collection
         * @param callback
         */
        reindex : function(connection, collection, options, callback) {
            var db = require('./db')(connections[connection].connection),
                schema = connections[connection].collections[collection].schema,
                _ttl = null;

            if (schema.hasOwnProperty('_ttl') &&
                schema._ttl.hasOwnProperty('defaultsTo') &&
                typeof schema._ttl.defaultsTo == 'number')
            {
                _ttl = {
                    "enabled": true,
                    "default": schema._ttl.defaultsTo
                };
            }

            db.reindex(collection, this.mapping, _ttl, options, callback);
        },

        reindexAll: function(connectionName, collection, options, callback) {
            var collections = connections[connectionName].collections,
                db = require('./db')(connections[connectionName].connection);

            setTimeout(function(){
                db.clearIndex(function(err) {
                    if (err) {
                        callback(err); return;
                    }

                    function iterator(colName, next) {
                        var schema = collections[colName].schema,
                            mapping = collections[colName].mapping,
                            _ttl = null;

                        if (schema.hasOwnProperty('_ttl') &&
                            schema._ttl.hasOwnProperty('defaultsTo') &&
                            typeof schema._ttl.defaultsTo == 'number')
                        {
                            _ttl = {
                                "enabled": true,
                                "default": schema._ttl.defaultsTo
                            };
                        }

                        db.reindex(colName, mapping, _ttl, options, next);
                    }

                    async.each(Object.keys(collections), iterator, callback);
                });
            }, options.reindexDelay);
        },

        aggregate : function(connection, collection, options, callback) {
            var db = require('./db')(connections[connection].connection);

            db.aggregate(collection, options, function(err, res){
                if (err) {
                    callback(err, false);
                } else {
                    callback(null, res);
                }
            });
        },

        /**
         * @param connectionName
         * @param collectionName
         * @param options
         * @param callback
         */
        backup: function(connectionName, collectionName, options, callback) {
            var db = require('./db')(connections[connectionName].connection);

            db.backup(options, callback);
        },

        /**
         * @param connectionName
         * @param collectionName
         * @param options
         * @param callback
         */
        restore: function(connectionName, collectionName, options, callback) {
            var db = require('./db')(connections[connectionName].connection),
                self = this;
            db.restore(options, callback);
        }
    };

    return adapter;
})();
