var assert = require('assert'),
    _ = require('lodash');

describe('Semantic Interface', function() {
    describe('.createEach()', function() {
        it('should create a set of 2 users and check the model', function(done) {
            var usersArray = [
                { firstName: 'createEach_1', type: 'createEach' },
                { firstName: 'createEach_2', type: 'createEach' }
            ];

            Semantic.User.createEach(usersArray, function(err, users) {
                assert(!err);
                assert(Array.isArray(users));
                assert(users.length === 2);

                for (var key in users) {
                    key = parseInt(key);
                    assert(users[key].id);
                    assert(typeof users[key].fullName === 'function');
                    assert(toString.call(users[key].createdAt) == '[object Date]');
                    assert(toString.call(users[key].updatedAt) == '[object Date]');

                    if ((key + 1) == users.length) {
                        done();
                    }
                }
            });
        });

        it('should validate 2 records verififed by find and than delete them', function(done) {
            var query = {
                bool: {
                    must: [
                        {
                            term: {
                                type: 'createEach'
                            }
                        },
                        {
                            terms: {
                                firstName: ['createEach_1', 'createEach_2']
                            }
                        }
                    ]
                }
            };

            Semantic.User.find()
                .where(query)
                .skip(0)
                .limit(10)
                .sort({createdAt: 'desc'})
                .exec(function(err, users) {
                    assert(!err);
                    assert(Array.isArray(users));
                    assert(users.length === 2);

                    assert(users[0].id);
                    assert(typeof users[0].fullName === 'function');
                    assert(toString.call(new Date(users[0].createdAt)) == '[object Date]');
                    assert(toString.call(new Date(users[0].updatedAt)) == '[object Date]');

                    var query = {
                        bool: {
                            must: [
                                {
                                    term: {
                                        type: 'createEach'
                                    }
                                },
                                {
                                    terms: {
                                        firstName: ['createEach_1', 'createEach_2']
                                    }
                                }
                            ]
                        }
                    };

                    Semantic.User.destroy(query).limit(999999).exec(function(err, users){
                        assert(!err);

                        assert(Array.isArray(users));
                        assert(users.length === 2);

                        assert(users[0].id);
                        assert(toString.call(new Date(users[0].createdAt)) == '[object Date]');
                        assert(toString.call(new Date(users[0].updatedAt)) == '[object Date]');

                        done();
                    });
                });
        });
    });
});
