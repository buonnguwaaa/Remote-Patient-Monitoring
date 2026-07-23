package constant

const (
	SubjectPatientAccountCreated  = "[RPM] - Tài khoản bệnh nhân đã được tạo"
	SubjectPatientAccountVerified = "[RPM] - Tài khoản bệnh nhân đã được xác minh"
	SubjectResetPassword          = "[RPM] - Đặt lại mật khẩu"
)

const PatientAccountEmailTemplate = `
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
		<h1>%s</h1>
		<p>Chào %s,</p>
		<p>%s</p>
		%s
	</div>
	</body>
	</html>
	`

const AcceptInvitePageTemplate = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Đặt mật khẩu - RPM</title>
<style>
  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background:#f7f9fc; color:#333; margin:0; padding:24px; }
  .container { max-width:420px; margin:40px auto; background:#fff; border-radius:10px; padding:28px 32px; box-shadow:0 4px 12px rgba(0,0,0,0.08); }
  h1 { color:#007bff; font-size:20px; text-align:center; }
  p { font-size:15px; line-height:1.6; }
  label { display:block; font-size:14px; margin:14px 0 6px; }
  input { width:100%; box-sizing:border-box; padding:10px 12px; border:1px solid #ccd; border-radius:6px; font-size:15px; }
  button { width:100%; margin-top:20px; background:#007bff; color:#fff; border:none; border-radius:6px; padding:12px; font-size:16px; font-weight:600; cursor:pointer; }
  .error { color:#c0392b; background:#fdecea; padding:10px 12px; border-radius:6px; font-size:14px; }
  .ok { color:#1e7e34; background:#e8f5e9; padding:10px 12px; border-radius:6px; font-size:14px; }
  .hint { font-size:13px; color:#666; }
</style>
</head>
<body>
<div class="container">
  <h1>Đặt mật khẩu</h1>
  {{BODY}}
</div>
</body>
</html>`

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
