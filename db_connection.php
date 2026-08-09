<?php
/**
 * db_connection.php
 * Database connection and schema bootstrap for the Clean Kigali report system.
 *
 * Credentials now come from config.php (env-overridable) rather than being
 * hard-coded here. Connection and query failures are logged server-side; users
 * only ever see a generic message, so MySQL internals are never disclosed.
 */

require_once __DIR__ . '/config.php';

if (!isset($conn)) {

    /**
     * Write a message to the application error log.
     */
    function ck_log($message) {
        if (!is_dir(LOG_DIR)) {
            @mkdir(LOG_DIR, 0750, true);
        }
        $line = '[' . date('Y-m-d H:i:s') . '] ' . $message . PHP_EOL;
        @file_put_contents(LOG_DIR . '/app-error.log', $line, FILE_APPEND | LOCK_EX);
    }

    /**
     * Abort with a generic message. Detail goes to the log, never to the page.
     */
    function ck_fail($context, $detail) {
        ck_log($context . ': ' . $detail);
        http_response_code(503);
        if (IS_PRODUCTION) {
            die('The service is temporarily unavailable. Please try again shortly.');
        }
        die('[dev] ' . htmlspecialchars($context . ': ' . $detail, ENT_QUOTES, 'UTF-8'));
    }

    // Suppress mysqli's own error output; we handle reporting ourselves.
    mysqli_report(MYSQLI_REPORT_OFF);

    // 1. Connect to the MySQL server
    $conn = @new mysqli(DB_HOST, DB_USER, DB_PASS);
    if ($conn->connect_error) {
        ck_fail('Database connection failed', $conn->connect_error);
    }

    // 2. Create the database if it does not exist
    if (!$conn->query('CREATE DATABASE IF NOT EXISTS `' . DB_NAME . '` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci')) {
        ck_fail('Failed to create database', $conn->error);
    }

    if (!$conn->select_db(DB_NAME)) {
        ck_fail('Failed to select database', $conn->error);
    }

    $conn->set_charset('utf8mb4');

    // 3. Schema. Runs once per deploy in practice — CREATE TABLE IF NOT EXISTS
    //    is cheap, but the guard below skips it entirely once the tables exist.
    $schema_marker = $conn->query("SHOW TABLES LIKE 'admin_users'");
    $schema_ready = $schema_marker && $schema_marker->num_rows > 0;

    if (!$schema_ready) {
        $tables = [];

        // Public sanitation reports.
        $tables['reports'] = "CREATE TABLE IF NOT EXISTS `reports` (
          `id` INT(11) NOT NULL AUTO_INCREMENT,
          `time` DATETIME DEFAULT NULL,
          `category` VARCHAR(50) DEFAULT NULL,
          `urgency` VARCHAR(20) DEFAULT NULL,
          `location` VARCHAR(100) DEFAULT NULL,
          `sector` VARCHAR(50) DEFAULT NULL,
          `details` TEXT DEFAULT NULL,
          `name` VARCHAR(50) DEFAULT NULL,
          `contact` VARCHAR(50) DEFAULT NULL,
          `ip` VARCHAR(45) DEFAULT NULL,
          `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
          PRIMARY KEY (`id`),
          KEY `idx_status` (`status`),
          KEY `idx_urgency` (`urgency`),
          KEY `idx_time` (`time`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

        // Dashboard accounts. Passwords are stored as password_hash() output.
        $tables['admin_users'] = "CREATE TABLE IF NOT EXISTS `admin_users` (
          `id` INT(11) NOT NULL AUTO_INCREMENT,
          `username` VARCHAR(50) NOT NULL,
          `password_hash` VARCHAR(255) NOT NULL,
          `created_at` DATETIME NOT NULL,
          `last_login` DATETIME DEFAULT NULL,
          `failed_attempts` INT(11) NOT NULL DEFAULT 0,
          `locked_until` DATETIME DEFAULT NULL,
          PRIMARY KEY (`id`),
          UNIQUE KEY `uniq_username` (`username`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

        // Sliding-window counters backing the rate limiter.
        $tables['rate_limits'] = "CREATE TABLE IF NOT EXISTS `rate_limits` (
          `id` INT(11) NOT NULL AUTO_INCREMENT,
          `bucket` VARCHAR(40) NOT NULL,
          `identifier` VARCHAR(45) NOT NULL,
          `occurred_at` DATETIME NOT NULL,
          PRIMARY KEY (`id`),
          KEY `idx_bucket_id_time` (`bucket`, `identifier`, `occurred_at`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

        // Who changed or deleted what, and when.
        $tables['audit_log'] = "CREATE TABLE IF NOT EXISTS `audit_log` (
          `id` INT(11) NOT NULL AUTO_INCREMENT,
          `occurred_at` DATETIME NOT NULL,
          `actor` VARCHAR(50) DEFAULT NULL,
          `action` VARCHAR(40) NOT NULL,
          `target_id` INT(11) DEFAULT NULL,
          `detail` VARCHAR(255) DEFAULT NULL,
          `ip` VARCHAR(45) DEFAULT NULL,
          PRIMARY KEY (`id`),
          KEY `idx_occurred` (`occurred_at`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

        foreach ($tables as $name => $sql) {
            if (!$conn->query($sql)) {
                ck_fail("Failed to verify/create `$name` table", $conn->error);
            }
        }

        // Backfill indexes on a pre-existing reports table created before this
        // version. Duplicate-key errors here are expected and harmless.
        foreach (['idx_status' => 'status', 'idx_urgency' => 'urgency', 'idx_time' => 'time'] as $idx => $col) {
            $exists = $conn->query("SHOW INDEX FROM `reports` WHERE Key_name = '$idx'");
            if ($exists && $exists->num_rows === 0) {
                @$conn->query("ALTER TABLE `reports` ADD INDEX `$idx` (`$col`)");
            }
        }
    }
}
