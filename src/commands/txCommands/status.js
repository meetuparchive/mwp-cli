const Rx = require('rxjs');
const txlib = require('./util');
const chalk = require('chalk');

module.exports = {
    command: 'status',
    description: 'get translation status of resources (branches)',
    handler: argv => {
        txlib.checkEnvVars();
        console.log(chalk.blue('checking resource status\n'));

        console.log('Incomplete Resources')
        txlib.resourcesIncomplete$
            .do(resource => { console.log(resource[0], resource[1]) })
            .toArray() // this is a hack to make resourcesIncomplete$ stop before resourcesComplete$
            .do(() => console.log('\nCompleted Resources'))
            .flatMap(() => txlib.resourcesComplete$)
            .do(console.log)
            .subscribe();
    },
};