// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // Automatically clear mock calls and instances between every test
  clearMocks: true,
  // The directory where Jest should output its coverage files
  coverageDirectory: 'coverage',
  // A list of paths to directories that Jest should use to search for files in
  roots: ['<rootDir>/__tests__'],
};
