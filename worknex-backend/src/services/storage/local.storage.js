const fs = require('fs').promises;
const path = require('path');

class LocalStorageAdapter {
  constructor(root) {
    this.root = path.resolve(root);
  }

  resolve(key) {
    const candidate = path.isAbsolute(key) ? path.resolve(key) : path.resolve(this.root, key);
    if (candidate !== this.root && !candidate.startsWith(`${this.root}${path.sep}`)) {
      throw new Error('Storage key resolves outside the configured local root');
    }
    return candidate;
  }

  async put(key, buffer) {
    const destination = this.resolve(key);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, buffer, { flag: 'wx' });
    return key;
  }

  async get(key) {
    return fs.readFile(this.resolve(key));
  }

  async delete(key) {
    await fs.rm(this.resolve(key), { force: true });
  }
}

module.exports = { LocalStorageAdapter };
