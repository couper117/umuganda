/**
 * seed-admin.js — create a development administrator account.
 *
 * The dashboard cannot be opened until one account exists, and /setup disables
 * itself the moment one does, so this exists to get a local environment to a
 * usable state without hand-typing credentials into a form.
 *
 * This is a DEVELOPMENT convenience. On a real deployment, create the account
 * through /setup with a password you chose, and set SETUP_TOKEN first.
 *
 *   node scripts/seed-admin.js <username> <password>
 *
 * It refuses to overwrite an existing account of the same name, and it applies
 * exactly the same password rules the application does, so a seeded account is
 * never weaker than one created through the form.
 */

'use strict';

require('dotenv/config');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

const [, , username, password] = process.argv;

if (!username || !password) {
  process.stderr.write('Usage: node scripts/seed-admin.js <username> <password>\n');
  process.exit(1);
}

if (!/^[A-Za-z0-9._-]{3,50}$/.test(username)) {
  process.stderr.write('Username must be 3-50 characters: letters, numbers, dot, underscore or hyphen.\n');
  process.exit(1);
}

if (password.length < 12 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
  process.stderr.write('Password must be at least 12 characters and contain both letters and numbers.\n');
  process.exit(1);
}

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'umuganda',
  });

  try {
    const [existing] = await conn.execute('SELECT id FROM admin_users WHERE username = ?', [username]);
    if (existing.length > 0) {
      process.stderr.write(`An account named "${username}" already exists. Nothing changed.\n`);
      process.exitCode = 1;
      return;
    }

    // Must match BCRYPT_ROUNDS in services/admins.ts. A weaker cost here would
    // be detected as stale on first sign-in and silently rehashed, which works
    // but means the stored digest was briefly weaker than the app's standard.
    const hash = await bcrypt.hash(password, 12);

    await conn.execute(
      // Explicitly superadmin: the column default is 'leader', which with no cell
      // would be an account that can see nothing and create nothing.
      "INSERT INTO admin_users (username, password_hash, created_at, failed_attempts, role) VALUES (?, ?, ?, 0, 'superadmin')",
      [username, hash, new Date()],
    );

    await conn.execute(
      'INSERT INTO audit_log (occurred_at, actor, action, detail, ip) VALUES (?, ?, ?, ?, ?)',
      [new Date(), 'seed-script', 'admin_created', `Seeded account ${username}`, '127.0.0.1'],
    );

    const [count] = await conn.execute('SELECT COUNT(*) AS c FROM admin_users');
    process.stdout.write(`Created "${username}". admin_users now holds ${count[0].c} account(s).\n`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  process.stderr.write(`Failed: ${err.message}\n`);
  process.exit(1);
});
