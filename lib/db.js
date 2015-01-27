/**
 * Created by Luigi Ilie Aron on 16.01.15.
 * email: luigi@kreditech.com
 */
module.exports = function(connectionObject){
    var cb = connectionObject.db.cb,
        es = connectionObject.db.es;

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

                if (res.total < 1) {
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
        }
    }
};