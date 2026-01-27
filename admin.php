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
$topLocationsResult = $conn->query("SELECT location, COUNT(*) as count FROM reports GROUP BY location ORDER BY count DESC LIMIT 3");
$topLocations = [];
while ($row = $topLocationsResult->fetch_assoc()) { $topLocations[] = $row; }
?>

<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Admin Dashboard • Clean Kigali</title>
<style>
/* 1. THE BACKGROUND: Glass needs color behind it to look like glass */
body { 
    margin: 0; 
    padding: 0; 
    font-family: 'Segoe UI', Arial, sans-serif;
    background: linear-gradient(135deg, #1a2a6c, #b21f1f, #fdbb2d); /* Vibrant mesh */
    background-attachment: fixed;
    min-height: 100vh;
    color: white;
}

.container { max-width: 1000px; margin: 0 auto; padding: 40px 20px; }

h1 { text-align: center; font-weight: 300; letter-spacing: 1px; margin-bottom: 30px; }

/* 2. THE GLASS PANEL STYLE */
.glass {
    background: rgba(255, 255, 255, 0.1); /* Transparent white */
    backdrop-filter: blur(15px);           /* THE BLUR EFFECT */
    -webkit-backdrop-filter: blur(15px);    /* For Safari/iOS support */
    border: 1px solid rgba(255, 255, 255, 0.2); 
    border-radius: 15px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.hotspot { padding: 20px; margin-bottom: 30px; }

/* 3. THE CARDS */
.card { 
    padding: 20px; 
    margin-bottom: 20px; 
    transition: 0.3s ease; 
    position: relative;
    overflow: hidden;
}

/* Card Urgency Borders */
.card.high { border-left: 8px solid #ff4b2b; }
.card.medium { border-left: 8px solid #f9d423; }
.card.low { border-left: 8px solid #00b09b; }

/* Status Color Hints (Subtle transparency so glass still works) */
.card.done { background: rgba(0, 255, 128, 0.1); }
.card.pending { background: rgba(255, 200, 0, 0.1); }
.card.notdone { background: rgba(255, 0, 0, 0.1); }

.details { display: none; margin-top: 15px; padding: 15px; background: rgba(0,0,0,0.2); border-radius: 10px; }

/* BUTTONS */
.buttons { margin-top: 15px; display: flex; gap: 10px; flex-wrap: wrap; }
button { 
    padding: 8px 15px; 
    border: 1px solid rgba(255,255,255,0.2); 
    border-radius: 6px; 
    cursor: pointer; 
    color: white; 
    background: rgba(255,255,255,0.1); 
    transition: 0.2s;
}
button:hover { background: rgba(255,255,255,0.3); }

.back-home { margin-bottom: 20px; }
.view-btn { background: #3b82f6; width: 100%; margin-bottom: 10px; border:none; }
.done-btn { background: rgba(16, 185, 129, 0.6); }
.pending-btn { background: rgba(245, 158, 11, 0.6); }
.notdone-btn { background: rgba(239, 68, 68, 0.6); }
.delete-btn { background: rgba(0,0,0,0.4); }
</style>
</head>
<body>

<div class="container">
    <h1>Admin Dashboard</h1>
    <a href="index.php"><button class="back-home">← Back to Home</button></a>

    <?php if(!empty($topLocations)): ?>
    <div class="hotspot glass">
        <h2 style="margin-top:0;">📍 Hotspots</h2>
        <ul>
            <?php foreach($topLocations as $loc): ?>
                <li><strong><?= htmlspecialchars($loc['location']) ?></strong> — <?= $loc['count'] ?> reports</li>
            <?php endforeach; ?>
        </ul>
    </div>
    <?php endif; ?>

    <?php while($report = $reportsResult->fetch_assoc()): 
        $statusClass = strtolower($report['status'] ?? 'pending');
        $urgencyClass = strtolower($report['urgency']);
    ?>
    <div class="card glass <?= $urgencyClass ?> <?= $statusClass ?>" id="report-<?= $report['id'] ?>">
        <h3><?= htmlspecialchars($report['category']) ?> — <?= htmlspecialchars($report['location']) ?></h3>
        <p><strong>Urgency:</strong> <?= ucfirst($report['urgency']) ?></p>
        <p><strong>Reported by:</strong> <?= htmlspecialchars($report['name'] ?? 'Anonymous') ?></p>
        <p><strong>Time:</strong> <?= $report['time'] ?></p>
        
        <button class="view-btn" onclick="toggleDetails(<?= $report['id'] ?>)">See More Details</button>
        
        <div class="details" id="details-<?= $report['id'] ?>">
            <p><strong>Sector:</strong> <?= htmlspecialchars($report['sector']) ?></p>
            <p><strong>Details:</strong> <?= htmlspecialchars($report['details']) ?></p>
            <p><strong>Contact:</strong> <?= htmlspecialchars($report['contact']) ?></p>
        </div>

        <div class="buttons">
            <form method="POST" style="display:inline;">
                <input type="hidden" name="id" value="<?= $report['id'] ?>">
                <button type="submit" name="update_status" value="pending" class="pending-btn">Pending</button>
                <button type="submit" name="update_status" value="notdone" class="notdone-btn">Not Done</button>
                <button type="submit" name="update_status" value="done" class="done-btn">Done</button>
                <button type="submit" name="delete_report" class="delete-btn" onclick="return confirm('Delete this?')">Delete</button>
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