/**
 * Created by Luigi Ilie Aron on 16.01.15.
 * email: luigi@kreditech.com
 */
module.exports = function(connectionObject){
    var cb = connectionObject.db.cb,
        es = connectionObject.db.es,
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
                    _tmp[key] = {
                        'order': query.sort[key] > 0 ? 'asc' : 'desc'
                    };

                    sort.push(_tmp);
                }

                _q.sort = sort;
            }
        }

        return {
            index: connectionObject.config.es.index,
            body : _q
        }
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

        var updatedEntity = _.extend(entity, data);

        cb.replace(updatedEntity.id, updatedEntity, function(err, res){
            if (err) {
                return callback(err, false)
            }

            var esData = {
                index: connectionObject.config.es.index,
                type : updatedEntity._TYPE,
                id   : updatedEntity.id,
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
        create: function(collection, data, callback){
            cb.counter(collection + ":count" , 1, {initial: 0, offset: 1}, function(err, res){
                if(err){
                    return callback(err);
                }

                data.id = collection + ":" + res.value;
                data._TYPE = collection;

                cb.insert(data.id, data, function(err, res){
                    if (err) {
                        return callback(err, false);
                    }

                    var esData = {
                        index: connectionObject.config.es.index,
                        type : data._TYPE,
                        id   : data.id,
                        body : data
                    };

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
            if (filterQuery.where === null) {
                return this.getCollection(collection, function(err, res){
                    if (err) {
                        return callback(err, false);
                    }

                    callback(null, res);
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
                            id: entity.id
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
         * @param data
         * @param callback
         */
        update: function(collection, filterQuery, data, callback){
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
        }
    }
};