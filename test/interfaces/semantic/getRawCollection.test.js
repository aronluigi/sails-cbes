/**
 * Created by Luigi Ilie Aron on 27.01.15.
 * email: luigi@kreditech.com
 */
var assert = require('assert'),
    _ = require('lodash');

describe('Semantic Interface', function() {
    describe('.getRawCollection()', function() {
        it('should create a set of 15 users', function(done) {
            var usersArray = [
                { firstName: 'getRawCollection_1', type: 'getRawCollection' },
                { firstName: 'getRawCollection_2', type: 'getRawCollection' },
                { firstName: 'getRawCollection_3', type: 'getRawCollection' },
                { firstName: 'getRawCollection_4', type: 'getRawCollection' },
                { firstName: 'getRawCollection_5', type: 'getRawCollection' },
                { firstName: 'getRawCollection_6', type: 'getRawCollection' },
                { firstName: 'getRawCollection_7', type: 'getRawCollection' },
                { firstName: 'getRawCollection_8', type: 'getRawCollection' },
                { firstName: 'getRawCollection_9', type: 'getRawCollection' },
                { firstName: 'getRawCollection_10', type: 'getRawCollection' },
                { firstName: 'getRawCollection_11', type: 'getRawCollection' },
                { firstName: 'getRawCollection_12', type: 'getRawCollection' },
                { firstName: 'getRawCollection_13', type: 'getRawCollection' },
                { firstName: 'getRawCollection_14', type: 'getRawCollection' },
                { firstName: 'getRawCollection_15', type: 'getRawCollection' }
            ];

            Semantic.User.createEach(usersArray, function(err, users) {
                assert(!err);
                done();
            });
        });

        it('should getRawCollection 15 users', function(done) {
            this.timeout(10000);

            setTimeout(function(){
                var query = {
                    bool: {
                        must: [
                            {
                                term: {
                                    type: 'getRawCollection'
                                }
                            }
                        ]
                    }
                };

                Semantic.User.getRawCollection(function(err, users){
                    assert(!err);

                    assert(Array.isArray(users));
                    assert(users.length === 15);

                    setTimeout(function(){
                        Semantic.User.destroy(query).limit(999999).exec(function(err, _users){
                            assert(!err);

                            assert(Array.isArray(_users));
                            assert(_users.length === 15);

                            done();
                        });
                    }, 1000);
                });
            }, 7000);
        });
    })
});