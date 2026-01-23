<?php
// db_connection.php
// Reusable database connection for Clean Kigali report system

$DB_HOST = "localhost";
$DB_USER = "root";       // your MySQL username
$DB_PASS = "";           // your MySQL password
$DB_NAME = "test"; // your database name

// Create connection
$conn = new mysqli($DB_HOST, $DB_USER, $DB_PASS, $DB_NAME);

// Check connection
if ($conn->connect_error) {
    die("Database connection failed: " . $conn->connect_error);
}

// Now $conn can be used in any file that includes this
?>
