import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = join(dirname(fileURLToPath(import.meta.url)), 'check-supabase-grants.mjs');

function run(files) {
  const dir = mkdtempSync(join(tmpdir(), 'grants-'));
  try {
    for (const [name, sql] of Object.entries(files)) writeFileSync(join(dir, name), sql);
    const r = spawnSync(process.execPath, [script, dir], { encoding: 'utf8' });
    return { code: r.status, err: r.stderr };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('missing grants fail', () => {
  const r = run({ '20261101000000_a.sql': 'create table public.widgets (id int);' });
  assert.equal(r.code, 1);
  for (const role of ['anon', 'authenticated', 'service_role']) {
    assert.match(r.err, new RegExp(`20261101000000_a.sql: widgets missing grant for ${role}`));
  }
});

test('partial grants fail for the missing role only', () => {
  const r = run({
    '20261101000000_a.sql': 'create table widgets (id int); grant select on table public.widgets to anon, authenticated;',
  });
  assert.equal(r.code, 1);
  assert.match(r.err, /widgets missing grant for service_role/);
  assert.doesNotMatch(r.err, /missing grant for anon/);
});

test('all three roles pass (separate statements, quoted names)', () => {
  const r = run({
    '20261101000000_a.sql': `create table if not exists "public"."widgets" (id int);
      grant select on "public"."widgets" to anon;
      grant all on table public.widgets to authenticated, service_role;`,
  });
  assert.equal(r.code, 0, r.err);
});

test('pre-20261030 file without grants passes', () => {
  const r = run({ '20261029235959_old.sql': 'create table public.widgets (id int);' });
  assert.equal(r.code, 0, r.err);
});

test('non-public schema passes', () => {
  const r = run({ '20261101000000_a.sql': 'create table private.widgets (id int); create table "auth"."x" (id int);' });
  assert.equal(r.code, 0, r.err);
});

test('all tables in schema public passes', () => {
  const r = run({
    '20261101000000_a.sql':
      'create table public.widgets (id int); grant all on all tables in schema public to anon, authenticated, service_role;',
  });
  assert.equal(r.code, 0, r.err);
});
