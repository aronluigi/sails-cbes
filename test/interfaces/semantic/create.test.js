/**
 * Created by luigi on 29/10/15.
 */
var assert = require('assert'),
    _ = require('lodash');

describe('Semantic Interface', function() {
    describe('.create()', function() {
        it('should create unique one user', function(done){
            Semantic.Unique.create({firstName: 'created_test', lastName: 'unique'}, function(err, users) {
                assert(!err);
                done();
            });
        });

        it('should try to create one unique and generate conflict of lastName', function(done){
            Semantic.Unique.create({firstName: 'created_test', lastName: 'unique', email: 'test@test.t'}, function(err, users) {
                assert(err);
                done();
            });
        });

        it('should try to create one unique and generate conflict of email', function(done){
            Semantic.Unique.create({firstName: 'created_test', email: 'e@test.com'}, function(err, users) {
                assert(err);
                done();
            });
        });

        it('should find one user and remove it', function(done) {
            var query = {
                bool: {
                    must: [
                        {
                            term: {
                                firstName: 'created_test'
                            }
                        }
                    ]
                }
            };

            Semantic.Unique.destroy(query).exec(function(err, users){
                assert(!err);
                assert(Array.isArray(users));
                assert(users.length === 1);
                done()
            });
        });
    });
});
