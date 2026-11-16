// Preloaded in subprocesses: any attempted transport fails the test process.
import { syncBuiltinESMExports } from 'node:module';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import tls from 'node:tls';
import dns from 'node:dns';
const deny = () => { throw new Error('NETWORK_FORBIDDEN'); };
globalThis.fetch = deny;
for (const mod of [http,https]) for (const key of ['request','get']) mod[key]=deny;
for (const mod of [net,tls]) for (const key of ['connect','createConnection']) if(key in mod) mod[key]=deny;
for (const key of ['lookup','resolve','resolve4','resolve6','reverse']) {dns[key]=deny;if(key in dns.promises)dns.promises[key]=deny;}
syncBuiltinESMExports();
