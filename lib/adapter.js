/**
 * Module Dependencies
 */
// ...
// e.g.
//var _ = require('lodash');
var couchbase = require('couchbase');
var elasticsearch = require('elasticsearch');
// var mysql = require('node-mysql');
// ...



/**
 * waterline-test
 *
 * Most of the methods below are optional.
 *
 * If you don't need / can't get to every method, just implement
 * what you have time for.  The other methods will only fail if
 * you try to call them!
 *
 * For many adapters, this file is all you need.  For very complex adapters, you may need more flexiblity.
 * In any case, it's probably a good idea to start with one file and refactor only if necessary.
 * If you do go that route, it's conventional in Node to create a `./lib` directory for your private submodules
 * and load them at the top of the file with other dependencies.  e.g. var update = `require('./lib/update')`;
 */


module.exports = (function () {


  // You'll want to maintain a reference to each connection
  // that gets registered with this adapter.
  var connections = {};



  // You may also want to store additional, private data
  // per-connection (esp. if your data store uses persistent
  // connections).
  //
  // Keep in mind that models can be configured to use different databases
  // within the same app, at the same time.
  //
  // i.e. if you're writing a MariaDB adapter, you should be aware that one
  // model might be configured as `host="localhost"` and another might be using
  // `host="foo.com"` at the same time.  Same thing goes for user, database,
  // password, or any other config.
  //
  // You don't have to support this feature right off the bat in your
  // adapter, but it ought to get done eventually.
  //

  var adapter = {

	  identity: "waterline-cbes",
    // Set to true if this adapter supports (or requires) things like data types, validations, keys, etc.
    // If true, the schema for models using this adapter will be automatically synced when the server starts.
    // Not terribly relevant if your data store is not SQL/schemaful.
    //
    // If setting syncable, you should consider the migrate option,
    // which allows you to set how the sync will be performed.
    // It can be overridden globally in an app (config/adapters.js)
    // and on a per-model basis.
    //
    // IMPORTANT:
    // `migrate` is not a production data migration solution!
    // In production, always use `migrate: safe`
    //
    // drop   => Drop schema and data, then recreate it
    // alter  => Drop/add columns as necessary.
    // safe   => Don't change anything (good for production DBs)
    //
    syncable: false,

	schema: false,
    // Default configuration for connections
    defaults: {
			// For example, MySQLAdapter might set its default port and host.
		host: '127.0.0.1',
		port: 8091,
		user: 'root',
		pass: 'root123',
		bucket: 'dataMiner',
		ramQuotaMB: '256',
		authType: 'sasl',
		replicaNumber: 1,
		bucketType: 'couchbase',
		flushEnabled: 1,
		proxyPort: '11211',
		threadsNumber: 4
    },



    /**
     *
     * This method runs when a model is initially registered
     * at server-start-time.  This is the only required method.
     *
     * @param  {[type]}   connection [description]
     * @param  {[type]}   collection [description]
     * @param  {Function} cb         [description]
     * @return {[type]}              [description]
     */
    registerConnection: function(connection, collections, cb) {

      if(!connection.identity) return cb(new Error('Connection is missing an identity.'));
      if(connections[connection.identity]) return cb(new Error('Connection is already registered.'));

      // Add in logic here to initialize connection
      // e.g. connections[connection.identity] = new Database(connection, collections);
		var cluster = new couchbase.Cluster();
		connections[connection.identity] =
			{
				cb: cluster.openBucket(adapter.defaults.bucket),
				es: null
			};

      cb();
    },


    /**
     * Fired when a model is unregistered, typically when the server
     * is killed. Useful for tearing-down remaining open connections,
     * etc.
     *
     * @param  {Function} cb [description]
     * @return {[type]}      [description]
     */
    // Teardown a Connection
    teardown: function (conn, cb) {
      if (typeof conn == 'function') {
        cb = conn;
        conn = null;
      }
      if (!conn) {
        connections = {};
        return cb();
      }
      if(!connections[conn]) return cb();
		connections[conn].shutdown();
		delete connections[conn];
      cb();
    },


    // Return attributes
    describe: function (connection, collection, cb) {
			// Add in logic here to describe a collection (e.g. DESCRIBE TABLE logic)
      return cb();
    },

    /**
     *
     * REQUIRED method if integrating with a schemaful
     * (SQL-ish) database.
     *
     */
    define: function (connection, collection, definition, cb) {
			// Add in logic here to create a collection (e.g. CREATE TABLE logic)
      return cb();
    },

    /**
     *
     * REQUIRED method if integrating with a schemaful
     * (SQL-ish) database.
     *
     */
    drop: function (connection, collection, relations, cb) {
			// Add in logic here to delete a collection (e.g. DROP TABLE logic)
			return cb();
    },

    /**
     *
     * REQUIRED method if users expect to call Model.find(), Model.findOne(),
     * or related.
     *
     * You should implement this method to respond with an array of instances.
     * Waterline core will take care of supporting all the other different
     * find methods/usages.
     *
     */
    find: function (connection, collection, options, cb) {
			return cb();
    },

    create: function (connection, collection, values, cb) {
		var toInsert = values.reduce(function(o, v,i){
			o[v[i].key] = v;
			return o;
			}, {});
		connection.cb.insertMulti(toInsert,{},function(){
			//TODO add to elasticsearch
			return cb();
		});
    },

    update: function (connection, collection, options, values, cb) {
		var toInsert = values.reduce(function(o, v,i){
			o[v[i].key] = v;
			return o;
		}, {});
		connection.cb.replaceMulti(toInsert,{},function(){
			//TODO add to elasticsearch
			return cb();
		});
      return cb();
    },

    destroy: function (connection, collection, options, values, cb) {
		var toInsert = values.reduce(function(o, v,i){
			o[v[i].key] = v;
			return o;
		}, {});
		connection.cb.removeMulti(toInsert,{},function(){
			//TODO add to elasticsearch
			return cb();
		});
      return cb();
    }
  };


  // Expose adapter definition
  return adapter;

})();

