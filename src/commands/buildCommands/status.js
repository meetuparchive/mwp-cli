const { URLSearchParams } = require('url');
const { promisify } = require('util');
const request = require('request');

// hard-coded to .com, not .org - Travis is migrating everyting to .com
// but in the interim this script will not work with travis-ci.org builds
const TRAVIS_API_URL = 'https://api.travis-ci.com';

const _get = promisify(request.get);
const _post = promisify(request.post);
const get = (path, options = {}) => _get(`${TRAVIS_API_URL}${path}`, options);
const post = (path, options = {}) => _post(`${TRAVIS_API_URL}${path}`, options);

// Travis API needs auth token and repo to search for data
// https://developer.travis-ci.com/
const getTravisApi = ({ token, repo }) => {
	const headers = {
		'Travis-API-Version': 3,
		Authorization: `token ${token}`,
	};
	return {
		build: {
			cancel: id =>
				post(`/build/${id}/cancel`)
					.then(({ body }) => {
						console.log(`Canceled build ${id}`);
					})
					.catch(console.error),
			// https://developer.travis-ci.com/resource/build#find
			get: id =>
				get(`/build/${id}`, { headers }).then(({ body }) =>
					JSON.parse(body)
				),
			latest: (repo, prNumber) => {
				// 'latest' build of interest are _active_ builds only (started/created)
				// need PR number for PR builds in order to filter all recent PR builds
				// for those matching the current PR.
				const params = new URLSearchParams();
				params.append('state', 'started,created');
				params.append('sort_by', 'started_at:desc');
				params.append('event_type', prNumber ? 'pull_request' : 'push');
				params.append('limit', '10'); //
				return get(
					`/repo/${encodeURIComponent(
						repo
					)}/builds${params.toString()}`,
					{ headers }
				)
					.then(resp => JSON.parse(resp.body).builds || [])
					.then(builds => {
						const matchingBuilds = prNumber
							? builds.filter(
									b =>
										b.pull_request_number.toString() ===
										prNumber
							  )
							: builds || [];
						if (matchingBuilds.length === 0) {
							return null;
						}
						return matchingBuilds[0];
					})
					.catch(console.error);
			},
		},
	};
};

// make a function that will test if a second build started within the
// `minInterval` time between builds
const makeTestShortInterval = (build1, minInterval) => build2 => {
	if (!build2) {
		// nothing running
		return false;
	}
	const start1 = new Date(build1.started_at);
	const start2 = new Date(build2.started_at);
	if (start2 - start1 > minInterval) {
		console.log(`Newer build ${build2.id} started at ${build2.started_at}`);
		return true;
	}
	// build2 started after the min interval - can be ignored
	return false;
};

module.exports = {
	command: 'status',
	description: 'check build status',
	builder: yargs =>
		yargs
			.options({
				autoCancel: {
					default: false,
					describe:
						'Cancel the build if a newer one started recently',
				},
				id: {
					default: process.env.TRAVIS_BUILD_ID,
					demandOption: true,
					describe: 'The build ID to check (not the build number)',
				},
				repo: {
					default: process.env.TRAVIS_REPO_SLUG,
					demandOption: true,
					describe: '{owner}/{repoName} for the build repo',
				},
				prNumber: {
					default:
						process.env.TRAVIS_PULL_REQUEST_BRANCH && // empty string if not PR
						process.env.TRAVIS_PULL_REQUEST, // "false" if not PR
					demandOption: false,
					describe: 'for PR builds, the PR number',
				},
				token: {
					default: process.env.TRAVIS_API_TOKEN,
					demandOption: true,
					describe: 'Token that will be used to auth with Travis API',
				},
				minInterval: {
					default: 1000 * 60 * 15, // 15 min
					describe: 'Minimum time between builds in ms',
				},
			})
			.implies('minInterval', 'autoCancel'),
	handler: argv => {
		const { autoCancel, id, token, prNumber, repo, minInterval } = argv;
		const travisApi = getTravisApi({ token, repo });
		travisApi.build.get(id).then(build => {
			console.log(`Build ${id} started at ${build.started_at}`);
			console.log(`Status: ${build.state}`);
			if (!autoCancel) {
				// status reported, nothing else to do
				return;
			}
			// need to auto-cancel if there's a newer build started less than
			// `minInterval` after current build
			const testShortInterval = makeTestShortInterval(build, minInterval);
			travisApi.build
				.latest(repo, prNumber !== 'false' && prNumber)
				.then(testShortInterval)
				.then(
					isNewer =>
						isNewer ? travisApi.build.cancel(id) : Promise.resolve()
				)
				.catch(console.error);
		});
	},
};
