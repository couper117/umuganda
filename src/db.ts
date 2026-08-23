/**
 * db.ts — connection pool and schema bootstrap.
 *
 * Port of db_connection.php. Two behaviours are carried over deliberately:
 *
 *  1. The schema creates itself on first run, so there is still no migration
 *     step to remember. A marker check skips the work once the tables exist.
 *  2. Query failures are logged server-side and never surfaced to the user, so
 *     MySQL internals are not disclosed in a response.
 *
 * Everything here uses the pool's prepared-statement path (`execute`), which
 * is the direct equivalent of mysqli's bind_param.
 */

import fs from 'node:fs';
import path from 'node:path';
import mysql, { type Pool, type PoolConnection, type RowDataPacket, type ResultSetHeader } from 'mysql2/promise';
import { config } from './config';

/** Append a line to the application error log. Best effort: if logging itself
 *  fails we fall back to stderr rather than throwing inside an error path. */
export function logError(message: string, detail?: unknown): void {
  const line = `[${new Date().toISOString()}] ${message}${detail === undefined ? '' : ': ' + describe(detail)}\n`;
  try {
    fs.mkdirSync(config.paths.logs, { recursive: true });
    fs.appendFileSync(path.join(config.paths.logs, 'app-error.log'), line);
  } catch {
    process.stderr.write(line);
  }
  if (!config.isProduction) {
    process.stderr.write(line);
  }
}

function describe(detail: unknown): string {
  if (detail instanceof Error) return detail.message;
  if (typeof detail === 'string') return detail;
  try {
    return JSON.stringify(detail);
  } catch {
    return String(detail);
  }
}

let pool: Pool | undefined;

/** The pool, created on first use. */
export function db(): Pool {
  if (!pool) {
    throw new Error('Database pool not initialised — call initDatabase() during startup.');
  }
  return pool;
}

/**
 * Connect, create the database if it is missing, then ensure the schema.
 * Called once from server.ts before the app starts listening, so the process
 * fails loudly at boot instead of on the first request.
 */
