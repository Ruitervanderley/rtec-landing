/**
 * Build for Cloudflare Pages (static export). Temporarily replaces proxy.ts with
 * proxy-static.ts and removes the api/counter route (Route Handlers not supported).
 * Sets NEXT_PUBLIC_STATIC_EXPORT=true so next.config outputs the "out" folder.
 */
const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const proxyPath = path.join(root, 'src', 'proxy.ts');
const proxyStaticPath = path.join(root, 'src', 'proxy-static.ts');
const proxyBackupPath = path.join(root, 'src', 'proxy-backup.ts');
const apiCounterRoute = path.join(root, 'src', 'app', '[locale]', 'api', 'counter', 'route.ts');
const apiCounterBackup = path.join(root, 'src', 'app', '[locale]', 'api', 'counter', 'route.ts.bak');
const currentUserPath = path.join(root, 'src', 'libs', 'currentUser.ts');
const currentUserPagesPath = path.join(root, 'src', 'libs', 'currentUser-pages.ts');
const currentUserBackupPath = path.join(root, 'src', 'libs', 'currentUser.ts.bak');
const currentCountPath = path.join(root, 'src', 'components', 'CurrentCount.tsx');
const currentCountPagesPath = path.join(root, 'src', 'components', 'CurrentCount-pages.tsx');
const currentCountBackupPath = path.join(root, 'src', 'components', 'CurrentCount.tsx.bak');
const counterPagePath = path.join(root, 'src', 'app', '[locale]', '(marketing)', 'counter', 'page.tsx');
const counterPagePagesPath = path.join(root, 'src', 'app', '[locale]', '(marketing)', 'counter', 'page-pages.tsx');
const counterPageBackupPath = path.join(root, 'src', 'app', '[locale]', '(marketing)', 'counter', 'page.tsx.bak');

if (!fs.existsSync(proxyStaticPath)) {
  console.error('src/proxy-static.ts not found');
  process.exit(1);
}

// Backup proxy.ts, replace with proxy-static.ts
fs.copyFileSync(proxyPath, proxyBackupPath);
fs.copyFileSync(proxyStaticPath, proxyPath);

// Backup currentUser.ts, replace with currentUser-pages.ts (stub only, no Clerk)
fs.copyFileSync(currentUserPath, currentUserBackupPath);
fs.copyFileSync(currentUserPagesPath, currentUserPath);

// Backup counter page first, replace with page-pages.tsx (no CurrentCount / headers)
if (!fs.existsSync(counterPagePagesPath)) {
  console.error('counter/page-pages.tsx not found');
  process.exit(1);
}
fs.copyFileSync(counterPagePath, counterPageBackupPath);
fs.copyFileSync(counterPagePagesPath, counterPagePath);

// Backup CurrentCount.tsx, replace with CurrentCount-pages.tsx (no headers/db)
fs.copyFileSync(currentCountPath, currentCountBackupPath);
fs.copyFileSync(currentCountPagesPath, currentCountPath);

// Backup and remove api/counter route (Route Handlers not supported in static export)
let apiRouteRestore = false;
if (fs.existsSync(apiCounterRoute)) {
  fs.renameSync(apiCounterRoute, apiCounterBackup);
  apiRouteRestore = true;
}

// Clean build output so swapped files are used
const nextDir = path.join(root, '.next');
if (fs.existsSync(nextDir)) {
  fs.rmSync(nextDir, { recursive: true });
}

try {
  const env = { ...process.env, NEXT_PUBLIC_STATIC_EXPORT: 'true' };
  const nextBin = path.join(root, 'node_modules', '.bin', 'next');
  const nextCmd = process.platform === 'win32' ? `${nextBin}.cmd` : nextBin;
  execSync(`"${nextCmd}" build --webpack`, {
    stdio: 'inherit',
    shell: true,
    cwd: root,
    env,
  });
} finally {
  fs.copyFileSync(proxyBackupPath, proxyPath);
  fs.unlinkSync(proxyBackupPath);
  fs.copyFileSync(currentUserBackupPath, currentUserPath);
  fs.unlinkSync(currentUserBackupPath);
  fs.copyFileSync(counterPageBackupPath, counterPagePath);
  fs.unlinkSync(counterPageBackupPath);
  fs.copyFileSync(currentCountBackupPath, currentCountPath);
  fs.unlinkSync(currentCountBackupPath);
  if (apiRouteRestore) {
    fs.renameSync(apiCounterBackup, apiCounterRoute);
  }
}
