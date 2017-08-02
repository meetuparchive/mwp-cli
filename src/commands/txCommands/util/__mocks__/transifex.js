// leaving in place while i'm adding to the tests
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
