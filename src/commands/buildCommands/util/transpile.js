const fs = require('fs');
const path = require('path');

const babel = require('babel-core');
const chalk = require('chalk');
const glob = require('glob');
const mkdirp = require('mkdirp');

const { babel: babelrc, paths } = require('../../../config');

const transpile = target => filename => {
	const options = {
		presets: babelrc.presets[target],
		plugins: babelrc.plugins[target],
		only: /.*?.jsx?$/,
	};
	const newFile = babel.transformFileSync(filename, options).code;
	const relativeFilename = path.relative(paths.srcPath, filename);
	const newPath = path.resolve(paths.transpiled[target].app, relativeFilename);
	mkdirp.sync(path.dirname(newPath));
	fs.writeFileSync(newPath, newFile);
};

const src = `${paths.srcPath}/**/*.!(test.)*`;
const transpileTarget = function(target) {
	if (!['server', 'browser'].includes(target)) {
		throw new Error(`${target} must be 'server' or 'browser'`);
	}
	console.log(chalk.blue(`transpiling ${target} source...`));
	const jsSrcFiles = glob.sync(src);
	jsSrcFiles.forEach(transpile(target));
};

transpileTarget.src = src;
transpileTarget.file = transpile;

module.exports = transpileTarget;
