/**
 * Module Dependencies
 */

var Errors = require('waterline-errors').adapter,
    Connection = require('./connection'),
    Collection = require('./collection'),
    util = require('util'),
    _ = require('lodash');

/**
 * waterline-test
 *
 * Most of the methods below are optional.
 *
 * If you don't need / can't get to every method, just implement
 * what you have time for.  The other methods will only fail if
 * you try to call them!
 *
 * For many adapters, this file is all you need.  For very complex adapters, you may need more flexiblity.
 * In any case, it's probably a good idea to start with one file and refactor only if necessary.
 * If you do go that route, it's conventional in Node to create a `./lib` directory for your private submodules
 * and load them at the top of the file with other dependencies.  e.g. var update = `require('./lib/update')`;
 */
module.exports = (function () {

    // Keep track of all the connections used by the app
    var connections = {};
    var db = null;

    function isEmpty(obj) {
        for (var prop in obj){
            if (obj.hasOwnProperty(prop)){
                return false;
            }
        }
        return true;
    };

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
                host: 'localhost',
                port: 8091,
                user: 'root',
                pass: 'root123',

                //bucket
                bucket: {
                    name: 'dataMinerT',
                    pass: ''
                }
            },
            // elastic search
            es: {
                host: ['127.0.0.1:9200'],
                log: 'error',
                index: 'data_miner_t',
                numberOfShards: 5,
                numberOfReplicas: 1
            }
        },

        /**
         * Register A Connection
         *
         * Will open up a new connection using the configuration provided and store the DB
         * object to run commands off of. This creates a new pool for each connection config.
         *
         * @param {Object} connection
         * @param {Object} collections
         * @param {Function} callback
         */
        registerConnection: function (connection, collections, cb) {

            if (!connection.identity) return cb(Errors.IdentityMissing);
            if (connections[connection.identity]) return cb(Errors.IdentityDuplicate);

            // Store the connection
            connections[connection.identity] = {
                config: connection,
                collections: {}
            };

            // Create new connection
            new Connection(connection, collections,function(_err, connectionObject) {
                if (_err) {
                    return cb((function _createError() {
                        var msg = util.format('Failed to connect to the Couchbase/ElasticSearch clients', util.inspect(_err, false, null));
                        var err = new Error(msg);
                        err.originalError = _err;
                        return err;
                    })());
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
        // Teardown a Connection
        /*teardown: function (conn, cb) {
            if (typeof conn == 'function') {
                cb = conn;
                conn = null;
            }
            if (!conn) {
                connections = {};
                return cb();
            }
            if (!connections[conn]) return cb();
            connections[conn].shutdown();
            delete connections[conn];
            cb();
        },*/

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
         *
         * REQUIRED method if users expect to call Model.find(), Model.findOne(),
         * or related.
         *
         * You should implement this method to respond with an array of instances.
         * Waterline core will take care of supporting all the other different
         * find methods/usages.
         *
         */
        find: function (connection, collection, options, callback) {
            var db = require('./db')(connections[connection].connection);

            db.find(collection, options, function(err, res){
                if (err) {
                    return callback(err, false);
                }

                callback(null, res);
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
                _values = [];

            if (!Array.isArray(values)) {
                values = [values];
            }

            for (var i in values) {
                db.create(collection, values[i], function(err, _vals){
                    if (err){
                        return callback(err, false);
                    }

                    _values.push(_vals);

                    if ((i + 1) == values.length) {
                        callback(null, Array.isArray(originalVals) ? _values : _values[i]);
                    }
                });
            }
        },

        update: function (connection, collection, options, values, callback) {
            var connectionObject = connections[connection].connection,
                bucket = connectionObject.db.cb,
                esClient = connectionObject.db.es;

            this.find(connection, collection, options, function(err, res) {
                if (err) {
                    return callback(err, false);
                }
                console.log('After find!');
                var records = [];
                res.forEach(function(record) {
                    for (var property in values) {
                        if(property !== 'id') {
                            record[property] = values[property];
                        }
                    }
                    records.push(record);
                });

                records.forEach(function(record) {

                    bucket.replace(record.id, record, function(err, res) {
                        if(err) {
                            return callback(err, false);
                        }
                        var esObj = {
                            index: connectionObject.config.es.index,
                            type: record._TYPE,
                            id: record.id,
                            body: record
                        }

                        esClient.index(esObj, function(err, res){
                            if (err){
                                return callback(err, false);
                            }
                            if (records.indexOf(record) === records.length - 1) {
                                callback(false, records);
                            }
                        });
                    });
                });
            });
        },

        /**
         *
         * @param connection
         * @param collection
         * @param options
         * @param callback
         */
        destroy: function (connection, collection, options, callback) {
            var connectionObject = connections[connection].connection,
                bucket = connectionObject.db.cb,
                esClient = connectionObject.db.es;

            var db = require('./db')(connections[connection].connection);
            db.destroy(collection, options, function(err, res){
                if (err) {
                    return callback(err, false);
                }

                callback(null, res);
            });

            return;

            this.find(connection, collection, options, function(err, res) {
                if (err) {
                    return callback(err, []);
                }

                console.log("Destroy" + JSON.stringify(res, null, 4));

                if (res.length === 0){
                    return callback(false, []);
                }
                res.forEach(function(record) {
                    var id = record.id;
                    bucket.remove(id, function(err, _res) {
                        if(err) {
                            callback(err, []);
                        }
                        esClient.deleteByQuery(query, function (err, __res) {
                            if (err) {
                                return callback(err, []);
                            }
                            return callback(false, res);
                        });
                        /*esClient.delete({
                            index: connectionObject.config.es.index,
                            type: record.TYPE,
                            TYPE: record.TYPE,
                            id: record.id
                        }, function (err, _res) {
                            console.log('esClient.delete response: ' + JSON.stringify(__res, null, 4));
                            console.log('esClient.delete error: ' + err);
                            if (err) {
                                return callback(err, []);
                            }

                            return callback(false, res);
                        });*/
                    });
                });

            });
        }
    };

    // Expose adapter definition
    return adapter;

})();