export async function initDatabase(): Promise<void> {
  // Connect without a database selected so we can create it if needed. This
  // mirrors the two-step connect in db_connection.php.
  const bootstrap = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    multipleStatements: false,
  });

  try {
    await bootstrap.query(
      `CREATE DATABASE IF NOT EXISTS \`${config.db.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
  } finally {
    await bootstrap.end();
  }

  pool = mysql.createPool({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    charset: 'utf8mb4',
    waitForConnections: true,
    connectionLimit: config.db.connectionLimit,
    queueLimit: 0,
    // Return DATETIME as a JS Date; formatting is the view layer's job.
    dateStrings: false,
    // Never interpolate values into SQL text. Everything goes through
    // placeholders, so this stays off.
    multipleStatements: false,
  });

  await ensureSchema();
}

/** Create the four tables if the schema has not been set up yet. */
async function ensureSchema(): Promise<void> {
  const conn = await db().getConnection();
  try {
    const [marker] = await conn.query<RowDataPacket[]>("SHOW TABLES LIKE 'admin_users'");
    if (marker.length > 0) {
      // Schema already present. Still make sure the reports indexes exist, for
      // databases created by an older version of the PHP app, and apply any
      // columns added since this database was first created.
      await backfillReportIndexes(conn);
      await backfillColumns(conn);
      return;
    }

    // Public sanitation reports.
    await conn.query(`CREATE TABLE IF NOT EXISTS \`reports\` (
      \`id\` INT(11) NOT NULL AUTO_INCREMENT,
      \`time\` DATETIME DEFAULT NULL,
      \`category\` VARCHAR(50) DEFAULT NULL,
      \`urgency\` VARCHAR(20) DEFAULT NULL,
      \`location\` VARCHAR(100) DEFAULT NULL,
      \`sector\` VARCHAR(50) DEFAULT NULL,
      \`details\` TEXT DEFAULT NULL,
      \`name\` VARCHAR(50) DEFAULT NULL,
      \`contact\` VARCHAR(50) DEFAULT NULL,
      \`ip\` VARCHAR(45) DEFAULT NULL,
      \`status\` VARCHAR(20) NOT NULL DEFAULT 'pending',
      \`district\` VARCHAR(50) DEFAULT NULL,
      \`cell\` VARCHAR(50) DEFAULT NULL,
      \`village\` VARCHAR(50) DEFAULT NULL,
      PRIMARY KEY (\`id\`),
      KEY \`idx_status\` (\`status\`),
      KEY \`idx_urgency\` (\`urgency\`),
      KEY \`idx_time\` (\`time\`),
      KEY \`idx_cell\` (\`cell\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

    // Dashboard accounts. Passwords are bcrypt digests, never plaintext.
    await conn.query(`CREATE TABLE IF NOT EXISTS \`admin_users\` (
      \`id\` INT(11) NOT NULL AUTO_INCREMENT,
      \`username\` VARCHAR(50) NOT NULL,
      \`password_hash\` VARCHAR(255) NOT NULL,
      \`created_at\` DATETIME NOT NULL,
      \`last_login\` DATETIME DEFAULT NULL,
      \`failed_attempts\` INT(11) NOT NULL DEFAULT 0,
      \`locked_until\` DATETIME DEFAULT NULL,
      \`role\` VARCHAR(20) NOT NULL DEFAULT 'leader',
      \`district\` VARCHAR(50) DEFAULT NULL,
      \`sector\` VARCHAR(50) DEFAULT NULL,
      \`cell\` VARCHAR(50) DEFAULT NULL,
      \`is_active\` TINYINT(1) NOT NULL DEFAULT 1,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`uniq_username\` (\`username\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

    // Sliding-window counters backing the rate limiter.
    await conn.query(`CREATE TABLE IF NOT EXISTS \`rate_limits\` (
      \`id\` INT(11) NOT NULL AUTO_INCREMENT,
      \`bucket\` VARCHAR(40) NOT NULL,
      \`identifier\` VARCHAR(45) NOT NULL,
      \`occurred_at\` DATETIME NOT NULL,
      PRIMARY KEY (\`id\`),
      KEY \`idx_bucket_id_time\` (\`bucket\`, \`identifier\`, \`occurred_at\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

    // Who changed or deleted what, and when.
    await conn.query(`CREATE TABLE IF NOT EXISTS \`audit_log\` (
      \`id\` INT(11) NOT NULL AUTO_INCREMENT,
      \`occurred_at\` DATETIME NOT NULL,
      \`actor\` VARCHAR(50) DEFAULT NULL,
      \`action\` VARCHAR(40) NOT NULL,
      \`target_id\` INT(11) DEFAULT NULL,
      \`detail\` VARCHAR(255) DEFAULT NULL,
      \`ip\` VARCHAR(45) DEFAULT NULL,
      PRIMARY KEY (\`id\`),
      KEY \`idx_occurred\` (\`occurred_at\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

    await backfillReportIndexes(conn);
  } finally {
    conn.release();
  }
}

/**
 * Add columns introduced after a database was first created.
 *
 * There is no migration tool, so this stands in for one: each entry is checked
 * with SHOW COLUMNS and added only when missing, which makes the whole function
 * safe to run on every boot. Names and definitions come from the fixed list
 * below and never from input, because neither can be a placeholder.
 *
 * The first admin account predates roles entirely, so any row still carrying
 * the column default is promoted to superadmin — otherwise adding roles would
 * lock the only existing operator out of their own account.
 */
async function backfillColumns(conn: PoolConnection): Promise<void> {
  const columns: ReadonlyArray<readonly [table: string, column: string, definition: string]> = [
    ['reports', 'district', "VARCHAR(50) DEFAULT NULL AFTER `status`"],
    ['reports', 'cell', "VARCHAR(50) DEFAULT NULL AFTER `district`"],
    ['reports', 'village', "VARCHAR(50) DEFAULT NULL AFTER `cell`"],
    ['admin_users', 'role', "VARCHAR(20) NOT NULL DEFAULT 'leader'"],
    ['admin_users', 'district', 'VARCHAR(50) DEFAULT NULL'],
    ['admin_users', 'sector', 'VARCHAR(50) DEFAULT NULL'],
    ['admin_users', 'cell', 'VARCHAR(50) DEFAULT NULL'],
    ['admin_users', 'is_active', 'TINYINT(1) NOT NULL DEFAULT 1'],
  ];

  let addedRole = false;

  for (const [table, column, definition] of columns) {
    const [existing] = await conn.query<RowDataPacket[]>(`SHOW COLUMNS FROM \`${table}\` LIKE ?`, [column]);
    if (existing.length > 0) continue;
    try {
      await conn.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
      if (table === 'admin_users' && column === 'role') addedRole = true;
    } catch (err) {
      logError(`Could not add column ${table}.${column}`, err);
    }
  }

  // Accounts that existed before roles did were the operator's own, so they
  // become superadmin rather than being silently demoted to a leader with no
  // cell — which would show them an empty queue and no way to fix it.
  if (addedRole) {
    try {
      await conn.query("UPDATE `admin_users` SET `role` = 'superadmin'");
      logError('Roles added: existing admin accounts promoted to superadmin');
    } catch (err) {
      logError('Could not promote existing admin accounts to superadmin', err);
    }
  }

  const [cellIndex] = await conn.query<RowDataPacket[]>("SHOW INDEX FROM `reports` WHERE Key_name = 'idx_cell'");
  if (cellIndex.length === 0) {
    try {
      await conn.query('ALTER TABLE `reports` ADD INDEX `idx_cell` (`cell`)');
    } catch (err) {
      logError('Could not add index idx_cell on reports', err);
    }
  }
}

