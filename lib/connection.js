/**
 * Module Dependencies
 */

//var redis = require('redis');
var couchbase = require('couchbase');
var elasticsearch = require('elasticsearch');

/**
 * Connection.js
 *
 * Handles connecting and disconnecting from a redis server.
 *
 * @param {Object} config
 * @param {Function} callback
 */

var Connection = module.exports = function(config, cb) {

  var self = this;

  // Ensure something is set for config
  this.config = config || {};

  // Hold the connection
  this.connection = {};

  // Create a new Connection
  this.connect(function(err, bucket) {
    if(err) return cb(err);
    self.connection = bucket;
    cb(null, self);
  });

};


///////////////////////////////////////////////////////////////////////////////////////////
/// PUBLIC METHODS
///////////////////////////////////////////////////////////////////////////////////////////


/**
 * Connect to the cbes instance
 *
 * @param {Function} callback
 * @api public
 */

Connection.prototype.connect = function(cb) {
  var cluster,
      bucket,
      config = this.config;

  cluster = couchbase.Cluster('couchbase://' + config.host, config.user, config.pass);
  bucket = cluster.openBucket(config.bucket, function(){
    cb(null, bucket);
  });
};
