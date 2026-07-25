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
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  :root {
    --slate-50: #f8fafc;
    --slate-100: #f1f5f9;
    --slate-200: #e2e8f0;
    --slate-300: #cbd5e1;
    --slate-400: #94a3b8;
    --slate-500: #64748b;
    --slate-600: #475569;
    --slate-700: #334155;
    --slate-800: #1e293b;
    --slate-900: #0f172a;
    --slate-950: #020617;
    --blue-400: #60a5fa;
    --blue-500: #3b82f6;
    --blue-600: #2563eb;
    --indigo-300: #a5b4fc;
    --indigo-500: #6366f1;
    --indigo-600: #4f46e5;
    --cyan-400: #22d3ee;
    --emerald-400: #34d399;
    --emerald-500: #10b981;
    --red-500: #ef4444;
    --red-50: #fef2f2;
    --red-100: #fee2e2;
    --red-600: #dc2626;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    font-family: "Plus Jakarta Sans", system-ui, sans-serif;
    color: var(--slate-800);
    background: var(--slate-900);
    -webkit-font-smoothing: antialiased;
  }
  .shell { display: flex; min-height: 100vh; width: 100%; }
  .left {
    display: none;
    position: relative;
    overflow: hidden;
    width: 50%;
    padding: 3rem;
    flex-direction: column;
    justify-content: space-between;
    border-right: 1px solid rgba(30, 41, 59, 0.6);
    background: linear-gradient(135deg, #020617 0%, #172554 45%, #1e1b4b 100%);
  }
  .orb {
    position: absolute;
    border-radius: 9999px;
    filter: blur(64px);
    pointer-events: none;
  }
  .orb-1 { top: -8rem; left: -8rem; width: 24rem; height: 24rem; background: rgba(59, 130, 246, 0.15); }
  .orb-2 { top: 50%; right: -8rem; width: 24rem; height: 24rem; background: rgba(99, 102, 241, 0.15); }
  .orb-3 { bottom: -8rem; left: 25%; width: 24rem; height: 24rem; background: rgba(34, 211, 238, 0.1); }
  .brand { position: relative; z-index: 1; display: flex; align-items: center; gap: 0.75rem; }
  .brand-logo {
    width: 3rem; height: 3rem; border-radius: 1rem;
    background: linear-gradient(to top right, var(--blue-600), var(--indigo-500));
    padding: 2px; box-shadow: 0 10px 25px rgba(59, 130, 246, 0.3);
    display: flex; align-items: center; justify-content: center;
  }
  .brand-logo svg { width: 100%; height: 100%; border-radius: 14px; background: #0b1220; }
  .brand-title { font-size: 1.25rem; font-weight: 800; color: #fff; letter-spacing: -0.02em; line-height: 1.1; }
  .brand-sub { display: block; font-size: 0.7rem; font-weight: 500; color: var(--blue-400); letter-spacing: 0.08em; text-transform: uppercase; }
  .hero { position: relative; z-index: 1; margin: auto 0; max-width: 32rem; }
  .badge {
    display: inline-flex; align-items: center; gap: 0.5rem;
    padding: 0.35rem 0.9rem; margin-bottom: 1.5rem;
    border-radius: 9999px; font-size: 0.75rem; font-weight: 600;
    color: #93c5fd; background: rgba(59, 130, 246, 0.1);
    border: 1px solid rgba(96, 165, 250, 0.2);
  }
  .badge svg { width: 1rem; height: 1rem; color: var(--blue-400); flex-shrink: 0; }
  .hero h2 {
    margin: 0 0 1rem; font-size: 2.25rem; font-weight: 800; color: #fff;
    line-height: 1.2; letter-spacing: -0.03em;
  }
  .hero h2 .grad {
    background: linear-gradient(90deg, var(--blue-400), var(--cyan-400), var(--indigo-300));
    -webkit-background-clip: text; background-clip: text; color: transparent;
  }
  .hero-copy { margin: 0 0 2rem; color: #cbd5e1; font-size: 1rem; line-height: 1.6; }
  .features { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .feature {
    padding: 1rem; border-radius: 1rem;
    background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(30, 41, 59, 0.8);
  }
  .feature-icon {
    width: 2.25rem; height: 2.25rem; border-radius: 0.75rem;
    display: flex; align-items: center; justify-content: center; margin-bottom: 0.75rem;
  }
  .feature-icon.blue { background: rgba(59, 130, 246, 0.2); color: var(--blue-400); }
  .feature-icon.indigo { background: rgba(99, 102, 241, 0.2); color: var(--indigo-300); }
  .feature-icon svg { width: 1.25rem; height: 1.25rem; }
  .feature h4 { margin: 0 0 0.25rem; font-size: 0.875rem; font-weight: 700; color: #fff; }
  .feature p { margin: 0; font-size: 0.75rem; color: var(--slate-400); line-height: 1.4; }
  .left-foot {
    position: relative; z-index: 1; padding-top: 1.5rem;
    border-top: 1px solid rgba(30, 41, 59, 0.6);
    display: flex; align-items: center; justify-content: space-between;
    font-size: 0.75rem; color: var(--slate-400);
  }
  .left-foot .secure { display: flex; align-items: center; gap: 0.25rem; }
  .left-foot .secure svg { width: 1rem; height: 1rem; color: var(--emerald-400); }
  .right {
    width: 100%; display: flex; align-items: center; justify-content: center;
    padding: 1.5rem; background: var(--slate-50); overflow-y: auto;
  }
  .panel { width: 100%; max-width: 28rem; margin: auto; }
  .card {
    background: #fff; border-radius: 1.5rem; padding: 2rem 2.5rem;
    box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.15);
    border: 1px solid var(--slate-100);
  }
  .card.center { text-align: center; }
  .card.success { border-color: #d1fae5; }
  .card.error-state { border-color: var(--red-100); }
  .chip {
    display: inline-flex; align-items: center; gap: 0.5rem;
    padding: 0.25rem 0.75rem; margin-bottom: 0.75rem;
    border-radius: 0.5rem; background: #eff6ff; color: var(--blue-600);
    font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em;
  }
  .chip svg { width: 1rem; height: 1rem; }
  .card h1 {
    margin: 0; font-size: 1.75rem; font-weight: 800; color: var(--slate-900);
    letter-spacing: -0.03em; line-height: 1.2;
  }
  .user-box {
    margin-top: 0.65rem; padding: 0.75rem; border-radius: 1rem;
    background: var(--slate-50); border: 1px solid var(--slate-100);
    display: flex; align-items: center; gap: 0.75rem;
  }
  .user-avatar {
    width: 2.25rem; height: 2.25rem; border-radius: 0.75rem; flex-shrink: 0;
    background: #dbeafe; color: var(--blue-600);
    display: flex; align-items: center; justify-content: center;
  }
  .user-avatar svg { width: 1.25rem; height: 1.25rem; }
  .user-label { display: block; font-size: 0.7rem; color: var(--slate-400); font-weight: 500; }
  .user-name { display: block; font-size: 0.875rem; font-weight: 700; color: var(--slate-800); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .alert-error {
    margin: 1.25rem 0 0; padding: 1rem; border-radius: 1rem;
    background: var(--red-50); border: 1px solid var(--red-100);
    color: var(--red-600); font-size: 0.75rem; font-weight: 500;
    display: flex; align-items: flex-start; gap: 0.75rem;
  }
  .alert-error svg { width: 1.25rem; height: 1.25rem; flex-shrink: 0; margin-top: 1px; color: var(--red-500); }
  form { margin-top: 1.25rem; }
  .field { margin-bottom: 1.25rem; }
  .field label {
    display: block; margin-bottom: 0.5rem;
    font-size: 0.7rem; font-weight: 700; color: var(--slate-700);
    text-transform: uppercase; letter-spacing: 0.06em;
  }
  .input-wrap { position: relative; }
  .input-wrap .icon-left {
    position: absolute; inset: 0 auto 0 0; width: 2.75rem;
    display: flex; align-items: center; justify-content: center;
    color: var(--slate-400); pointer-events: none;
  }
  .input-wrap .icon-left svg,
  .input-wrap .toggle svg { width: 1.25rem; height: 1.25rem; }
  .input-wrap input {
    width: 100%; padding: 0.9rem 2.75rem;
    border: 1px solid var(--slate-200); border-radius: 1rem;
    background: var(--slate-50); color: var(--slate-900);
    font-size: 0.875rem; font-weight: 500; font-family: inherit;
    outline: none; transition: box-shadow 0.15s, border-color 0.15s, background 0.15s;
  }
  .input-wrap input::placeholder { color: var(--slate-400); }
  .input-wrap input:focus {
    background: #fff; border-color: transparent;
    box-shadow: 0 0 0 2px var(--blue-500);
  }
  .input-wrap .toggle {
    position: absolute; inset: 0 0 0 auto; width: 2.75rem;
    border: none; background: transparent; color: var(--slate-400);
    cursor: pointer; display: flex; align-items: center; justify-content: center;
  }
  .input-wrap .toggle:hover { color: var(--slate-600); }
  .checks {
    padding: 1rem; border-radius: 1rem; margin-bottom: 0.5rem;
    background: var(--slate-50); border: 1px solid var(--slate-100);
  }
  .check-row {
    display: flex; align-items: center; gap: 0.5rem;
    font-size: 0.75rem; font-weight: 600; color: var(--slate-600);
  }
  .check-row + .check-row { margin-top: 0.5rem; }
  .check-dot {
    width: 1rem; height: 1rem; border-radius: 9999px;
    display: flex; align-items: center; justify-content: center;
    background: var(--slate-300); color: var(--slate-500); flex-shrink: 0;
  }
  .check-dot svg { width: 0.7rem; height: 0.7rem; }
  .check-row.ok { color: var(--emerald-500); font-weight: 700; }
  .check-row.ok .check-dot { background: var(--emerald-500); color: #fff; }
  .btn {
    width: 100%; margin-top: 1.5rem; padding: 1rem;
    border: none; border-radius: 1rem; cursor: pointer;
    font-family: inherit; font-size: 0.875rem; font-weight: 700;
    color: #fff; display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
    background: linear-gradient(90deg, var(--blue-600), var(--indigo-600));
    box-shadow: 0 20px 25px -5px rgba(37, 99, 235, 0.25);
    transition: opacity 0.15s, transform 0.1s;
  }
  .btn:hover:not(:disabled) { background: linear-gradient(90deg, #1d4ed8, #4338ca); }
  .btn:active:not(:disabled) { transform: scale(0.99); }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn svg { width: 1rem; height: 1rem; }
  .btn.dark {
    background: var(--slate-900); box-shadow: 0 10px 15px -3px rgba(15, 23, 42, 0.1);
  }
  .btn.dark:hover { background: var(--slate-800); }
  .status-icon {
    width: 5rem; height: 5rem; margin: 0 auto 1.5rem;
    border-radius: 1.5rem; display: flex; align-items: center; justify-content: center;
  }
  .status-icon svg { width: 2.5rem; height: 2.5rem; }
  .status-icon.ok { background: #ecfdf5; color: var(--emerald-500); border: 1px solid #d1fae5; }
  .status-icon.err { background: var(--red-50); color: var(--red-500); border: 1px solid var(--red-100); }
  .card.center h2 {
    margin: 0 0 0.75rem; font-size: 1.5rem; font-weight: 800; color: var(--slate-900);
  }
  .card.center .msg {
    margin: 0 0 2rem; font-size: 0.875rem; color: var(--slate-600); line-height: 1.6;
  }
  .hint {
    margin: 1rem 0 0; font-size: 0.75rem; color: var(--slate-500); line-height: 1.5; text-align: center;
  }
  @media (min-width: 1024px) {
    .left { display: flex; }
    .right { width: 50%; padding: 3rem; }
  }
  @media (max-width: 1023px) {
    .right { min-height: 100vh; }
  }
</style>
</head>
<body>
<div class="shell">
  <aside class="left">
    <div class="orb orb-1"></div>
    <div class="orb orb-2"></div>
    <div class="orb orb-3"></div>
    <div class="brand">
      <div class="brand-logo">
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect width="48" height="48" rx="14" fill="#0b1220"/>
          <path d="M24 34s-9-5.6-9-12.2A5.4 5.4 0 0 1 24 17.8a5.4 5.4 0 0 1 9 4C33 28.4 24 34 24 34Z" fill="#3b82f6"/>
          <path d="M14 24h4l2.5-5 3 10 2.5-5H30" stroke="#22d3ee" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <div>
        <span class="brand-title">RPM</span>
        <span class="brand-sub">Remote Patient Monitoring</span>
      </div>
    </div>
    <div class="hero">
      <div class="badge">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z"/></svg>
        <span>{{BADGE}}</span>
      </div>
      <h2>Theo dõi &amp; Giám sát Sức khỏe Bệnh nhân <span class="grad">Từ xa</span></h2>
      <p class="hero-copy">{{WELCOME}}</p>
      <div class="features">
        <div class="feature">
          <div class="feature-icon blue">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.645 20.91a.75.75 0 0 1-.79 0C6.24 17.73 2.25 14.05 2.25 9.75A5.25 5.25 0 0 1 7.5 4.5c1.6 0 3.07.74 4 1.9A5.23 5.23 0 0 1 15.5 4.5a5.25 5.25 0 0 1 5.25 5.25c0 4.3-3.99 7.98-8.605 11.16Z"/></svg>
          </div>
          <h4>Giám sát Chỉ số</h4>
          <p>Cảnh báo ngưỡng Huyết áp &amp; Đường huyết tự động 24/7</p>
        </div>
        <div class="feature">
          <div class="feature-icon indigo">
            <svg viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" d="M12.516 2.17a.75.75 0 0 0-1.032 0 11.209 11.209 0 0 1-7.877 3.08.75.75 0 0 0-.722.515A12.74 12.74 0 0 0 2.25 9.75c0 5.814 3.854 10.73 9.164 12.28a.75.75 0 0 0 .672 0c5.31-1.55 9.164-6.466 9.164-12.28a12.74 12.74 0 0 0-.635-3.985.75.75 0 0 0-.722-.516 11.209 11.209 0 0 1-7.877-3.08Z" clip-rule="evenodd"/></svg>
          </div>
          <h4>Bảo mật Y tế</h4>
          <p>Mã hóa dữ liệu bệnh nhân đạt tiêu chuẩn y khoa</p>
        </div>
      </div>
    </div>
    <div class="left-foot">
      <span>&copy; {{YEAR}} Remote Patient Monitoring System</span>
      <span class="secure">
        <svg viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" d="M12.516 2.17a.75.75 0 0 0-1.032 0 11.209 11.209 0 0 1-7.877 3.08.75.75 0 0 0-.722.515A12.74 12.74 0 0 0 2.25 9.75c0 5.814 3.854 10.73 9.164 12.28a.75.75 0 0 0 .672 0c5.31-1.55 9.164-6.466 9.164-12.28a12.74 12.74 0 0 0-.635-3.985.75.75 0 0 0-.722-.516 11.209 11.209 0 0 1-7.877-3.08Z" clip-rule="evenodd"/></svg>
        Hệ thống bảo mật
      </span>
    </div>
  </aside>
  <main class="right">
    <div class="panel">
      {{BODY}}
    </div>
  </main>
</div>
<script>
(function () {
  function wireToggle(btnId, inputId) {
    var btn = document.getElementById(btnId);
    var input = document.getElementById(inputId);
    if (!btn || !input) return;
    btn.addEventListener("click", function () {
      var show = input.type === "password";
      input.type = show ? "text" : "password";
      btn.setAttribute("aria-label", show ? "Ẩn mật khẩu" : "Hiện mật khẩu");
      btn.innerHTML = show
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/></svg>';
    });
  }
  function updateChecks() {
    var pw = document.getElementById("password");
    var cf = document.getElementById("confirmedPassword");
    var submit = document.getElementById("submitBtn");
    if (!pw || !cf || !submit) return;
    var minOk = pw.value.length >= 6;
    var matchOk = pw.value.length > 0 && pw.value === cf.value;
    var rowMin = document.getElementById("checkMin");
    var rowMatch = document.getElementById("checkMatch");
    if (rowMin) rowMin.classList.toggle("ok", minOk);
    if (rowMatch) rowMatch.classList.toggle("ok", matchOk);
    submit.disabled = !(minOk && matchOk);
  }
  document.addEventListener("DOMContentLoaded", function () {
    wireToggle("togglePassword", "password");
    wireToggle("toggleConfirm", "confirmedPassword");
    var pw = document.getElementById("password");
    var cf = document.getElementById("confirmedPassword");
    if (pw) pw.addEventListener("input", updateChecks);
    if (cf) cf.addEventListener("input", updateChecks);
    updateChecks();
  });
})();
</script>
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