/**
 * Add the reports indexes when they are absent. The index name is checked
 * against a fixed allow-list before it reaches the SQL text, because index
 * names cannot be passed as a placeholder.
 */
async function backfillReportIndexes(conn: PoolConnection): Promise<void> {
  const indexes: ReadonlyArray<readonly [name: string, column: string]> = [
    ['idx_status', 'status'],
    ['idx_urgency', 'urgency'],
    ['idx_time', 'time'],
  ];

  for (const [name, column] of indexes) {
    const [existing] = await conn.query<RowDataPacket[]>('SHOW INDEX FROM `reports` WHERE Key_name = ?', [name]);
    if (existing.length > 0) continue;
    try {
      await conn.query(`ALTER TABLE \`reports\` ADD INDEX \`${name}\` (\`${column}\`)`);
    } catch (err) {
      // A duplicate-key error here is expected under concurrent boots and is
      // harmless; anything else is worth a log line.
      logError(`Could not add index ${name} on reports`, err);
    }
  }
}

/**
 * A value that can be bound to a placeholder.
 *
 * mysql2 ships an `ExecuteValues` type of `string | number | bigint | ...`,
 * which omits Date, null and boolean even though the driver handles all three
 * correctly (Date becomes DATETIME, null becomes NULL, boolean becomes 0/1).
 * Declaring the accurate set here and casting once at the driver boundary keeps
 * every call site honestly typed instead of pushing `as any` outward.
 */
export type SqlValue = string | number | bigint | boolean | Date | Buffer | null;

/** Cast at the single point where our value type meets the driver's. */
function bind(params: ReadonlyArray<SqlValue>): never[] {
  return params as unknown as never[];
}

/** Run a SELECT and get typed rows back. */
export async function query<T extends RowDataPacket>(
  sql: string,
  params: ReadonlyArray<SqlValue> = [],
): Promise<T[]> {
  const [rows] = await db().execute<T[]>(sql, bind(params));
  return rows;
}

/** Run a SELECT expecting at most one row. */
export async function queryOne<T extends RowDataPacket>(
  sql: string,
  params: ReadonlyArray<SqlValue> = [],
): Promise<T | undefined> {
  const rows = await query<T>(sql, params);
  return rows[0];
}

/** Run an INSERT / UPDATE / DELETE. */
export async function execute(sql: string, params: ReadonlyArray<SqlValue> = []): Promise<ResultSetHeader> {
  const [result] = await db().execute<ResultSetHeader>(sql, bind(params));
  return result;
}

/** Close the pool. Used by the shutdown handler. */
export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
