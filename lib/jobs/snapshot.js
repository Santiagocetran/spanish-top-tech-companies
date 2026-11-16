import { validateSnapshot as validateDomainSnapshot } from './schema.js';
import { readFile, mkdir, open, rename, unlink } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
export function validateSnapshot(snapshot) {
  validateDomainSnapshot(snapshot);
  if (!snapshot || snapshot.target_country !== 'AR' || !Array.isArray(snapshot.jobs) || !snapshot.generation_id || !Number.isFinite(Date.parse(snapshot.generated_at))) throw new Error('INVALID_SNAPSHOT');
  const ids = new Set();
  for (const job of snapshot.jobs) { if (!job.job_id || ids.has(job.job_id)) throw new Error('INVALID_SNAPSHOT_ID'); ids.add(job.job_id); }
  return snapshot;
}
export async function readSnapshot(path) { return validateSnapshot(JSON.parse(await readFile(path,'utf8'))); }
export async function writeSnapshot(path,snapshot) {
  validateSnapshot(snapshot); await mkdir(dirname(path),{recursive:true});
  const temporary = `${path}.${randomUUID()}.tmp`; let handle;
  try { handle=await open(temporary,'wx',0o600); await handle.writeFile(`${JSON.stringify(snapshot,null,2)}\n`); await handle.sync(); await handle.close(); handle=null; await rename(temporary,path); }
  finally { if(handle) await handle.close(); await unlink(temporary).catch(e=>{if(e.code!=='ENOENT') throw e;}); }
}
