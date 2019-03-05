// helper for logging status while passing along results of async call
const logSuccess = (...messageArgs) => result => {
	console.log(...messageArgs);
	return result;
};

// helper for logging error status and re-throwing error
const logError = (...messageArgs) => err => {
	console.log(...messageArgs, err);
	throw err;
};

module.exports = {
	logSuccess,
	logError,
};
