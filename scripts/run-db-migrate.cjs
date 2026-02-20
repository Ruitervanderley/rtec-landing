/**
 * Runs `npm run db:migrate` using the same Node executable directory to find npm.
 * Used by pglite-server --run on Windows where "npm" is not in the spawned PATH.
 */
const { execSync } = require('node:child_process');
const path = require('node:path');

const nodeDir = path.dirname(process.execPath);
const npm = path.join(nodeDir, process.platform === 'win32' ? 'npm.cmd' : 'npm');

execSync(`"${npm}" run db:migrate`, { stdio: 'inherit', shell: true });
