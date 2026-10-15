# T05 final gap — real PostgreSQL ClientDay verification

Date: 2026-10-14. The owner explicitly approved downloading/extracting temporary PostgreSQL tooling and running a disposable database, without system installation, application dependency changes or production access.

## Result

**ClientDay suite: 4/4 tests passed twice on PostgreSQL 16.15**, using real `psql` processes and a fresh disposable cluster. [Raw sanitized output](T05/clientday-postgres.txt).

Coverage: migration backfill across five object kinds, explicit media dates/DST, cross-client day foreign keys, eight concurrent upserts sharing a day while retaining its original timezone, and stable membership versus rescheduling. This is the existing suite's coverage, not a complete migration/recovery or production rehearsal (T12/T13 remain separate).

After each run, direct SQL verified **zero `day_test_%` schemas** and an unchanged unrelated `public.fixture_sentinel` row. The server was stopped through an EXIT trap, and absence of `postmaster.pid` was confirmed. No application database or system service was accessed/modified. Temporary test-only files were retained in `/tmp`, not added as dependencies.

## Environment and tooling

Ubuntu 24.04 amd64; Node 22.23.3, npm 10.9.9, Vitest 4.1.10. Existing configured Ubuntu package metadata selected version `16.15-0ubuntu0.24.04.1`. `apt-get download` fetched only three packages, then `dpkg-deb -x` extracted them to a fresh temporary directory; neither package installation nor service startup hooks ran. Dynamic-link checks found no missing libraries. System package queries confirmed these packages were not installed.

| Download | SHA-256 |
|---|---|
| libpq5 | `3f96dd36bcd7841172c1ead4965da20a193bb9ccf9a93a3f5a3ac7f56369dbb1` |
| postgresql-16 | `d60ae76fb862cd4cca7bfdcdcdcc271c5e1d75f6b7915305ce2d962735a4b666` |
| postgresql-client-16 | `4796f72e1a7270ad8c17b1ecb025cd453f692b42c10aaf89f6b476da61761eac` |

The server listened only on `127.0.0.1` plus a private temporary Unix socket; both used SCRAM authentication with a random ephemeral password. Tests ran under `env -i`, with no inherited application/service credentials or dotenv loading. The database was named `formlyst_test_days`; T03 guards were left unchanged.

## Reproduction artifact

Run from the repository root on a compatible Ubuntu environment, **only with approval for temporary downloads/local database execution**. It does not require sudo. Use a fresh directory on every run. If the recorded package version is unavailable, review the replacement version rather than silently assuming equivalent evidence.

```bash
REPO="$PWD"
BASE=$(mktemp -d /tmp/formlyst-pg.XXXXXX)
(cd "$BASE" && apt-get download \
  postgresql-16=16.15-0ubuntu0.24.04.1 \
  postgresql-client-16=16.15-0ubuntu0.24.04.1 \
  libpq5=16.15-0ubuntu0.24.04.1)
mkdir "$BASE/root"
for pkg in "$BASE"/*.deb; do dpkg-deb -x "$pkg" "$BASE/root"; done
# Save the script below as "$BASE/verify.sh", then:
env -i PATH="$PATH" bash "$BASE/verify.sh" "$BASE" "$REPO"
```

The script checks cleanup even after a successful suite, and stops only its freshly initialized cluster. Do not point it at an existing directory or database. No real credentials should be copied into it or logs.

```bash
#!/usr/bin/env bash
set -euo pipefail
BASE="$1"
REPO="$2"
BIN="$BASE/root/usr/lib/postgresql/16/bin"
export LD_LIBRARY_PATH="$BASE/root/usr/lib/x86_64-linux-gnu"
export HOME="$BASE"
export LC_ALL=C
umask 077
python3 -c 'import secrets; print(secrets.token_hex(24))' > "$BASE/password"
"$BIN/initdb" -D "$BASE/data" -L "$BASE/root/usr/share/postgresql/16" --username=fixture --pwfile="$BASE/password" --auth=scram-sha-256 --no-locale --encoding=UTF8 > "$BASE/initdb.log"
PORT=$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1",0)); print(s.getsockname()[1]); s.close()')
mkdir "$BASE/socket"
started=0
cleanup() { if [ "$started" = 1 ]; then "$BIN/pg_ctl" -D "$BASE/data" -m fast -w stop; fi; }
trap cleanup EXIT
"$BIN/pg_ctl" -D "$BASE/data" -l "$BASE/server.log" -o "-h 127.0.0.1 -p $PORT -k $BASE/socket" -w start
started=1
PASS=$(cat "$BASE/password")
ADMIN="postgresql://fixture:$PASS@127.0.0.1:$PORT/postgres"
"$BIN/psql" -X -v ON_ERROR_STOP=1 "$ADMIN" -c 'CREATE DATABASE formlyst_test_days' > /dev/null
export DAY_TEST_DATABASE_URL="postgresql://fixture:$PASS@127.0.0.1:$PORT/formlyst_test_days"
export TEST_DATABASE_DISPOSABLE=1
export PSQL_PATH="$BIN/psql"
"$BIN/psql" --version
"$BIN/psql" -X -v ON_ERROR_STOP=1 "$DAY_TEST_DATABASE_URL" -c "CREATE TABLE public.fixture_sentinel (id integer PRIMARY KEY, note text); INSERT INTO public.fixture_sentinel VALUES (1,'preserve');" > /dev/null
cd "$REPO"
for run in 1 2; do
 echo "CLIENTDAY POSTGRESQL RUN $run"
 node node_modules/vitest/vitest.mjs run tests/integration/client-days-postgres.test.ts
 LEFT=$("$BIN/psql" -X -At -v ON_ERROR_STOP=1 "$DAY_TEST_DATABASE_URL" -c "SELECT count(*) FROM pg_namespace WHERE nspname LIKE 'day_test_%'")
 test "$LEFT" = 0
 ROW=$("$BIN/psql" -X -At -v ON_ERROR_STOP=1 "$DAY_TEST_DATABASE_URL" -c 'SELECT id,note FROM public.fixture_sentinel')
 test "$ROW" = '1|preserve'
 echo 'PASS: no day_test schemas remain; unrelated sentinel unchanged'
done
```

## Independent evidence review

Read-only verifier confirmed test counts, source coverage, package hashes, HEAD/lock identity, unchanged application build inputs and the stopped-cluster PID-file check. No substantive evidence blocker remained; stale historical status labels were clarified. GitHub #11 is closed for the local baseline only.
