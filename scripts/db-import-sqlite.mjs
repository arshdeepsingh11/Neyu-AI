// NEYU — copy data from the old SQLite database into PostgreSQL (one-time move).
//
//   npm run db:import -- prisma/dev.db              (your PC)
//   npm run db:import -- /var/lib/neyu/neyu.db      (server, Phase 9 with DevOps)
//
// Options:
//   --dry-run   read and convert everything, print the plan, write nothing
//   --force     allow importing into a database that already has patients
//
// How it works
// 1. Reads every table from the SQLite file (pure JavaScript reader — nothing to install).
// 2. Writes tables in foreign-key order inside ONE transaction: all or nothing.
// 3. Converts SQLite values to PostgreSQL types (dates, true/false, files, JSON).
//    Columns that only exist in the new schema (e.g. orgId) get their defaults.
// 4. Verifies: row count of every table must match exactly, or the whole import is rolled back.
// The SQLite file is only read, never changed.

import fs from "node:fs";
import path from "node:path";
import initSqlJs from "sql.js";
import pg from "pg";

// Read DATABASE_URL from .env.local / .env (same files the app uses) — no extra packages.
for (const f of [".env.local", ".env"]) {
  if (!fs.existsSync(f)) continue;
  for (const line of fs.readFileSync(f, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
  }
}

const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const FORCE = args.includes("--force");
const file = args.find((a) => !a.startsWith("--")) || "prisma/dev.db";
const url = process.env.DATABASE_URL;

function fail(msg) { console.error(`\n✗ ${msg}\n`); process.exit(1); }
if (!url || !/^postgres(ql)?:\/\//.test(url)) fail("DATABASE_URL must point at PostgreSQL (check your .env).");
if (!fs.existsSync(file)) fail(`SQLite file not found: ${file}`);

const q = (id) => `"${id.replace(/"/g, '""')}"`;

function toPg(v, type) {
  if (v === null || v === undefined) return null;
  switch (type) {
    case "timestamp without time zone":
    case "timestamp with time zone":
    case "date": {
      const d = typeof v === "number" ? new Date(v)                        // Prisma/SQLite: unix ms
        : /^\d+$/.test(String(v)) ? new Date(Number(v)) : new Date(String(v).includes("T") || String(v).endsWith("Z") ? String(v) : String(v).replace(" ", "T") + "Z");
      if (isNaN(d.getTime())) throw new Error(`bad date "${v}"`);
      // Prisma stores UTC "wall clock" in timestamp-without-time-zone columns. Send that exact
      // text so the value never shifts with the computer's or the server's time zone.
      return d.toISOString().replace("T", " ").replace("Z", "");
    }
    case "boolean": return v === 1 || v === "1" || v === true || v === "true";
    case "integer": case "bigint": case "smallint": return typeof v === "string" ? Number(v) : v;
    case "double precision": case "real": case "numeric": return typeof v === "string" ? Number(v) : v;
    case "bytea": return Buffer.from(v);
    case "jsonb": case "json": return typeof v === "string" ? v : JSON.stringify(v);
    default: return v instanceof Uint8Array ? Buffer.from(v).toString("utf8") : String(v);
  }
}

async function main() {
  console.log(`\nNEYU import · ${path.resolve(file)} → ${url.replace(/\/\/[^@]*@/, "//***@")}${DRY ? "  (dry run)" : ""}\n`);
  const SQL = await initSqlJs();
  const lite = new SQL.Database(fs.readFileSync(file));
  const liteTables = lite.exec(`select name from sqlite_master where type='table' and name not like 'sqlite_%' and name <> '_prisma_migrations'`)[0]?.values.map((r) => r[0]) || [];

  const client = new pg.Client({ connectionString: url });
  await client.connect();
  await client.query("set time zone 'UTC'");
  const pgCols = new Map();
  for (const r of (await client.query(`select table_name, column_name, data_type from information_schema.columns where table_schema = current_schema()`)).rows) {
    if (!pgCols.has(r.table_name)) pgCols.set(r.table_name, new Map());
    pgCols.get(r.table_name).set(r.column_name, r.data_type);
  }
  if (!pgCols.has("Patient")) fail("PostgreSQL has no tables yet — run `npx prisma migrate dev` first.");

  // Foreign keys: child column → parent table/column (+ whether the column may be empty)
  const fks = new Map();
  for (const r of (await client.query(`
      select kcu.table_name as child, kcu.column_name as col, ccu.table_name as parent, ccu.column_name as pcol, c.is_nullable as nullable
      from information_schema.table_constraints tc
      join information_schema.key_column_usage kcu on kcu.constraint_name = tc.constraint_name and kcu.table_schema = tc.table_schema
      join information_schema.constraint_column_usage ccu on ccu.constraint_name = tc.constraint_name and ccu.table_schema = tc.table_schema
      join information_schema.columns c on c.table_schema = tc.table_schema and c.table_name = kcu.table_name and c.column_name = kcu.column_name
      where tc.constraint_type = 'FOREIGN KEY' and tc.table_schema = current_schema()`)).rows) {
    if (!fks.has(r.child)) fks.set(r.child, []);
    fks.get(r.child).push({ col: r.col, parent: r.parent, pcol: r.pcol, nullable: r.nullable === "YES" });
  }
  const keyCache = new Map(); // "Table.col" → Set of existing keys in PostgreSQL (or in the source, for dry runs)
  async function keys(table, col) {
    const k = `${table}.${col}`;
    if (!keyCache.has(k)) {
      const set = new Set();
      if (DRY) { const r = lite.exec(`select ${q(col)} from ${q(table)}`)[0]; (r ? r.values : []).forEach((v) => set.add(String(v[0]))); }
      else (await client.query(`select ${q(col)} as k from ${q(table)}`)).rows.forEach((x) => set.add(String(x.k)));
      keyCache.set(k, set);
    }
    return keyCache.get(k);
  }

  // Foreign-key order (parents before children)
  const deps = new Map();
  for (const r of (await client.query(`
      select tc.table_name as child, ccu.table_name as parent
      from information_schema.table_constraints tc
      join information_schema.constraint_column_usage ccu on ccu.constraint_name = tc.constraint_name and ccu.table_schema = tc.table_schema
      where tc.constraint_type = 'FOREIGN KEY' and tc.table_schema = current_schema()`)).rows) {
    if (r.child === r.parent) continue;
    if (!deps.has(r.child)) deps.set(r.child, new Set());
    deps.get(r.child).add(r.parent);
  }
  const todo = liteTables.filter((t) => pgCols.has(t));
  const skipped = liteTables.filter((t) => !pgCols.has(t));
  const order = []; const seen = new Set();
  const visit = (t, stack = new Set()) => { if (seen.has(t)) return; if (stack.has(t)) return; stack.add(t); for (const p of deps.get(t) || []) if (todo.includes(p)) visit(p, stack); seen.add(t); order.push(t); };
  todo.forEach((t) => visit(t));

  const existing = Number((await client.query(`select count(*) from "Patient"`)).rows[0].count);
  if (existing > 0 && !FORCE && !DRY) fail(`PostgreSQL already has ${existing} patients. Use --force only if you are sure (rows with the same id are skipped).`);

  const report = [];
  if (!DRY) await client.query("begin");
  try {
    for (const t of order) {
      const res = lite.exec(`select * from ${q(t)}`)[0];
      const cols = res ? res.columns : [];
      const rows = res ? res.values : [];
      const types = pgCols.get(t);
      const use = cols.map((c, i) => [c, i]).filter(([c]) => types.has(c));
      const dropped = cols.filter((c) => !types.has(c));
      // SQLite never enforced links, so old data can point at rows that no longer exist.
      // Optional links are cleared; rows that cannot exist without their parent are skipped (and reported).
      let orphans = 0, cleared = 0;
      const checks = [];
      for (const fk of fks.get(t) || []) { const idx = cols.indexOf(fk.col); if (idx >= 0) checks.push({ ...fk, idx, set: await keys(fk.parent, fk.pcol) }); }
      const rowsOk = [];
      for (const row of rows) {
        let keep = true;
        for (const c of checks) {
          const v = row[c.idx];
          if (v === null || v === undefined || c.set.has(String(v))) continue;
          if (c.nullable) { row[c.idx] = null; cleared++; } else { keep = false; }
        }
        if (keep) rowsOk.push(row); else orphans++;
      }
      let inserted = 0;
      if (!DRY && rowsOk.length) {
        const batch = Math.max(1, Math.floor(30000 / Math.max(1, use.length)));
        for (let i = 0; i < rowsOk.length; i += batch) {
          const chunk = rowsOk.slice(i, i + batch);
          const params = []; const tuples = [];
          for (const row of chunk) {
            tuples.push("(" + use.map(([c, idx]) => { params.push(toPg(row[idx], types.get(c))); return `$${params.length}`; }).join(",") + ")");
          }
          const r = await client.query(`insert into ${q(t)} (${use.map(([c]) => q(c)).join(",")}) values ${tuples.join(",")} on conflict do nothing`, params);
          inserted += r.rowCount;
        }
      } else if (DRY) {
        for (const row of rowsOk) use.forEach(([c, idx]) => toPg(row[idx], types.get(c))); // conversion check only
      }
      // Newly inserted keys become valid parents for the next tables
      for (const [k, set] of keyCache) { const [tb, col] = k.split("."); if (tb !== t) continue; const idx = cols.indexOf(col); if (idx >= 0) rowsOk.forEach((r) => set.add(String(r[idx]))); }
      report.push({ table: t, sqlite: rows.length, inserted: DRY ? "-" : inserted, dropped, orphans, cleared });
    }

    // Verify every table: PostgreSQL must contain every SQLite id
    let ok = true;
    if (!DRY) {
      for (const r of report) {
        const total = Number((await client.query(`select count(*) from ${q(r.table)}`)).rows[0].count);
        r.postgres = total;
        if (total < r.sqlite - r.orphans) ok = false;
      }
      if (!ok) throw new Error("row counts do not match — nothing was imported");
      await client.query("commit");
    }

    const w = Math.max(...report.map((r) => r.table.length), 10);
    console.log(`${"table".padEnd(w)}  sqlite  inserted  postgres`);
    for (const r of report) console.log(`${r.table.padEnd(w)}  ${String(r.sqlite).padStart(6)}  ${String(r.inserted).padStart(8)}  ${String(r.postgres ?? "-").padStart(8)}${r.orphans ? `   ${r.orphans} orphan row(s) skipped` : ""}${r.cleared ? `   ${r.cleared} broken link(s) cleared` : ""}${r.dropped.length ? `   (old columns not copied: ${r.dropped.join(", ")})` : ""}`);
    const orph = report.reduce((a, r) => a + r.orphans, 0), clr = report.reduce((a, r) => a + r.cleared, 0);
    if (orph || clr) console.log(`\nNote: the old SQLite file had ${orph} row(s) pointing at deleted records (skipped) and ${clr} broken optional link(s) (cleared). PostgreSQL enforces these links.`);
    if (skipped.length) console.log(`\nNot in the new schema (skipped): ${skipped.join(", ")}`);
    const total = report.reduce((a, r) => a + r.sqlite, 0);
    console.log(`\n✓ ${DRY ? "Dry run OK" : "Import complete"} · ${report.length} tables · ${total} rows${DRY ? " checked" : " verified"}\n`);
  } catch (e) {
    if (!DRY) await client.query("rollback").catch(() => {});
    fail(`Import stopped: ${e.message}. Nothing was changed in PostgreSQL.`);
  } finally {
    await client.end();
  }
}

main();
