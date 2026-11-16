import { requireLocalConfig } from './argentina-config.mjs';
import { readFile } from 'node:fs/promises';
import { validateRegistry } from '../lib/jobs/registry.js';
try {
  await requireLocalConfig();
  const path = process.argv[2] ?? 'tests/fixtures/ar/registry.json';
  validateRegistry(JSON.parse(await readFile(path, 'utf8')));
  console.log('REGISTRY_OK');
} catch { console.error('REGISTRY_INVALID'); process.exitCode = 1; }
