/**
 * Created by Luigi Ilie Aron on 27.01.15.
 * email: luigi@kreditech.com
 */
var assert = require('assert'),
    _ = require('lodash');

describe('Semantic Interface', function() {
    describe('.update()', function() {
        it('should create one users', function(done) {
            Semantic.User.create({ firstName: 'update_1', lastName: 'test', type: 'update' }, function(err, users) {
                assert(!err);
                done();
            });
        });

        it('should find update users', function(done) {
            var query = {
                bool: {
                    must: [
                        {
                            term: {
                                type: 'update'
                            }
                        },
                        {
                            term: {
                                firstName: 'update_1'
                            }
                        }
                    ]
                }
            };

            Semantic.User.update(query, {lastName: 'updated', _TYPE: 'test'}).exec(function(err, user){
                assert(!err);

                assert(user[0] instanceof Object);
                assert(user[0].id);
                assert(typeof user[0].fullName === 'function');
                assert(toString.call(new Date(user[0].createdAt)) == '[object Date]');
                assert(toString.call(new Date(user[0].updatedAt)) == '[object Date]');

                Semantic.User.destroy(query).limit(999999).exec(function(err, users){
                    assert(!err);

                    assert(Array.isArray(users));
                    done();
                });
            });
        });
    })
});
