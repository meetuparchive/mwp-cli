const path = require('path');

const repoRoot = process.cwd(); // expect CLI to be run from consumer repo root
const appPath = path.resolve(repoRoot, 'src');

module.exports = {
	repoRoot,
	appPath,
};
