import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

test('project identity is local and external behavior is disabled', async () => {
  const config = JSON.parse(await readFile('config/project.json', 'utf8'));
  assert.equal(config.target_country, 'AR');
  for (const key of ['telemetry_enabled', 'live_crawling_enabled', 'publication_enabled']) assert.equal(config[key], false);
  for (const key of ['public_origin', 'owner', 'repository']) assert.equal(config[key], null);
});

test('no inherited workflow is discoverable', async () => {
  const files = await readdir('.github/workflows').catch(() => []);
  assert.equal(files.filter(x => /\.ya?ml$/.test(x)).length, 0);
  assert.equal((await readdir('.github/workflows-disabled')).filter(x => /\.yml$/.test(x)).length, 5);
});

test('deployment configuration has no upstream routing and excludes all legacy functions', async () => {
  const config = JSON.parse(await readFile('vercel.json', 'utf8'));
  assert.equal(config.buildCommand, 'npm run build');
  assert.equal(config.outputDirectory, '_site-ar');
  assert.equal(config.git.deploymentEnabled, false);
  assert.deepEqual(config.rewrites, []);
  assert.deepEqual(config.redirects, []);
  const ignored = (await readFile('.vercelignore', 'utf8')).split('\n');
  assert.ok(ignored.includes('api/'));
  for (const path of ['/api/star', '/api/stars', '/api/mcp', '/ingest', '/star', '/mcp']) {
    assert.ok(!JSON.stringify(config).includes(path));
  }
});

test('build fails closed without an explicit snapshot', () => {
  const result = spawnSync(process.execPath, ['scripts/build-job-site.mjs'], { encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.ok(!/spanishtoptechcompanies\.com|posthog/i.test(result.stdout + result.stderr));
});

test('synthetic demo and explicit artifact build deny all network transports', async () => {
  const env = {...process.env,NODE_OPTIONS:`--import=${process.cwd()}/tests/jobs-ar/deny-network.mjs`};
  const run = args => {
    const result = spawnSync(process.execPath,args,{encoding:'utf8',env});
    assert.equal(result.status,0,result.stdout+result.stderr);
    return result.stdout;
  };
  const first=run(['scripts/argentina-demo.mjs']);
  const snapshot=await readFile('.cache/ar-demo/snapshot.json','utf8');
  assert.equal(first,run(['scripts/argentina-demo.mjs']));
  assert.equal(snapshot,await readFile('.cache/ar-demo/snapshot.json','utf8'));
  assert.equal(JSON.parse(snapshot).dataset_kind,'synthetic');
  run(['scripts/build-job-site.mjs','--snapshot','.cache/ar-demo/snapshot.json']);
  const manifest=JSON.parse(await readFile('_site-ar/artifact-manifest.json','utf8'));
  assert.deepEqual(manifest.functions,[]);
  assert.deepEqual((await readdir('_site-ar')).sort(),['api','artifact-manifest.json','index.html']);
  assert.deepEqual(await readdir('_site-ar/api'),['v1']);
  assert.deepEqual(await readdir('_site-ar/api/v1'),['jobs.json']);
  for(const path of ['_site-ar/index.html','_site-ar/api/v1/jobs.json','_site-ar/artifact-manifest.json']) assert.doesNotMatch(await readFile(path,'utf8'),/spanishtoptechcompanies\.com|posthog|eu\.i\.posthog|pugarte7/i);
});
