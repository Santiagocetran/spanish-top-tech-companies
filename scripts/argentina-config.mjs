import { readFile } from 'node:fs/promises';
export async function requireLocalConfig() {
  const config = JSON.parse(await readFile(new URL('../config/project.json', import.meta.url), 'utf8'));
  if (config.target_country !== 'AR' || config.telemetry_enabled !== false || config.live_crawling_enabled !== false || config.publication_enabled !== false || config.public_origin !== null) throw new Error('LOCAL_CONFIGURATION_REQUIRED');
  return config;
}
