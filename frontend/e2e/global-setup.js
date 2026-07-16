const { execFileSync } = require('child_process');
const path = require('path');

module.exports = async function globalSetup() {
  const workspace = path.resolve(__dirname, '../..');
  const npmCli = path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
  const runNpm = (args) => execFileSync(process.execPath, [npmCli, ...args], {
    cwd: workspace,
    stdio: 'inherit',
  });
  if (process.env.PLAYWRIGHT_REBUILD_DEMO === 'true') {
    runNpm(['run', 'demo:rebuild']);
  }
  runNpm(['run', 'demo:start']);
  runNpm(['run', 'demo:health']);
};
