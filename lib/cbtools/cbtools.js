/**
 * Created by Robert Savu on 6/17/15.
 * email: robert@kreditech.com
 */
'use strict';

module.exports = function (cbCfg) {
    var fs = require('fs'),
        path = require('path'),
        childProcess = require('child_process'),
        url = cbCfg.host;

    if ((url.indexOf('http://') < 0) && (url.indexOf('https://') < 0)) {
        url = 'http://' + url + ':';
    }

    url += cbCfg.port;

    var _options = {
        version: cbCfg.version,
        bucketSource: cbCfg.bucket.name,
        user: cbCfg.user,
        password: cbCfg.pass,
        threads: "4",
        cbUrl: url,
        mode: 'diff',
        backupPath: undefined
    };

    function versionMap(cbVersion) {
        var map = {
            '4.1.0' : '4.1.0',
            '4.0.0' : '4.1.0',
            '3.1.3' : '3.1.3',
            '3.1.2' : '3.1.3',
            '3.1.1' : '3.1.3',
            '3.1.0' : '3.1.3',
            '3.0.4' : '3.1.3',
            '3.0.3' : '3.1.3',
            '3.0.2' : '3.1.3',
            '3.0.1' : '3.1.3',
            '2.5.2' : '2.1.1',
            '2.5.1' : '2.1.1',
            '2.5.0' : '2.1.1',
            '2.2.0' : '2.1.1',
            '2.1.1' : '2.1.1',
            '2.0.1' : '2.1.1'
        };
        return map[cbVersion];
    }

    /**
     * overrides the default options.
     * @param options
     */
    function setOptions(options) {
        Object.keys(options).map(function(key) {
                _options[key] = options[key];
            });
    }

    /**
     * Generates the current working directory absolute path for the child process to be executed
     * @returns {string}
     */
    function getCwd() {
        var cwd = path.join(__dirname, versionMap(_options.version));

        if (!fs.existsSync(cwd)) {
            throw new Error('wrong version number or unsupported: ' + _options.version);
        }

        return cwd;
    }

    /**
     * Returns the common arguments for the child process from the cb config.
     * This excludes the source and destination arguments
     * @returns {*[]}
     */
    function getArgs(isBackup, cbtools_version) {
        var ret = [
            '-b ' + _options.bucketSource,
            '-u "' + _options.user + '"',
            '-p "' + _options.password + '"',
            '-t ' + _options.threads
        ];

        if (isBackup && cbtools_version !== '2.1.1') {
            ret.push('-m ' + _options.mode);
        }

        return ret;
    }

    /**
     * Wrapper
     *
     * @param command
     * @param cwd
     * @param callback
     */
    function execProcess(command, cwd, callback) {

        childProcess.exec(command.join(' '), {cwd: cwd, maxBuffer: 1024 * 5000}, function(err, stdout, stderr) {
            if (err) {
                callback(err, null);
                return;
            }

            callback(false, stderr);
        });
    }

    return {
        cbBackup: function(options, callback) {
            setOptions(options);

            var folderName = new Date().toISOString()
                                       .replace(/\:/g,'')
                                       .replace(/\.[0-9]*Z/g,'Z'),
                backupPath,
                cwd = getCwd(),
                command = getArgs(true, versionMap(options.version));

            if (versionMap(options.version) !== '2.1.1') {
                backupPath = _options.backupPath;
            } else {
                backupPath = path.join(_options.backupPath, folderName);
            }

            command.unshift(path.join(cwd, 'cbbackup'));
            command.push(_options.cbUrl);
            command.push(backupPath);

            execProcess(command, cwd, callback);
        },

        cbRestore: function(options, callback) {
            setOptions(options);

            var cwd = getCwd(),
                command = getArgs(false, versionMap(options.version));

            command.unshift(path.join(cwd, 'cbrestore'));
            command.push(_options.backupPath);
            command.push(_options.cbUrl);

            execProcess(command, cwd, callback);
        }
    };
};
