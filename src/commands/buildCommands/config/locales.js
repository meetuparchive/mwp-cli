const path = require('path');
const { appPath } = require('./paths');

module.exports = require(path.resolve(appPath, 'util', 'locales'));
