/**
 * Created by Luigi Ilie Aron on 16.01.15.
 * email: luigi@kreditech.com
 */
'use strict';
module.exports = function(connectionObject){
    var cb = connectionObject.db.cb,
        es = connectionObject.db.es,
        cbtools = require('./cbtools/cbtools')(connectionObject.config.cb),
        async = require('async'),
        _ = require('lodash');

    /**
     * @param modelType
     * @param query
     * @returns {{index: *, body: {query: {filtered: {query: {bool: {must: {term: {_type: {value: *}}}[]}}, filter: {}}}}}}
     */
    function buildQuery(modelType, query){
        if (typeof query !== 'object'){
            throw new Error('Query is not an object!');
        }

        if (typeof modelType !== 'string'){
            throw new Error('modelType is not an string');
        }

        var _q = {
            query: {
                filtered: {
                    query: {
                        bool: {
                            must: [{
                                term: {
                                    _type: {
                                        value: modelType
                                    }
                                }
                            }]
                        }
                    },
                    filter: {}
                }
            }
        };

        if (query.hasOwnProperty('where')) {
            _q.query.filtered.filter = query.where;
        }

        if (query.hasOwnProperty('limit')) {
            _q.size = query.limit;
        }

        if (query.hasOwnProperty('skip')) {
            _q.from = query.skip;
        }

        if (query.hasOwnProperty('sort')) {
            if (Object.keys(query.sort).length > 0) {
                var sort = [];

                for (var key in query.sort) {
                    var _tmp = {};
                    if (key == "_script") {
                        _tmp = {
                            "_script": query.sort[key]
                        };
                    } else {
                        _tmp[key] = {
                            'order': query.sort[key] > 0 ? 'asc' : 'desc'
                        };
                    }

                    sort.push(_tmp);
                }

                _q.sort = sort;
            }
        }

        if (query.hasOwnProperty('aggs')) {
            _q['aggs'] = _.cloneDeep(query['aggs']);
            delete query['aggs'];
        }

        return {
            index: connectionObject.config.es.index,
            type: modelType,
            body : _q
        };
    }

    /**
     * @param entity
     * @param data
     * @param callback
     */
    function updateEntity(entity, data, callback){
        if (data.hasOwnProperty('id')){
            delete data.id;
        }

        if (data.hasOwnProperty('_TYPE')){
            delete data._TYPE;
        }

        var updatedEntity = _.extend(entity, data),
            key = updatedEntity._TYPE + ':' + updatedEntity.id;

        cb.replace(key, updatedEntity, function(err, res){
            if (err) {
                return callback(err, false)
            }

            var esData = {
                index: connectionObject.config.es.index,
                type : updatedEntity._TYPE,
                id   : key,
                refresh: true,
                body : {
                    doc: updatedEntity
                }
            };

            es.update(esData, function(err, res){
                if (err) {
                    return callback(err, false);
                }

                callback(null, updatedEntity);
            });
        });
    }

    /**
     * @param data
     * @param current
     * @param total
     * @param callback
     */
    function deleteRecond(data, current, total, callback){
        es.delete(data, function(err, _res){
            if (err) {
                return callback(err);
            }

            cb.remove(data.id, function(err, _res){
                if (err) {
                    return callback(err);
                }

                if (current === total) {
                    callback(null);
                }
            });
        });
    }

    return {
        /**
         * @param collection
         * @param data
         * @param callback
         */
        create: function(collection, data, _ttl, callback){
            cb.counter(collection + ":count" , 1, {initial: 0, offset: 1}, function(err, res){
                if(err){
                    return callback(err);
                }

                var key = collection + ":" + res.value,
                    meta = {},
                    ttlInterval = connectionObject.config.es.ttlInterval;

                data.id = res.value;
                data._TYPE = collection;

                if (_ttl) {
                    meta.expiry = Math.floor((new Date().getTime() + _ttl + ttlInterval) / 1000);
                }

                cb.insert(key, data, meta, function(err, res){
                    if (err) {
                        return callback(err, false);
                    }

                    var esData = {
                        index: connectionObject.config.es.index,
                        type : data._TYPE,
                        id   : key,
                        refresh: true,
                        body : data
                    };

                    if (_ttl) {
                        esData.body._ttl = _ttl;
                    }

                    es.create(esData, function(err, res){
                        if (err) {
                            return callback(err, false);
                        }

                        callback(null, data);
                    });
                });
            });
        },

        /**
         * @param collection
         * @param filterQuery
         * @param callback
         */
        find: function(collection, filterQuery, callback){
            if (filterQuery.where === null &&
                !filterQuery.hasOwnProperty('limit') &&
                !filterQuery.hasOwnProperty('skip') &&
                !filterQuery.hasOwnProperty('sort')
            ) {
                return this.getCollection(collection, function(err, res){
                    if (err) {
                        return callback(err, false);
                    }

                    var data = res.map(function(obj){
                        return obj.doc;
                    });

                    callback(null, data);
                });
            }

            var query = buildQuery(collection, filterQuery),
                data = [];

            es.search(query, function(err, res){
                if (err) {
                    return callback(err, false)
                }

                var esData = res.hits.hits;
                for (var key in esData) {
                    data.push(esData[key]._source);
                }

                callback(null, data);
            });
        },

        /**
         * @param collection
         * @param filterQuery
         * @param callback
         */
        destroy: function(collection, filterQuery, callback){
            // force limit update
            filterQuery.limit = 999999999;

            this.find(collection, filterQuery, function(err, res){
                if (err) {
                    return callback(err, false);
                }

                if (res.length < 1) {
                    return callback(null, []);
                }

                for (var key in res) {
                    var entity = res[key],
                        data = {
                            index: connectionObject.config.es.index,
                            type: entity._TYPE,
                            refresh: true,
                            id: entity._TYPE + ':' + entity.id
                        };

                    deleteRecond(data, (parseInt(key) + 1), res.length, function(err){
                        if (err) {
                            return callback(err, false);
                        }

                        callback(null, res);
                    })
                }
            });
        },

        /**
         * @param collection
         * @param filterQuery
         * @param callback
         */
        count: function(collection, filterQuery, callback){
            var query = buildQuery(collection, filterQuery);
            es.search(query, function(err, res){
                if (err) {
                    return callback(err, false)
                }

                callback(null, res.hits.total);
            });
        },

        /**
         * @param collection
         * @param filterQuery
         * @param callback
         */
        aggregate: function(collection, filterQuery, callback){
            var query = buildQuery(collection, filterQuery);
            es.search(query, function(err, res){
                if (err) {
                    return callback(err, false)
                }
                if (res.hasOwnProperty('aggregations')) {
                    callback(null, res.aggregations);
                } else {
                    callback(null, null);
                }
            });
        },

        /**
         * @param collection
         * @param filterQuery
         * @param data
         * @param callback
         */
        update: function(collection, filterQuery, data, callback){
            // force limit update
            filterQuery.limit = 999999999;

            this.find(collection, filterQuery, function(err, res){
                if (err) {
                    return callback(err, false);
                }

                if (res.length < 1) {
                    return callback(null, []);
                }

                var i = 0,
                    _data = [];

                for (var key in res){
                    updateEntity(res[key], data, function(err, _res){
                        if (err) {
                            return callback(err, false);
                        }

                        i++;
                        _data.push(_res);

                        if (i == res.length) {
                            callback(null, _data);
                        }
                    });
                }
            });
        },

        /**
         * @param collection
         * @param callback
         */
        getCollection: function(collection, callback){
            var ViewQuery =  require('couchbase').ViewQuery,
                query = ViewQuery.from(connectionObject.config.cb.bucket.name, collection);

            cb.query(query, {}, function(err, res){
                if (err) {
                    return callback(err, false);
                }

                if (res.length < 1) {
                    return callback(null, []);
                }

                var data = [];
                for (var key in res) {
                    data.push(res[key].value);
                }

                callback(null, data);
            });
        },

        reindex: function(collection, mapping, _ttl, callback){
            var self = this,
                index = connectionObject.config.es.index,
                deleteParam = {
                    index: index,
                    type: collection
                },
                fullMapping = {
                    index: index,
                    type: collection,
                    body : {
                        properties: mapping
                    }
                },
                esEntry = function(data){
                    return {
                        index: index,
                        type: collection,
                        id: collection + ':' + data.id,
                        refresh: true,
                        body: data
                    }
                };

            if (_ttl) {
                fullMapping.body._ttl = _ttl;
            }

            es.indices.deleteMapping(deleteParam, function(err){
                if (err) {
                    var notFound = (err.message.search('TypeMissingException') > -1);

                    if (!notFound) {
                        return callback(err);
                    }
                }

                es.indices.putMapping(fullMapping, function(err){
                    if (err) {
                        return callback(err);
                    }

                    self.getCollection(collection, function(err, res){
                        if (err) {
                            return callback(err);
                        }

                        function iterator(obj, next) {
                            var data = obj.doc;

                            if (_ttl) {
                                data._ttl = Math.round((obj.meta.expiration * 1000) - (new Date().getTime()));

                                if (data._ttl <= 0) {
                                    next(new Error('ttl negative'), false);
                                }
                            }

                            es.create(esEntry(data), next);
                        }

                        var docs = Object.keys(res).map(function(key) { return res[key];});

                        async.forEachLimit(docs, 5000, iterator, callback);
                    });
                });
            });
        },

        backup: cbtools.cbBackup,

        restore: cbtools.cbRestore
    }
};
