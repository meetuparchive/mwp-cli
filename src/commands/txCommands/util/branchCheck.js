const { gitBranch$ } = require('./gitHelpers');

// don't run against master! will delete trn content on transifex
const branchCheck$ = gitBranch$.do(branchName => {
  if (branchName === 'master') {
    console.log(
      'do not run this script on master. it will kill the master resource on Transifex.'
    );
    process.exit(0);
  }
});

module.exports = branchCheck$;
