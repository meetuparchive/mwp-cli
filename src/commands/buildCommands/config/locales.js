const path = require('path');
const { appPath } = require('./paths'); // expect CLI to be run from consumer repo root

module.exports = require(path.resolve(appPath, 'util', 'locales'));
