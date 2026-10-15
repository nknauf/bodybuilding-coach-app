# T04 / GitHub #10 — isolated tenant fixtures

Verified: 2026-10-14. Completed locally; no deployment or commit.
Baseline HEAD: `fffddf38c862d25b85da2d5a5152fc1fba14ff73` plus pre-existing dirty work and the documented T03/T04 changes. Node 22.23.3, npm 10.9.9, Vitest 4.1.10, Prisma 7.9.1.

## Scope / changes

- `tests/integration/fixtures.ts`: two coaches, two clients, days and workouts with unique IDs/emails and fixed dates; all creation and callback writes use one rollback-only interactive transaction. Only the private rollback sentinel is consumed. Setup/assertion/connection failures propagate. No deletion sweeps or broad seed.
- `tests/integration/fixtures.test.ts`: six offline regressions for fixture shape, disjoint identities, successful rollback and failure propagation.
- `tests/integration/tenant-database.test.ts`: positive existence controls, specific foreign-key failure, reassignment/cascade checks, repeatability and forced mid-test failure cleanup. All five tests check fixture absence afterward.
- `docs/MANUAL_TESTING.md`: migrated disposable database prerequisite, seed-free execution, transaction-client limitation.
- Issue index, roadmap, decisions and this evidence record synchronized. No application runtime or schema files changed by this task.

Dependency restoration was separately approved: only four missing transitive `@emnapi` lock entries added. Structural comparison against HEAD confirms all 945 existing package entries and root lock metadata unchanged. No top-level dependencies added/upgraded. Normal `npm ci` and Prisma generation succeeded during T03 verification; final minimized lock passed offline dry-run installation.

## Fresh verification

| Check | Result |
|---|---|
| `env -u RUN_DATABASE_TESTS -u DAY_TEST_DATABASE_URL npm test` | 205 passed; 9 database tests skipped; 29 files passed, 2 skipped |
| `npm run typecheck` | Passed: Next typegen and project TypeScript |
| ESLint, all six integration helper/test files | Passed |
| Prettier check, the three T04 TypeScript files | Passed |
| Tenant suite against isolated local PostgreSQL engine, twice | 5/5 passed each run |
| Post-run database assertions, both runs | Fixture tables empty; unrelated sentinel user unchanged |
| Independent read-only code review | No findings; reviewer independently ran 6 fixture tests and scoped lint |

Commands for scoped checks:

```bash
npx eslint tests/integration/{fixtures.ts,fixtures.test.ts,tenant-database.test.ts,database-test-target.ts,test-database-target.test.ts,client-days-postgres.test.ts}
npx prettier --check tests/integration/{fixtures.ts,fixtures.test.ts,tenant-database.test.ts}
```

### Database evidence boundaries

Local `psql`/PostgreSQL and usable Docker were unavailable. Verification used already-installed transitive PGlite and PGlite socket packages, plus Next's bundled WebSocket server, as a temporary localhost-only transport for the actual Prisma Neon adapter. All existing migrations were applied only to a fresh in-memory PostgreSQL engine. Two complete suite runs shared that engine with an unrelated sentinel user; external queries checked empty fixture tables and the unchanged sentinel after each run. This includes deliberate callback failure and reassignment rollback.

This proves these fixture/query/constraint paths against local PostgreSQL, **not hosted Neon, concurrency/load, production schema, HTTP authorization or browser workflows**. The ClientDay `psql` suite was not run; it remains part of T05's baseline gap. No production services were accessed.

The normal tenant command remains documented in [manual testing](../../../docs/MANUAL_TESTING.md). Apply migrations only to a dedicated disposable database; no seed is required. Repeat that command twice when validating a hosted disposable Neon target. Fixture callbacks must use `tx`; writes through an unrelated client are not covered by the rollback contract. Tests needing committed fixtures across connections require a separate design.

## Remaining risks / next task

- T03's operator acknowledgement cannot prove a target is disposable; use test-only credentials and approved targets.
- Rollback fixtures intentionally cannot exercise cross-connection or browser workflows.
- Full build, repository-wide lint and hosted/migration rehearsals are not certified here. Next: **T05 / GitHub #11**, reproducible quality baseline. Broader T01 release ownership remains open.
- Existing unrelated dirty work, nested project and AGENTS.md were not rewritten. Changes remain uncommitted and must be scoped during release review.

## Reproduction artifact: temporary local verification harness

