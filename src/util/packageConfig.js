const path = require('path');
const paths = require('../commands/buildCommands/config/paths');
module.exports = require(path.resolve(paths.repoRoot, 'package.json')).config;
