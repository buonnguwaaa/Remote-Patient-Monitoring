package consts

const (
	SubjectActivateAccount = "[RPM] - Activate your account"
	SubjectResetPassword   = "[RPM] - Reset Your Password"
)

const ActivateEmailTemplate = `
	<!DOCTYPE html>
	<html lang="en">
	<head>
	<meta charset="UTF-8">
	<style>
		body {
		font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
		background-color: #f7f9fc;
		color: #333;
		padding: 0;
		margin: 0;
		}
		.container {
		max-width: 480px;
		margin: 40px auto;
		background: #fff;
		border-radius: 10px;
		padding: 30px 40px;
		box-shadow: 0 4px 12px rgba(0,0,0,0.08);
		}
		.logo {
		text-align: center;
		margin-bottom: 20px;
		}
		.logo img {
		height: 48px;
		}
		h1 {
		color: #007bff;
		font-size: 20px;
		text-align: center;
		}
		p {
		font-size: 15px;
		line-height: 1.6;
		}
		.button {
		display: inline-block;
		background-color: #007bff;
		color: white;
		text-decoration: none;
		padding: 12px 20px;
		border-radius: 6px;
		margin: 20px 0;
		font-weight: 500;
		}
		.footer {
		text-align: center;
		font-size: 13px;
		color: #888;
		margin-top: 30px;
		}
	</style>
	</head>
	<body>
	<div class="container">
		<div class="logo">
		<img src="https://img.icons8.com/color/96/000000/heart-monitor.png" alt="Logo">
		</div>
		<h1>Activate Your Account</h1>
		<p>Hello %s,</p>
		<p>Welcome to <strong>Remote Patient Monitoring</strong>! Please click the button below to activate your account.</p>

		<div style="text-align: center;">
		<a href="%s" class="button">Activate My Account</a>
		</div>

		<p>If you didn’t create this account, you can safely ignore this email.</p>
	</div>
	</body>
	</html>
	`

const ResetPasswordEmailTemplate = `
	<!DOCTYPE html>
	<html lang="en">
	<head>
	<meta charset="UTF-8">
	<style>
		body {
		font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
		background-color: #f7f9fc;
		color: #333;
		padding: 0;
		margin: 0;
		}
		.container {
		max-width: 480px;
		margin: 40px auto;
		background: #fff;
		border-radius: 10px;
		padding: 30px 40px;
		box-shadow: 0 4px 12px rgba(0,0,0,0.08);
		}
		.logo {
		text-align: center;
		margin-bottom: 20px;
		}
		.logo img {
		height: 48px;
		}
		h1 {
		color: #007bff;
		font-size: 20px;
		text-align: center;
		}
		p {
		font-size: 15px;
		line-height: 1.6;
		}
		.button {
		display: inline-block;
		background-color: #007bff;
		color: white;
		text-decoration: none;
		padding: 12px 20px;
		border-radius: 6px;
		margin: 20px 0;
		font-weight: 500;
		}
		.footer {
		text-align: center;
		font-size: 13px;
		color: #888;
		margin-top: 30px;
		}
	</style>
	</head>
	<body>
	<div class="container">
		<div class="logo">
		<img src="https://img.icons8.com/color/96/000000/heart-monitor.png" alt="Logo">
		</div>
		<h1>Reset Your Password</h1>
		<p>Hello %s,</p>
		<p>We received a request to reset your password for your <strong>Remote Patient Monitoring</strong> account. Click the button below to create a new password.</p>

		<div style="text-align: center;">
		<a href="%s" class="button">Reset My Password</a>
		</div>

		<p>This link will expire in <strong>15 minutes</strong>. If you did not request a password reset, you can safely ignore this email.</p>
	</div>
	</body>
	</html>
	`
