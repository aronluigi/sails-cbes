var mocha = require('mocha');
var TestRunner = require('waterline-adapter-tests');

/**
 * Integration Test Runner
 *
 * Uses the `waterline-adapter-tests` module to
 * run mocha tests against the specified interfaces
 * of the currently-implemented Waterline adapter API.
 */
console.log("starting tests");
new TestRunner({

    // Load the adapter module.
    adapter: require('./../../lib/adapter.js'),

    // Default adapter config to use.
    config: {
	identity: "waterline-cbes",
	syncable: false,
        schema: false
    },

    // The set of adapter interfaces to test against.
    interfaces: ['semantic']
});
