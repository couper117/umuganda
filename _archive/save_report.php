<?php
include 'dbconnection.php';

$category = $_POST['category'] ?? '';
$urgency  = $_POST['urgency'] ?? '';
$location = $_POST['location'] ?? '';
$sector   = $_POST['sector'] ?? '';
$details  = $_POST['details'] ?? '';

if(empty($category) || empty($urgency) || empty($location)){
    die("Please fill category, urgency, and location.");
}

// Use prepared statement
$stmt = $conn->prepare("INSERT INTO reports (category, urgency, exact_location, sector, details) VALUES (?, ?, ?, ?, ?)");
$stmt->bind_param("sssss", $category, $urgency, $location, $sector, $details);

if($stmt->execute()){
    header("Location: index.php?success=1"); // Redirect back to main page
    exit;
} else {
    echo "Error: " . $stmt->error;
}

$stmt->close();
$conn->close();
?>