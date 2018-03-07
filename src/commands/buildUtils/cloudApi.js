const Storage = require('@google-cloud/storage');
const bucket = Storage({
	projectId: 'meetup-prod-east4',
	keyFilename: `${process.cwd()}/client-secret.json`,
}).bucket('mwp-app-build');

module.exports = {
	list: prefix => bucket.getFiles({ prefix }).then(([files]) => files),
	upload: (targetFilename, readableStream) =>
		readableStream.pipe(bucket.file(targetFilename).createWriteStream()),
};
