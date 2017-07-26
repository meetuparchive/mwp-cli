/**
 * Jest will automatically apply this mock for every call to the `request`
 * package when running tests. This means that the network will not be hit by
 * unit/integration tests.
 *
 * The characteristics of the mocked request can be changed by calling
 * `request.__setMockResponse` before each test in order to supply the
 * `response` and `body` arguments to the request package's callback function.
 *
 * Alternatively, you can supply a handler function that will be used to
 * generate the `response` and `body` arguments based on the `requestOpts`
 * input to the `request()` call - you can use this form to dynamically change
 * the response based on the request parameters, e.g. the requested URL or
 * querystring
 *
 * @example
 * ```
 * // some.test.js
 * import request from 'request';
 *
 * // static response + body
 * request.__setMockResponse(
 * 	{ headers, statusCode, ... },
 * 	JSON.stringify({ foo: 'bar' })
 * );
 *
 * // handler function
 * request.__setMockResponse(
 *   (requestOpts) => {
 *   requestOpts
 *
 *   }
 *
 * ...
 * expect(response.foo).toEqual('bar')
 * ```
 *
 * @module mockRequest
 */

 /*
let mockResponse = {
	headers: {},
	statusCode: 200,
	elapsedTime: 2,
	request: {
		uri: {
			query: 'foo=bar',
			pathname: '/foo',
		},
		method: 'get',
	},
};
let mockBody = '{}';
const staticMockHandler = () => ({
	response: mockResponse,
	body: mockBody,
});
let mockHandler = staticMockHandler;
console.log('IS THIS LOADED');
const request = jest.fn((requestOpts, cb) => {
    console.log('IN THE MOCK');
	const { response, body } = mockHandler(requestOpts);
	if (!response) {
		throw new Error(
			'the __setMockResponse handler in your test must return a `response` property'
		);
	}
	response.elapsedTime = response.elapsedTime || 10;
	return setTimeout(() => cb(null, response, body || ''), response.elapsedTime);
});

request.__setMockResponse = (responseOrHandler, body) => {
    console.log("SET MOCK RESPONSE")
	if (typeof responseOrHandler === 'function') {
		mockHandler = responseOrHandler;
		return;
	}
	mockHandler = staticMockHandler;
	mockResponse = responseOrHandler;
	mockBody = body;
};
*/

/*
transifex.__setMockResponse = (responseOrHandler, body) => {
	console.log("SET MOCK RESPONSE")
	/*
	if (typeof responseOrHandler === 'function') {
		mockHandler = responseOrHandler;
		return;
	}
	mockHandler = staticMockHandler;
	mockResponse = responseOrHandler;
	mockBody = body;
	//*
};
*/

/*
*/
//const transifex = jest.genMockFromModule('transifex');
const transifex = require.requireActual('transifex');
transifex.prototype.projectInstanceMethods = (project, cb) => {
	cb(null,{
		resources: [
			{ slug: 'MW-1168_gh_delete_discussion',
    			name: 'MW-1168_gh_delete_discussion' },
			{ slug: 'MW-1454_memberSample',
				name: 'MW-1454_memberSample' },
		]
	});
};

transifex.prototype.resourcesInstanceMethods = (project, slug, cb) => {
	const response = { 
		'MW-1168_gh_delete_discussion' : {
			slug : 'MW-1168_gh_delete_discussion',
			last_update: '2017-07-20T18:53:47.836'
		},
		'MW-1454_memberSample' : {
			slug : 'MW-1454_memberSample',
			last_update: '2017-07-20T20:02:24.497'
		}
	};
	cb(null, response[slug]);

};

module.exports = transifex;
