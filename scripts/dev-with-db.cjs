/**
 * Starts PGLite server in background (no --run to avoid ECONNRESET on migrate disconnect),
 * waits for port 5432, runs migrations, then starts Next and Spotlight.
 */
const { spawn } = require('node:child_process');
const net = require('node:net');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const isWin = process.platform === 'win32';
const nodeBin = path.dirname(process.execPath);
const NPX = path.join(nodeBin, isWin ? 'npx.cmd' : 'npx');
const PGLITE_SERVER_JS = path.join(
  ROOT,
  'node_modules',
  '@electric-sql',
  'pglite-socket',
  'dist',
  'scripts',
  'server.js',
);

function npxCmd(args) {
  if (isWin) {
    const quoted = NPX.includes(' ') ? `"${NPX.replace(/"/g, '""')}"` : NPX;
    return [quoted, ...args].join(' ');
  }
  return [NPX, ...args];
}

function spawnNpx(args, opts) {
  if (isWin) {
    const cmd = npxCmd(args);
    return spawn(cmd, [], { shell: true, cwd: ROOT, ...opts });
  }
  return spawn(NPX, args, { cwd: ROOT, ...opts });
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function waitForPort(host, port, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tryConnect = () => {
      const socket = new net.Socket();
      const onError = () => {
        socket.destroy();
        if (Date.now() - start > timeoutMs) {
          reject(new Error('Timeout waiting for port'));
        } else {
          setTimeout(tryConnect, 100);
        }
      };
      socket.once('error', onError);
      socket.once('connect', () => {
        socket.destroy();
        resolve();
      });
      socket.connect(port, host);
    };
    tryConnect();
  });
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: 'inherit', cwd: ROOT, ...opts });
    p.on('error', reject);
    p.on('exit', code => (code === 0 ? resolve() : reject(new Error(`Exit ${code}`))));
  });
}

async function main() {
  const server = spawn(process.execPath, [PGLITE_SERVER_JS, '--db', 'local.db'], {
    stdio: 'pipe',
    cwd: ROOT,
    detached: false,
  });

  server.stderr?.on('data', d => process.stderr.write(d));
  server.stdout?.on('data', d => process.stdout.write(d));
  server.on('error', (err) => {
    console.error('PGLite server error:', err);
  });

  const onExit = () => {
    try {
      server.kill();
    } catch {}
    process.exit();
  };
  process.on('SIGINT', onExit);
  process.on('SIGTERM', onExit);

  await waitForPort('127.0.0.1', 5432);
  await delay(1500);
  await run('node', [path.join(__dirname, 'run-db-migrate.cjs')]);

  const app = spawnNpx(['run-p', 'dev:next', 'dev:spotlight'], {
    stdio: 'inherit',
  });
  app.on('exit', (code) => {
    server.kill();
    process.exit(code ?? 0);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
