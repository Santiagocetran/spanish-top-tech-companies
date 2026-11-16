import { requireLocalConfig } from './argentina-config.mjs';
import { readSnapshot } from '../lib/jobs/snapshot.js';
try {
  await requireLocalConfig();
  if (process.argv.length !== 3) throw new Error();
  await readSnapshot(process.argv[2]);
  console.log('SNAPSHOT_OK');
} catch {
  console.error('SNAPSHOT_INVALID: provide an explicit local snapshot file');
  process.exitCode = 1;
}
