const glob = jest.requireActual('glob');
let mockFiles = [];

glob.sync = searchPattern => mockFiles;

glob.__setMockFiles = filenames => (mockFiles = filenames);

module.exports = glob;
