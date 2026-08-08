/**
 * Build for Cloudflare Pages (static export). Temporarily replaces proxy.ts with
 * proxy-static.ts.
 * Sets NEXT_PUBLIC_STATIC_EXPORT=true so next.config outputs the "out" folder.
 */
const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const proxyPath = path.join(root, 'src', 'proxy.ts');
const proxyStaticPath = path.join(root, 'src', 'proxy-static.ts');
const proxyBackupPath = path.join(root, 'src', 'proxy-backup.ts');
const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://rtectecnologia.com.br';

const sitemapPath = path.join(root, 'src', 'app', 'sitemap.ts');
const sitemapBackupPath = path.join(root, 'src', 'app', 'sitemap.ts.bak');
const robotsPath = path.join(root, 'src', 'app', 'robots.ts');
const robotsBackupPath = path.join(root, 'src', 'app', 'robots.ts.bak');
const staticRoutes = ['', '/about', '/portfolio'];
const locales = ['pt-BR', 'fr'];
const defaultLocale = 'pt-BR';

function getStaticPath(route, locale) {
  if (locale === defaultLocale) {
    return route || '';
  }

  return `/${locale}${route}`;
}

function writeStaticSeoFiles(outDir) {
  const now = new Date().toISOString();
  const sitemapEntries = staticRoutes.flatMap(route =>
    locales.map(locale => `${siteUrl}${getStaticPath(route, locale)}`),
  );
  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries.map(url => `  <url>
    <loc>${url}</loc>
    <lastmod>${now}</lastmod>
  </url>`).join('\n')}
</urlset>
`;

  const robotsTxt = `User-Agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml
`;

  fs.writeFileSync(path.join(outDir, 'sitemap.xml'), sitemapXml);
  fs.writeFileSync(path.join(outDir, 'robots.txt'), robotsTxt);
}

if (!fs.existsSync(proxyStaticPath)) {
  console.error('src/proxy-static.ts not found');
  process.exit(1);
}

// Backup proxy.ts, replace with proxy-static.ts
fs.copyFileSync(proxyPath, proxyBackupPath);
fs.copyFileSync(proxyStaticPath, proxyPath);

// Clean build output so swapped files are used
const nextDir = path.join(root, '.next');
if (fs.existsSync(nextDir)) {
  fs.rmSync(nextDir, { recursive: true });
}

// Rename sitemap and robots to hide from static build
let sitemapRestored = false;
if (fs.existsSync(sitemapPath)) {
  fs.renameSync(sitemapPath, sitemapBackupPath);
  sitemapRestored = true;
}

let robotsRestored = false;
if (fs.existsSync(robotsPath)) {
  fs.renameSync(robotsPath, robotsBackupPath);
  robotsRestored = true;
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

  // Copy default locale out/pt-BR to out/ so it serves at the root
  const outDir = path.join(root, 'out');
  const defaultLocaleDir = path.join(outDir, 'pt-BR');
  if (fs.existsSync(defaultLocaleDir)) {
    console.log(`Copying static files from ${defaultLocaleDir} to ${outDir}`);
    fs.cpSync(defaultLocaleDir, outDir, { recursive: true });
  }

  const ptBrHtml = path.join(outDir, 'pt-BR.html');
  const indexHtml = path.join(outDir, 'index.html');
  if (fs.existsSync(ptBrHtml)) {
    console.log(`Copying ${ptBrHtml} to ${indexHtml}`);
    fs.copyFileSync(ptBrHtml, indexHtml);
  }

  writeStaticSeoFiles(outDir);
} finally {
  fs.copyFileSync(proxyBackupPath, proxyPath);
  fs.unlinkSync(proxyBackupPath);
  if (sitemapRestored) {
    fs.renameSync(sitemapBackupPath, sitemapPath);
  }
  if (robotsRestored) {
    fs.renameSync(robotsBackupPath, robotsPath);
  }
}
