<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=iso-8859-1" />
<title>Sign In / Sign Up Form</title>
<style>
html, body {
height: 100%;
margin: 0;
}
body {
display: flex;
justify-content: center;
align-items: center;
font-family: 'Poppins', sans-serif;
color: #fff;
background: url('ass.jpg') no-repeat center center fixed;
background-size: cover;
}
body::before {
content: "";
position: fixed;
inset: 0;
background: rgba(0,0,0,0.35);
z-index: 0;
}
form {
position: relative;
z-index: 1;
background: rgba(255, 255, 255, 0.08);
backdrop-filter: blur(8px);
border: 1px solid rgba(255,255,255,0.12);
border-radius: 18px;
padding: 40px;
width: 360px;
box-shadow: 0 8px 30px rgba(0,0,0,0.35);
color: #ffffff;
max-height: 90vh;
overflow-y: auto;
}
h1 {
text-align: center;
margin-bottom: 20px;
color: #fff;
text-shadow: 0 0 8px rgba(255, 215, 0, 0.5);
}
label {
font-weight: 700;
display: block;
margin-bottom: 6px;
}
input[type="text"],
input[type="password"],
input[type="date"] {
width: 100%;
padding: 12px;
margin: 6px 0 18px 0;
border: none;
border-radius: 8px;
outline: none;
background: rgba(255,255,255,0.12);
color: #fff;
font-size: 15px;
transition: 0.2s;
}
input[type="text"]:focus,
input[type="password"]:focus,
input[type="date"]:focus {
background: rgba(255,255,255,0.18);
box-shadow: 0 0 8px rgba(255, 215, 0, 0.3);
}
input[type="submit"] {
width: 100%;
padding: 12px;
background: #8B4513;
border: none;
border-radius: 8px;
color: #fff;
font-weight: bold;
font-size: 16px;
cursor: pointer;
transition: 0.3s ease;
box-shadow: 0 4px 15px rgba(139, 69, 19, 0.4);
text-transform: uppercase;
letter-spacing: 1px;
}
input[type="submit"]:hover {
background: #A0522D;
transform: scale(1.05);
box-shadow: 0 6px 20px rgba(139, 69, 19, 0.6);
}
.response-box {
position: fixed;
top: 30px;
right: -400px;
background: rgba(0, 0, 0, 0.6);
border-radius: 18px;
padding: 20px 30px;
width: 340px;
backdrop-filter: blur(8px);
color: #fff;
font-family: 'Poppins', sans-serif;
box-shadow: 0 4px 20px rgba(0,0,0,0.5);
border: 2px solid transparent;
z-index: 10;
opacity: 0;
}
.response-box.success {
border-color: limegreen;
}
.response-box.error {
border-color: red;
}
@keyframes slideIn {
from { right: -400px; opacity: 0; }
to { right: 30px; opacity: 1; }
}
@media (max-width: 420px) {
form { width: 92%; padding: 20px; }
}
</style>
</head>
<body>
<?php
$message = '';
$class = '';
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
$name = trim($_POST["name"]);
$email = trim($_POST["email"]);
$password = $_POST["password"];
$confirm_password = $_POST["confirm_password"];
$phone_number = $_POST["phone"];
$gender = isset($_POST['gender']) ? $_POST['gender'] : '';
$dateofbirth = $_POST["dateofbirth"];
$errors = [];
if (empty($name) || strlen($name) < 8) {
$errors[] = "Full Name must be at least 8 characters long.";
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
$errors[] = "Invalid email format.";
}
if (strlen($password) < 6 || !preg_match('/[0-9]/', $password)) {
$errors[] = "Password must be at least 6 characters long and contain a number.";
}
if ($password !== $confirm_password) {
$errors[] = "Passwords do not match.";
}
if (!preg_match('/^[0-9]{10}$/', $phone_number)) {
$errors[] = "Phone number must be exactly 10 digits.";
}
if (empty($gender)) {
$errors[] = "Please select your gender.";
}
if (empty($dateofbirth)) {
$errors[] = "Please select your date of birth.";
}
if (!empty($errors)) {
$class = 'error';
$message = "<h2 style='color:red;'>Login Failed!</h2><ul>";
foreach ($errors as $error) {
$message .= "<li>$error</li>";
}
$message .= "</ul>";
} else {
$class = 'success';
$message = "
<h2 style='color:lime;'>Login Accepted!</h2>
<p><strong>Full Name:</strong> $name</p>
<p><strong>Email:</strong> $email</p>
<p><strong>Phone Number:</strong> $phone_number</p>
<p><strong>Gender:</strong> $gender</p>
<p><strong>Date of Birth:</strong> $dateofbirth</p>";
}
}
?>
<form method="post" action="">
<h1>Sign In / Sign Up</h1>
<label>Full Name:</label>
<input type="text" name="name" value="<?php echo isset($_POST['name']) ?
htmlspecialchars($_POST['name']) : ''; ?>" required />
<label>Email:</label>
<input type="text" name="email" value="<?php echo isset($_POST['email']) ?
htmlspecialchars($_POST['email']) : ''; ?>" required />
<label>Password:</label>
<input type="password" name="password" required />
<label>Confirm Password:</label>
<input type="password" name="confirm_password" required />
<label>Gender:</label>
Male <input type="radio" name="gender" value="Male" <?php if(isset($_POST['gender']) &&
$_POST['gender']=="Male") echo "checked"; ?> />
Female <input type="radio" name="gender" value="Female" <?php if(isset($_POST['gender'])
&& $_POST['gender']=="Female") echo "checked"; ?> />
Other <input type="radio" name="gender" value="Other" <?php if(isset($_POST['gender']) &&
$_POST['gender']=="Other") echo "checked"; ?> />
<label>Phone Number:</label>
<input type="text" name="phone" value="<?php echo isset($_POST['phone']) ?
htmlspecialchars($_POST['phone']) : ''; ?>" required />
<label>Date of Birth:</label>
<input type="date" name="dateofbirth" value="<?php echo isset($_POST['dateofbirth']) ?
htmlspecialchars($_POST['dateofbirth']) : ''; ?>" required />
<input type="submit" value="Submit" />
</form>
<?php if (!empty($message)): ?>
<div class="response-box <?php echo $class; ?>" id="responseBox">
<?php echo $message; ?>
</div>
<script>
const box = document.getElementById('responseBox');
box.style.animation = "slideIn 0.5s forwards";
</script>
<?php endif; ?>
</body>
</html>