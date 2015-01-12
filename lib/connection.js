
/**
 * Module dependencies
 */

var couchbase = require('couchbase'),
    elasticSearch = require('elasticsearch');

/**
 * Manage a connection to a CB & ES Server
 *
 * @param {Object} config
 * @return {Object}
 * @api private
 */

var Connection = module.exports = function Connection(config, cb) {
  var self = this;
  // Hold the config object
  this.config = config || {};


  // Build Database connection
  this._buildConnection(function(err, db) {

    if(err) return cb(err);

    // Store the DB object
    self.db = db;

    // Return the connection
    cb(null, self);
  });
};

/////////////////////////////////////////////////////////////////////////////////
// PRIVATE METHODS
/////////////////////////////////////////////////////////////////////////////////


/**
 * Build Server and Database Connection Objects
 *
 * @param {Function} cb
 * @api private
 */

Connection.prototype._buildConnection = function _buildConnection(cb) {

  // Set the configured options
  var connectionOptions = {};

  //connectionOptions.replSet = this.config.replSet || {};

    connectionOptions.Couchbase = this.config.cb;

    connectionOptions.ElasticSearch = this.config.es;
    var esClient, cbCluster;

    try{
    esClient = new elasticSearch.Client({host: connectionOptions.ElasticSearch.host,
                         log: connectionOptions.ElasticSearch.log
                        });
    cbCluster = new couchbase.Cluster('couchbase://' + connectionOptions.Couchbase.host,
                      connectionOptions.Couchbase.user,
                      connectionOptions.Couchbase.pass
                     );
    }
    catch(err) {
        return cb(err, null);
    }

    var self = this;

    var bucket = cbCluster.openBucket(connectionOptions.Couchbase.bucket);
    bucket.on('connect', function() {
        esClient.indices.exists({index: self.config.es.index}, function(err, res, status) {
            if (err) {
                return cb(err, null);
            }

            if (res === false) {
                console.info('ElasticSeach index not found!');

                var params = {
                    index: self.config.es.index,
                    body: {
                        settings: {
                            number_of_shards: self.config.es.numberOfShards,
                            number_of_replicas: self.config.es.numberOfReplicas
                        }
                    }
                };

                createIndex(esClient, params, function(err){
                    if (err) {
                        return cb(err, null);
                    }

                    cb(false, {
                        cb: bucket,
                        es: esClient
                    });
                });
            }

            cb(false, {
                cb: bucket,
                es: esClient
            });
        });
    });
};
