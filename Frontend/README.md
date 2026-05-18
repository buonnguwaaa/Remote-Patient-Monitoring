# Frontend
# run
- cd /home/khoa123/RPM/Remote-Patient-Monitoring/Frontend/Mobile
 + "npm run start" hoặc "expo start" để chạy Metro/DevTools (mặc định).
 + Chạy web trên cổng 3000: "npm run web" hoặc "npm run web:3000" (đã cấu hình `expo start --web --port 3000`).
 + "npx expo start --tunnel" để chia sẻ qua tunnel nhanh.
 + "ngrok http 8080" để map backend ra ngoài cho mobile.

 Lưu ý:
 - Backend đang redirect về FE_WEB_URL. Với môi trường local web, đặt `FE_WEB_URL=http://localhost:3000` (đã khớp với cấu hình này).
 - Nếu chạy mobile app và muốn quay lại app sau khi Google login, cân nhắc dùng deep link: đặt `FE_WEB_URL=rpm://oauth/success` và giữ `"scheme": "rpm"` trong app.json.

