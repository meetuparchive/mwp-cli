const paths = require('./paths');
module.exports = require(path.resolve(paths.repoRoot, 'package.json')).config;
