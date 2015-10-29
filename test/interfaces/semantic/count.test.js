/**
 * Created by Luigi Ilie Aron on 27.01.15.
 * email: luigi@kreditech.com
 */
var assert = require('assert'),
    _ = require('lodash');

describe('Semantic Interface', function() {
    describe('.count()', function() {
        it('should create a set of 15 users', function(done) {
            var usersArray = [
                { firstName: 'count_1', type: 'count' },
                { firstName: 'count_2', type: 'count' },
                { firstName: 'count_3', type: 'count' },
                { firstName: 'count_4', type: 'count' },
                { firstName: 'count_5', type: 'count' },
                { firstName: 'count_6', type: 'count' },
                { firstName: 'count_7', type: 'count' },
                { firstName: 'count_8', type: 'count' },
                { firstName: 'count_9', type: 'count' },
                { firstName: 'count_10', type: 'count' },
                { firstName: 'count_11', type: 'count' },
                { firstName: 'count_12', type: 'count' },
                { firstName: 'count_13', type: 'count' },
                { firstName: 'count_14', type: 'count' },
                { firstName: 'count_15', type: 'count' }
            ];

            Semantic.User.createEach(usersArray, function(err, users) {
                assert(!err);
                done();
            });
        });

        it('should count 15 users', function(done) {
            var query = {
                bool: {
                    must: [
                        {
                            term: {
                                type: 'count'
                            }
                        }
                    ]
                }
            };

            Semantic.User.count(query).exec(function(err, data){
                assert(!err);
                assert(data === 15);

                Semantic.User.destroy(query).limit(999999).exec(function(err, users){
                    assert(!err);

                    assert(Array.isArray(users));
                    assert(users.length === 15);

                    done();
                });
            });
        });
    })
});
