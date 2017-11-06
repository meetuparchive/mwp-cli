const Rx = require('rxjs');
const txlib = require('./util');
const chalk = require('chalk');

module.exports = {
    command: 'keys',
    description: 'Get list of resources and their keys',
    handler: argv => {
        txlib.checkEnvVars();
        console.log(chalk.blue('Downloading resource data\n'));

        txlib.resources$
            .flatMap(Rx.Observable.from)
            .flatMap(resource => txlib.readResource$(resource)
                .flatMap(txlib.parsePluckTrns)
                .map(Object.keys)
                .map(keys => [resource, keys]))
            .do(([resource, keys]) => {
                console.log(resource);
                keys.forEach(key => console.log(`\t${key}`))
            })
            .subscribe();
    },
};
