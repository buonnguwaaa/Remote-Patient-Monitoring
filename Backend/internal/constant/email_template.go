package constant

const (
	SubjectActivateAccount = "[RPM] - Activate your account"
	SubjectResetPassword   = "[RPM] - Reset Your Password"
)

const ActivateOTPEmailTemplate = `
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
		.otp {
		display: block;
		text-align: center;
		font-size: 32px;
		font-weight: 700;
		letter-spacing: 8px;
		color: #007bff;
		margin: 24px 0;
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
		<p>Welcome to <strong>Remote Patient Monitoring</strong>! Use the one-time code below to activate your account.</p>

		<span class="otp">%s</span>

		<p>This code expires in %d minutes. If you didn't create this account, you can safely ignore this email.</p>
	</div>
	</body>
	</html>
	`

const ResetPasswordEmailTemplate = `
	<!DOCTYPE html>
	<html lang="vi">
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
		.otp {
		display: block;
		text-align: center;
		font-size: 32px;
		font-weight: 700;
		letter-spacing: 8px;
		color: #007bff;
		margin: 24px 0;
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
		<h1>Yêu cầu Đặt lại mật khẩu</h1>
		<p>Chào %s,</p>
		<p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản <strong>Remote Patient Monitoring</strong> của bạn.</p>
		
		<p>Dưới đây là mã xác thực (OTP) của bạn:</p>

		<span class="otp">%s</span>

		<p>Mã này sẽ hết hạn sau <strong>%d phút</strong>.</p>
		<p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này để đảm bảo an toàn cho tài khoản.</p>
	</div>
	</body>
	</html>
	`
