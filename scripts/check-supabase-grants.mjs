#!/usr/bin/env node
// Fails when a Supabase migration (>= 20261030) creates a public table without
// explicit GRANTs to anon, authenticated and service_role in the same file.
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const CUTOFF = 20261030;
const ROLES = ['anon', 'authenticated', 'service_role'];
const IDENT = '(?:"[^"]+"|[a-zA-Z_][\\w$]*)';
const unq = (s) => (s.startsWith('"') ? s.slice(1, -1) : s.toLowerCase());

function stripComments(sql) {
  return sql.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\n]*/g, ' ');
}

function parseRoles(list) {
  return list.split(',').map((r) => unq(r.trim().replace(/^group\s+/i, '')));
}

export function checkSql(sql) {
  const src = stripComments(sql);
  const tables = [];
  const createRe = new RegExp(
    `create\\s+(?:(?:global\\s+|local\\s+)?(?:temp|temporary)\\s+|unlogged\\s+)?table\\s+(?:if\\s+not\\s+exists\\s+)?(${IDENT})(?:\\s*\\.\\s*(${IDENT}))?`,
    'gi',
  );
  for (const m of src.matchAll(createRe)) {
    if (/temp/i.test(m[0].split(/table/i)[0])) continue;
    const schema = m[2] ? unq(m[1]) : 'public';
    if (schema !== 'public') continue;
    tables.push(unq(m[2] ?? m[1]));
  }

  const grants = []; // { all: bool, tables: Set, roles: Set }
  for (const stmt of src.split(';')) {
    const g = /^\s*grant\s+([\s\S]+?)\s+on\s+([\s\S]+?)\s+to\s+([\s\S]+?)(?:\s+with\s+grant\s+option)?\s*$/i.exec(stmt);
    if (!g) continue;
    const target = g[2].trim();
    const roles = new Set(parseRoles(g[3]));
    const all = /^all\s+tables\s+in\s+schema\s+(.+)$/i.exec(target);
    if (all) {
      if (all[1].split(',').some((s) => unq(s.trim()) === 'public')) grants.push({ all: true, tables: new Set(), roles });
      continue;
    }
    const t = new RegExp(`^(?:table\\s+)?(.+)$`, 'i').exec(target);
    if (!t) continue;
    const names = new Set();
    for (const part of t[1].split(',')) {
      const p = new RegExp(`^\\s*(?:(${IDENT})\\s*\\.\\s*)?(${IDENT})\\s*$`).exec(part);
      if (p && (!p[1] || unq(p[1]) === 'public')) names.add(unq(p[2]));
    }
    if (names.size) grants.push({ all: false, tables: names, roles });
  }

  const violations = [];
  for (const table of tables) {
    for (const role of ROLES) {
      const ok = grants.some((g) => g.roles.has(role) && (g.all || g.tables.has(table)));
      if (!ok) violations.push({ table, role });
    }
  }
  return violations;
}

export function checkDir(dir) {
  const out = [];
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.sql')).sort()) {
    const ts = /^(\d{8})/.exec(f);
    if (!ts || Number(ts[1]) < CUTOFF) continue;
    for (const v of checkSql(readFileSync(join(dir, f), 'utf8'))) {
      out.push(`${f}: ${v.table} missing grant for ${v.role}`);
    }
  }
  return out;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const dir = process.argv[2] ?? 'supabase/migrations';
  let violations;
  try {
    violations = checkDir(dir);
  } catch (e) {
    console.error(`Cannot read migrations dir ${dir}: ${e.message}`);
    process.exit(2);
  }
  if (violations.length) {
    console.error(violations.join('\n'));
    console.error('\nNew public tables need GRANTs to anon, authenticated, service_role in the same migration.');
    process.exit(1);
  }
  console.log('check-supabase-grants: OK');
}
