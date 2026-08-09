<?php
/**
 * setup_admin.php — one-time creation of the first dashboard account.
 *
 * This page refuses to run once any admin account exists, so it cannot be used
 * to add accounts later. On a public deployment set SETUP_TOKEN (in
 * config.local.php or the CK_SETUP_TOKEN environment variable) and visit
 * setup_admin.php?token=YOUR_TOKEN — that closes the window between deploying
 * the code and creating your account.
 *
 * Delete this file once your account exists.
 */

require_once __DIR__ . '/lib/auth.php';

ck_session_start();
ck_send_security_headers();

$locked_reason = null;

if (ck_admin_exists($conn)) {
    $locked_reason = 'An administrator account already exists. This setup page is disabled — sign in instead.';
} elseif (SETUP_TOKEN !== '' && !hash_equals(SETUP_TOKEN, (string) ($_GET['token'] ?? $_POST['token'] ?? ''))) {
    $locked_reason = 'A valid setup token is required to use this page.';
}

$error = '';
$created = false;

if (!$locked_reason && $_SERVER['REQUEST_METHOD'] === 'POST') {
    ck_csrf_require();

    $username = $_POST['username'] ?? '';
    $password = $_POST['password'] ?? '';
    $confirm  = $_POST['confirm_password'] ?? '';

    if ($password !== $confirm) {
        $error = 'The two passwords do not match.';
    } else {
        $result = ck_create_admin($conn, $username, $password);
        if ($result['ok']) {
            $created = true;
        } else {
            $error = $result['message'];
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex, nofollow">
    <title>First-Time Setup • Clean Kigali Admin</title>
    <link rel="stylesheet" href="admin.css">
    <style>
        .auth-wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px 16px; }
        .auth-card { width: 100%; max-width: 460px; background: #fff; border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); padding: 32px 26px; }
        .auth-logo { width: 52px; height: 52px; border-radius: 14px; background: var(--secondary); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; margin-bottom: 18px; }
        .auth-card h1 { font-size: 1.45rem; margin-bottom: 6px; }
        .auth-card .auth-sub { color: var(--dark-muted); font-size: 0.9rem; margin-bottom: 24px; }
        .auth-field { margin-bottom: 16px; }
        .auth-field label { display: block; font-weight: 600; font-size: 0.85rem; margin-bottom: 6px; }
        .auth-field input { width: 100%; padding: 12px 14px; min-height: 48px; border: 1px solid var(--light-border); border-radius: var(--radius-sm); font-size: 1rem; font-family: inherit; outline: none; }
        .auth-field input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px var(--urgency-low-light); }
        .auth-hint { font-size: 0.78rem; color: var(--dark-muted); margin-top: 5px; }
        .auth-submit { width: 100%; min-height: 48px; border: none; border-radius: var(--radius-sm); background: var(--primary); color: #fff; font-weight: 700; font-size: 1rem; font-family: inherit; cursor: pointer; margin-top: 8px; }
        .auth-submit:hover { background: var(--primary-hover); }
        .auth-error { background: var(--urgency-high-light); color: #991b1b; border-radius: var(--radius-sm); padding: 12px 14px; font-size: 0.88rem; font-weight: 600; margin-bottom: 18px; }
        .auth-ok { background: var(--urgency-low-light); color: #065f46; border-radius: var(--radius-sm); padding: 14px; font-size: 0.9rem; font-weight: 600; margin-bottom: 18px; }
        .auth-note { background: var(--urgency-medium-light); color: #92400e; border-radius: var(--radius-sm); padding: 12px 14px; font-size: 0.83rem; margin-top: 18px; }
        .auth-back { display: block; text-align: center; margin-top: 20px; color: var(--dark-muted); font-size: 0.85rem; text-decoration: none; }
    </style>
</head>
<body class="admin-body">
    <div class="auth-wrap">
        <div class="auth-card">
            <div class="auth-logo">CK</div>

            <?php if ($locked_reason): ?>
                <h1>Setup Unavailable</h1>
                <p class="auth-sub"><?= e($locked_reason) ?></p>
                <a href="login.php" class="auth-submit" style="display:block;text-align:center;line-height:48px;text-decoration:none;">Go to Sign In</a>

            <?php elseif ($created): ?>
                <h1>Account Created</h1>
                <div class="auth-ok">
                    Your administrator account is ready. You can now sign in to the dashboard.
                </div>
                <div class="auth-note">
                    <strong>Before going live:</strong> delete <code>setup_admin.php</code> from the server. It has
                    disabled itself, but removing it entirely is one less thing to reason about.
                </div>
                <a href="login.php" class="auth-submit" style="display:block;text-align:center;line-height:48px;text-decoration:none;margin-top:16px;">Go to Sign In</a>

            <?php else: ?>
                <h1>First-Time Setup</h1>
                <p class="auth-sub">No administrator account exists yet. Create one to secure the dashboard.</p>

                <?php if ($error): ?>
                    <div class="auth-error" role="alert"><?= e($error) ?></div>
                <?php endif; ?>

                <form method="POST" autocomplete="off">
                    <?= ck_csrf_field() ?>
                    <?php if (SETUP_TOKEN !== ''): ?>
                        <input type="hidden" name="token" value="<?= e($_GET['token'] ?? $_POST['token'] ?? '') ?>">
                    <?php endif; ?>

                    <div class="auth-field">
                        <label for="username">Username</label>
                        <input type="text" id="username" name="username" required autofocus
                               maxlength="50" autocapitalize="none" autocorrect="off" spellcheck="false">
                        <div class="auth-hint">3–50 characters: letters, numbers, dot, underscore or hyphen.</div>
                    </div>

                    <div class="auth-field">
                        <label for="password">Password</label>
                        <input type="password" id="password" name="password" required maxlength="200">
                        <div class="auth-hint">At least 12 characters, including letters and numbers.</div>
                    </div>

                    <div class="auth-field">
                        <label for="confirm_password">Confirm Password</label>
                        <input type="password" id="confirm_password" name="confirm_password" required maxlength="200">
                    </div>

                    <button type="submit" class="auth-submit">Create Administrator Account</button>
                </form>
            <?php endif; ?>

            <a href="index.php" class="auth-back">← Back to the public portal</a>
        </div>
    </div>
</body>
</html>
