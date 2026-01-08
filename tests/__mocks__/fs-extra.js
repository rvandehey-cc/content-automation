// Mock fs-extra for testing
export default {
  pathExists: jest.fn(),
  readFile: jest.fn(),
  writeFile: jest.fn(),
  readJson: jest.fn(),
  writeJson: jest.fn(),
  ensureDir: jest.fn(),
  readdir: jest.fn(),
  remove: jest.fn(),
  copy: jest.fn(),
};

