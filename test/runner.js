var mocha = require('mocha');
var TestRunner = require('./lib/index');


/**
 * Integration Test Runner
 *
 * Uses the `waterline-adapter-tests` module to
 * run mocha tests against the specified interfaces
 * of the currently-implemented Waterline adapter API.
 */
new TestRunner({

    // Load the adapter module.
    adapter: require('../lib/adapter'),

    // Default adapter config to use.
    config: {
        schema: false
    },

    // The set of adapter interfaces to test against.
    interfaces: ['semantic']
});
