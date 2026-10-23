#!/usr/bin/env node
// Starts the LOCAL rebuild admin (127.0.0.1 only, per-start token, cannot publish to production).
// usage: node tools/rebuild-admin.cjs [--port 4789] [--token <hex>]
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
(async () => {
  const dir = path.join(root, 'editorial', 'rebuild-20261022', 'admin');
  const { createAdmin, loadBaseEntries } = await import(pathToFileURL(path.join(dir, 'server.mjs')).href);
  const admin = createAdmin({
    root,
    dataDir: path.join(root, 'editorial', 'rebuild-20261022', 'admin-data'),
    outputDir: path.join(root, 'output', 'rebuild-release-candidates'),
    token: arg('token'),
    baseEntries: await loadBaseEntries(),
  });
  const port = await admin.listen(Number(arg('port', 4789)));
  console.log(`rebuild admin (local only, publishing disabled)\nhttp://127.0.0.1:${port}/#token=${admin.token}`);
})().catch(e => { console.error(e); process.exit(1); });
