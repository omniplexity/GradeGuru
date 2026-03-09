const fs = require('fs');
const path = require('path');

class PluginManager {
  constructor(baseDir) {
    this.baseDir = baseDir;
  }

  listPlugins() {
    if (!fs.existsSync(this.baseDir)) {
      return [];
    }

    return fs.readdirSync(this.baseDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => {
        const manifestPath = path.join(this.baseDir, entry.name, 'manifest.json');
        if (!fs.existsSync(manifestPath)) {
          return null;
        }
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        return {
          id: manifest.id || entry.name,
          name: manifest.name || entry.name,
          version: manifest.version || '0.0.0',
          description: manifest.description || '',
          permissions: manifest.permissions || [],
        };
      })
      .filter(Boolean);
  }
}

module.exports = {
  PluginManager,
};
