/**
 * Created by Luigi Ilie Aron on 27.01.15.
 * email: luigi@kreditech.com
 */
var assert = require('assert'),
    _ = require('lodash');

describe('Semantic Interface', function() {
    describe('.findOne()', function() {
        it('should create a set of 2 users', function(done) {
            var usersArray = [
                { firstName: 'findOne_1', type: 'findOne' },
                { firstName: 'findOne_2', type: 'findOne' },
            ];

            Semantic.User.createEach(usersArray, function(err, users) {
                assert(!err);
                done();
            });
        });

        it('should find 1 users', function(done) {
            var query = {
                bool: {
                    must: [
                        {
                            term: {
                                type: 'findOne'
                            }
                        }
                    ]
                }
            };

            Semantic.User.findOne(query).exec(function(err, user){
                assert(!err);

                assert(user instanceof Object);
                assert(user.id);
                assert(typeof user.fullName === 'function');
                assert(toString.call(new Date(user.createdAt)) == '[object Date]');
                assert(toString.call(new Date(user.updatedAt)) == '[object Date]');

                Semantic.User.destroy(query).limit(999999).exec(function(err, users){
                    assert(!err);

                    assert(Array.isArray(users));
                    assert(users.length === 2);

                    done();
                });
            });
        });
    })
});
