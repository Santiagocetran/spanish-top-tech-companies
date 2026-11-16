import { requireLocalConfig } from './argentina-config.mjs';
// Local artifact only. No network, crawling, legacy data or serverless functions.
import { readFile, mkdir, writeFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { validateSnapshot } from '../lib/jobs/snapshot.js';
await rm('_site-ar', { recursive: true, force: true });
const args = process.argv.slice(2);
const index = args.indexOf('--snapshot');
if (index < 0 || !args[index + 1] || args.some((x, i) => i !== index && i !== index + 1)) {
  console.error('SNAPSHOT_REQUIRED: use npm run build -- --snapshot <local snapshot.json>');
  process.exit(1);
}
try {
  await requireLocalConfig();
  const snapshot = JSON.parse(await readFile(resolve(args[index + 1]), 'utf8'));
  validateSnapshot(snapshot);
  await rm('_site-ar', { recursive: true, force: true });
  await mkdir('_site-ar/api/v1', { recursive: true });
  await writeFile('_site-ar/api/v1/jobs.json', JSON.stringify(snapshot, null, 2) + '\n');
  await writeFile('_site-ar/index.html', '<!doctype html><html lang="es-AR"><meta charset="utf-8"><title>Argentina Tech Jobs — prototipo local</title><h1>Prototipo local de Argentina Tech Jobs</h1><p>Datos sintéticos de prueba. Sin cobertura real, rastreo ni publicación.</p><p><a href="api/v1/jobs.json">Snapshot local validado</a></p></html>\n');
  await writeFile('_site-ar/artifact-manifest.json', JSON.stringify({kind:'local-synthetic-demo',static_files:['index.html','api/v1/jobs.json','artifact-manifest.json'],functions:[],snapshot_as_of:snapshot.generated_at}, null, 2) + '\n');
  console.log('LOCAL_BUILD_OK');
} catch {
  console.error('SNAPSHOT_INVALID');
  process.exitCode = 1;
}
