/**
 * set-password.js — reset an administrator's password from the command line.
 *
 * The in-app form at /admin/password is the normal route and should be
 * preferred: it requires the current password. This exists for the case that
 * form cannot help with — nobody knows the current password, or the account is
 * locked out — where the alternative is editing a bcrypt digest into the table
 * by hand.
 *
 *   node scripts/set-password.js <username> <new-password>
 *
 * It applies the same rules the application does, uses the same bcrypt cost,
 * clears any lockout, and signs the account out everywhere, because a password
 * reset that left existing sessions alive would not be a reset.
 *
 * Anyone who can run this already has the database credentials, so it grants no
 * access they did not have. Note that the password will sit in your shell
 * history — clear it if that matters on this machine.
 */

'use strict';

require('dotenv/config');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

const [, , username, password] = process.argv;

if (!username || !password) {
  process.stderr.write('Usage: node scripts/set-password.js <username> <new-password>\n');
  process.exit(1);
}

// Same rules as lib/validate.ts passwordProblem(), so a password set here can
// never be weaker than one set through the form.
if (password.length < 12) {
  process.stderr.write(`Password must be at least 12 characters long (got ${password.length}).\n`);
  process.exit(1);
}
if (password.length > 200) {
  process.stderr.write('Password must be 200 characters or fewer.\n');
  process.exit(1);
}
if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
  process.stderr.write('Password must contain both letters and numbers.\n');
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
    const [rows] = await conn.execute('SELECT id FROM admin_users WHERE username = ?', [username]);
    if (rows.length === 0) {
      process.stderr.write(`No account named "${username}". Nothing changed.\n`);
      process.exitCode = 1;
      return;
    }
    const id = rows[0].id;

    // Cost 12 matches BCRYPT_ROUNDS in services/admins.ts. A weaker digest
    // would be detected as stale on first sign-in and silently rehashed.
    const hash = await bcrypt.hash(password, 12);

    await conn.execute(
      'UPDATE admin_users SET password_hash = ?, failed_attempts = 0, locked_until = NULL WHERE id = ?',
      [hash, id],
    );

    // A reset that left existing sessions alive would not be a reset.
    let cleared = 0;
    try {
      const [res] = await conn.execute('DELETE FROM sessions WHERE JSON_EXTRACT(data, ?) = ?', ['$.adminId', id]);
      cleared = res.affectedRows;
    } catch (err) {
      process.stderr.write(`Warning: could not clear existing sessions (${err.message}).\n`);
    }

    await conn.execute(
      'INSERT INTO audit_log (occurred_at, actor, action, target_id, detail, ip) VALUES (?, ?, ?, ?, ?, ?)',
      [new Date(), 'set-password-script', 'password_changed', id, 'Reset from the command line', '127.0.0.1'],
    );

    process.stdout.write(
      `Password updated for "${username}". Lockout cleared. ${cleared} existing session(s) signed out.\n`,
    );
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  process.stderr.write(`Failed: ${err.message}\n`);
  process.exit(1);
});
