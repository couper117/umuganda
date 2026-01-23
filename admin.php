<?php
include 'db_connection.php';

// Handle status updates
if (isset($_POST['update_status'])) {
    $stmt = $conn->prepare("UPDATE reports SET status=? WHERE id=?");
    $stmt->bind_param("si", $_POST['status'], $_POST['id']);
    $stmt->execute();
    $stmt->close();
}

// Handle delete
if (isset($_POST['delete_report'])) {
    $stmt = $conn->prepare("DELETE FROM reports WHERE id=?");
    $stmt->bind_param("i", $_POST['id']);
    $stmt->execute();
    $stmt->close();
}

// Fetch reports
$reportsResult = $conn->query("SELECT * FROM reports ORDER BY 
    CASE urgency 
        WHEN 'high' THEN 1 
        WHEN 'medium' THEN 2 
        WHEN 'low' THEN 3 
        ELSE 4 
    END, time DESC");

// Fetch top reported locations
$topLocationsResult = $conn->query("
    SELECT location, COUNT(*) as count 
    FROM reports 
    GROUP BY location 
    ORDER BY count DESC 
    LIMIT 3
");

$topLocations = [];
while ($row = $topLocationsResult->fetch_assoc()) {
    $topLocations[] = $row;
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Admin Dashboard • Clean Kigali</title>
<style>
body { font-family: Arial, sans-serif; background: #f2f2f2; margin:0; padding:0; }
.container { max-width: 1200px; margin: 30px auto; padding: 20px; }
h1 { text-align:center; margin-bottom:20px; }
.back-home { margin-bottom:20px; }
.hotspot { margin-bottom:20px; padding:15px; background:#fef3c7; border-radius:8px; }
.card { border-radius:8px; padding:15px; margin-bottom:15px; background:white; box-shadow:0 2px 6px rgba(0,0,0,0.1); transition:0.3s; }
.card.high { border-left:5px solid #ef4444; }   /* red */
.card.medium { border-left:5px solid #f59e0b; } /* orange */
.card.low { border-left:5px solid #10b981; }   /* green */
.card.done { background:#10b981; color:white; }
.card.pending { background:#f59e0b; color:white; }
.card.notdone { background:#ef4444; color:white; }
.card h3 { margin:0; }
.card .details { display:none; margin-top:10px; }
.buttons { margin-top:10px; display:flex; gap:10px; flex-wrap: wrap; }
button { padding:6px 12px; border:none; border-radius:4px; cursor:pointer; transition:0.2s; }
button:hover { opacity:0.8; }
.view-btn { background:#3b82f6; color:white; }
.done-btn { background:#10b981; color:white; }
.pending-btn { background:#f59e0b; color:white; }
.notdone-btn { background:#ef4444; color:white; }
.delete-btn { background:#6b7280; color:white; }
</style>
</head>
<body>
<div class="container">

<h1>Admin Dashboard</h1>
<a href="index.php"><button class="back-home">← Back to Home</button></a>

<?php if(!empty($topLocations)): ?>
<div class="hotspot">
    <h2>Hotspots / Frequently Reported Locations</h2>
    <ul>
        <?php foreach($topLocations as $loc): ?>
            <li><strong><?= htmlspecialchars($loc['location']) ?></strong> — <?= $loc['count'] ?> reports</li>
        <?php endforeach; ?>
    </ul>
</div>
<?php endif; ?>

<?php while($report = $reportsResult->fetch_assoc()): 
    $statusClass = strtolower($report['status'] ?? 'pending'); // default pending
    $urgencyClass = strtolower($report['urgency']);
?>
<div class="card <?= $urgencyClass ?> <?= $statusClass ?>" id="report-<?= $report['id'] ?>">
    <h3><?= htmlspecialchars($report['category']) ?> — <?= htmlspecialchars($report['location']) ?></h3>
    <p><strong>Urgency:</strong> <?= ucfirst($report['urgency']) ?></p>
    <p><strong>Reported by:</strong> <?= htmlspecialchars($report['name'] ?? 'Anonymous') ?></p>
    <p><strong>Time:</strong> <?= $report['time'] ?></p>
    <button class="view-btn" onclick="toggleDetails(<?= $report['id'] ?>)">See More Details</button>
    <div class="details" id="details-<?= $report['id'] ?>">
        <p><strong>Sector:</strong> <?= htmlspecialchars($report['sector']) ?></p>
        <p><strong>Details:</strong> <?= htmlspecialchars($report['details']) ?></p>
        <p><strong>Contact:</strong> <?= htmlspecialchars($report['contact']) ?></p>
        <p><strong>IP:</strong> <?= htmlspecialchars($report['ip']) ?></p>
    </div>
    <div class="buttons">
        <form method="POST" style="display:inline;">
            <input type="hidden" name="id" value="<?= $report['id'] ?>">
            <button type="submit" name="update_status" value="pending" class="pending-btn">Pending</button>
        </form>
        <form method="POST" style="display:inline;">
            <input type="hidden" name="id" value="<?= $report['id'] ?>">
            <button type="submit" name="update_status" value="notdone" class="notdone-btn">Not Done</button>
        </form>
        <form method="POST" style="display:inline;">
            <input type="hidden" name="id" value="<?= $report['id'] ?>">
            <button type="submit" name="update_status" value="done" class="done-btn">Done</button>
        </form>
        <form method="POST" style="display:inline;">
            <input type="hidden" name="id" value="<?= $report['id'] ?>">
            <button type="submit" name="delete_report" class="delete-btn">Delete</button>
        </form>
    </div>
</div>
<?php endwhile; ?>

</div>

<script>
function toggleDetails(id){
    let details = document.getElementById('details-'+id);
    details.style.display = (details.style.display === 'block') ? 'none' : 'block';
}
</script>

</body>
</html>
