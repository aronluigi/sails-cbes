/**
 * Module Dependencies
 */

var Errors = require('waterline-errors').adapter;
var Connection = require('./connection');
var Collection = require('./collection');

var util = require('util');

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

    function buildESQuery(model_type, query){

        if (typeof query !== "object"){
            throw new Error("Query is not an Object");
        }

        var aux_query = {
            "query": {
                "filtered": {
                    "query": {
                        "bool": {
                            "must": [
                                {
                                    "query_string": {
                                        "default_field": "TYPE",
                                        "query": model_type
                                    }
                                }
                            ]
                        }
                    }
                }
            }
        };

        if(!isEmpty(query)){
            //Need to be checked!!!
            aux_query['query']['filtered']['filter']["term"] = query.where;
        }

        return {
            index: adapter.defaults.es.index,
            body: aux_query
        }
    };

    function isEmpty(obj) {
        for (var prop in obj){
            if (obj.hasOwnProperty(prop)){
                return false;
            }
        }
        return true;
    };

    /*function putESMappings(client){
        console.log("ESClient " + client.indices);
        var mapping = {
            index: config.index,
            type: entity.getType(),
            body: {
                properties: entity.mapping
            }
        };
    };*/

    var adapter = {

        // Which type of primary key is used by default
        pkFormat: 'string',

        // to track schema internally
        syncable: true,

        identity: "waterline-cbes",

        schema: false,
        // Default configuration for connections
        defaults: {
            cb: {
                // Connection Configuration
                host: 'localhost',
                port: 8091,
                user: 'root',
                pass: 'root123',

                //DB Options
                bucket: 'dataMiner',
                ramQuotaMB: '256',
                authType: 'sasl',
                replicaNumber: 1,
                bucketType: 'couchbase',
                flushEnabled: 1,
                proxyPort: '11211',
                threadsNumber: 4
            },
            es: {
                host: ['127.0.0.1:9200'],
                log: 'error',
                index: 'data_miner',
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
            new Connection(connection, function (_err, connectionObject) {
                if (_err) {
                    return cb((function _createError() {
                        var msg = util.format('Failed to connect to the Couchbase/ElasticSearch clients', util.inspect(_err, false, null));
                        var err = new Error(msg);
                        err.originalError = _err;
                        return err;
                    })());
                }

                connections[connection.identity].connection = connectionObject;

                var view = {};
                view.views = {};
                view.options = {
                    updateInterval         : 2500,
                    updateMinChanges       : 5000,
                    replicaUpdateMinChanges: 5000
                };

                var dbManager = connectionObject.db.cb.manager(),
                    bucketName = connections[connection.identity].config.cb.bucket;

                Object.keys(collections).forEach(function(key) {
                    connections[connection.identity].collections[key] = new Collection(collections[key], key, view, connectionObject);

                    dbManager.upsertDesignDocument(bucketName, view, function(err, res){
                        /*putESMappings(connections[connection.identity]);
                        if (err) {
                            return console.error(err);
                        }*/

                        console.info('CouchBase views imported');
                    });
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

            var connectionObject = connections[connection].connection,
                esClient = connectionObject.db.es,
                ids = [],
                query = {};

            //If no options return all the documents
            //console.log(options)
            if (options.where == null){
                options.where = {};
                //return callback(new Error('No query found!'), false);
            }

            query = buildESQuery(collection, options);

            esClient.search(query, function(err, res){
                if (err) {
                    console.log(err);
                    return callback(err, false);
                }

                var data = res.hits.hits;

                if (data.length < 1) {
                    return callback(false, []);
                }

                for (var key in data) {
                    ids.push(data[key]._source);
                    if (key.replace(data[key]._type+":", "") == data.length -1) {
                        callback(false, ids);
                    }
                }
            });
        },

        /**
         *
         * @param connection
         * @param collection
         * @param values
         * @param cb
         */
        create: function (connection, collection, values, callback) {
            var connectionObject = connections[connection].connection,
                bucket = connectionObject.db.cb,
                esClient = connectionObject.db.es;
            //console.log(values);
            bucket.counter(collection + ":count" , 1, {initial: 0, offset: 1}, function(err, res) {
                if(err){
                    callback(err, null);
                }
                values.id = collection + ":" + res.value;
                values.TYPE = collection;

                if (Array.isArray(values)){
                    for(var i in values){
                        console.log(i + ': ' + JSON.stringify(values[i], null, 4));
                        bucket.insert(values[i].id, values[i], function (err, res) {
                            if (err) {
                                callback(err, null);
                            }

                            var esObj = {
                                index: connectionObject.config.es.index,
                                type: values[i].TYPE,
                                id: values[i].id,
                                body: values[i]
                            }
                            esClient.create(esObj, function(err, res){
                                if (err){
                                    callback(err, null);
                                }
                                callback(null, values);
                            });
                        });
                    }
                } else {
                    bucket.insert(values.id, values, function (err, res) {
                        if (err) {
                            callback(err, null);
                        }

                        var esObj = {
                            index: connectionObject.config.es.index,
                            type: values.TYPE,
                            id: values.id,
                            body: values
                        }
                        esClient.create(esObj, function(err, res){
                            if (err){
                                callback(err, null);
                            }
                            callback(null, values);
                        });
                    });
                }

            });
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
                            type: record.TYPE,
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

