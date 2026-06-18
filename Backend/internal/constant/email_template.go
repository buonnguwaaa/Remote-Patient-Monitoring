package constant

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
		.token-box {
		background-color: #f0f4ff;
		border: 1px dashed #007bff;
		border-radius: 8px;
		padding: 14px 18px;
		margin: 20px 0;
		text-align: center;
		}
		.token-label {
		font-size: 13px;
		color: #555;
		margin-bottom: 6px;
		}
		.token-value {
		font-family: monospace;
		font-size: 14px;
		font-weight: 700;
		color: #0a0a0a;
		word-break: break-all;
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
		<p>We received a request to reset your password for your <strong>Remote Patient Monitoring</strong> account.</p>

		<p><strong>Nếu dùng ứng dụng mobile:</strong> sao chép token bên dưới rồi dán vào màn hình "Đặt lại mật khẩu" trong app.</p>

		<div class="token-box">
		<div class="token-label">Reset Token (copy token này vào app)</div>
		<div class="token-value">%s</div>
		</div>

		<p><strong>Nếu dùng trình duyệt:</strong> nhấn nút bên dưới.</p>

		<div style="text-align: center;">
		<a href="%s" class="button">Reset My Password</a>
		</div>

		<p>Token và link sẽ hết hạn sau <strong>15 phút</strong>. Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.</p>
	</div>
	</body>
	</html>
	`
