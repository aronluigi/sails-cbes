/**
 * Created by Luigi Ilie Aron on 16.01.15.
 * email: luigi@kreditech.com
 */
module.exports = function(connectionObject){
    var cb = connectionObject.db.cb,
        es = connectionObject.db.es;

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
                        return callback(err);
                    }

                    var esData = {
                        index: connectionObject.config.es.index,
                        type : data._TYPE,
                        id   : data.id,
                        body : data
                    };

                    es.create(esData, function(err, res){
                        if (err) {
                            return callback(err);
                        }

                        callback(false);
                    });
                });
            });
        },

        find: function(collection, filterQuery, callback){
            var query = buildQuery(collection, filterQuery);
            console.log(JSON.stringify(query));
        }
    }
};