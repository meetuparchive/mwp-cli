const chalk = require('chalk');
const { Chromeless } = require('chromeless');

const { CI_BUILD_NUMBER } = process.env;
function run(versionId) {
	const subdomain = `${versionId}-dot-mup-web-dot-meetup-prod-east4`;
	const testUrl = `http://${subdomain}.appspot.com/Automation-One`;
	const chromeless = new Chromeless({ launchChrome: !process.env.CI });

	console.log(`Canary testing version ${versionId}...`);
	return chromeless
		.goto(testUrl)
		.wait('.eventCard--link')
		.evaluate(() => {
			Array.from(document.querySelectorAll('.sticky--top')).map(el =>
				el.remove()
			);
		})
		.scrollToElement('.eventCard--link')
		.click('.eventCard--link')
		.wait('.eventPageHead', 10000)
		.end()
		.then(
			() => {
				console.log('Canary test success');
			},
			err => {
				console.error(chalk.red('*** Canary test failed ***'));
				console.error(chalk.red(testUrl));
				console.error(err);
				process.exit(1); // force non-zero exit
			}
		);
}

if (require.main === module) {
	// called directly by Node
	run(CI_BUILD_NUMBER);
}

module.exports = run;