This is an evidence snapshot, not a supported new test runner or dependency contract. It relies on the currently locked transitive packages and Node 22 native WebSocket. To reproduce from the project root, create `/tmp/formlyst-t04`, save the following as `/tmp/formlyst-t04/run-local.mjs`, and run `node /tmp/formlyst-t04/run-local.mjs`. It creates only an in-memory database and loopback listeners, writes temporary Vitest configuration, and closes its resources; it does not load dotenv or connect to the application database. Do not copy its unencrypted loopback transport settings into application configuration.

```javascript
import {createRequire} from 'node:module';
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {connect} from 'node:net';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import assert from 'node:assert/strict';
const root=process.cwd();const require=createRequire(root+'/package.json');
const {PGlite}=require('@electric-sql/pglite');
const {PGLiteSocketServer}=require('@electric-sql/pglite-socket');
const {WebSocketServer}=require('next/dist/compiled/ws');
const db=await PGlite.create();let pg,ws;
try {
 for(const name of readdirSync(root+'/prisma/migrations').filter(n=>/^\d/.test(n)).sort()) await db.exec(readFileSync(root+'/prisma/migrations/'+name+'/migration.sql','utf8'));
 await db.exec(`INSERT INTO "User" (id,email,"firstName","lastName",role,"updatedAt") VALUES ('99999999-0000-4000-8000-000000000001','untouched@sentinel.example.test','Sentinel','Untouched','ADMIN',now())`);
 pg=new PGLiteSocketServer({db,port:0,host:'127.0.0.1'});await pg.start();
 const pgPort=Number(pg.getServerConn().split(':').at(-1));assert.ok(pgPort>0);
 ws=new WebSocketServer({port:0,host:'127.0.0.1'});await once(ws,'listening');
 const wsPort=ws.address().port;
 ws.on('connection',(socket)=>{
  const tcp=connect({host:'127.0.0.1',port:pgPort});
  socket.on('message',data=>tcp.write(data));tcp.on('data',data=>{if(socket.readyState===1)socket.send(data)});
  tcp.on('error',()=>socket.close());socket.on('error',()=>tcp.destroy());
  socket.on('close',()=>tcp.destroy());tcp.on('close',()=>socket.close());
 });
 writeFileSync('/tmp/formlyst-t04/setup.mts',`import {neonConfig} from '${root}/node_modules/@neondatabase/serverless/index.mjs';\nneonConfig.webSocketConstructor=WebSocket;\nneonConfig.wsProxy=()=> '127.0.0.1:${wsPort}';\nneonConfig.useSecureWebSocket=false;\nneonConfig.pipelineConnect=false;\nneonConfig.forceDisablePgSSL=true;\nneonConfig.poolQueryViaFetch=false;\n`);
 writeFileSync('/tmp/formlyst-t04/vitest.config.mts',`import config from '${root}/vitest.config.mts';\nexport default {...config,test:{...config.test,setupFiles:['/tmp/formlyst-t04/setup.mts']}};\n`);
 const env={...process.env,RUN_DATABASE_TESTS:'1',TEST_DATABASE_DISPOSABLE:'1',TEST_DATABASE_APPROVED_HOST:'127.0.0.1',TEST_DATABASE_URL:`postgresql://fixture:fixture@127.0.0.1:${pgPort}/formlyst_test_tenants`};
 for(const key of ['DATABASE_URL','DIRECT_URL','DAY_TEST_DATABASE_URL'])delete env[key];
 for(let run=1;run<=2;run++){
  console.log(`DISPOSABLE LOCAL POSTGRESQL RUN ${run}`);
  const child=spawn(process.execPath,[root+'/node_modules/vitest/vitest.mjs','run','tests/integration/tenant-database.test.ts','--config','/tmp/formlyst-t04/vitest.config.mts'],{cwd:root,env,stdio:'inherit'});
  const [code]=await once(child,'exit');assert.equal(code,0,`integration run ${run}`);
  const {rows}=await db.query('SELECT id,email FROM "User"');
  assert.deepEqual(rows,[{id:'99999999-0000-4000-8000-000000000001',email:'untouched@sentinel.example.test'}]);
  for(const table of ['CoachProfile','ClientProfile','ClientDay','Workout','MealEvent']){
   const r=await db.query(`SELECT count(*)::int AS n FROM "${table}"`);assert.equal(r.rows[0].n,0);
  }
  console.log('PASS: fixture tables empty; unrelated sentinel unchanged');
 }
}finally{
 if(ws){for(const s of ws.clients)s.terminate();await new Promise(r=>ws.close(r));}
 if(pg)await pg.stop();await db.close();
}
```
