# Remote Patient Monitoring - Mobile App

Ứng dụng di động dành cho bệnh nhân trong hệ thống Remote Patient Monitoring. Được xây dựng bằng **React Native** và **Expo SDK 54**.

## 🛠️ Yêu cầu hệ thống

Trước khi bắt đầu, hãy đảm bảo bạn đã cài đặt:
- [Node.js](https://nodejs.org/) (Khuyên dùng phiên bản LTS)
- [Expo Go](https://expo.dev/client) trên điện thoại (để xem trước trên thiết bị thật)
- Android Studio (nếu muốn chạy trên trình giả lập Android)
- Xcode (nếu muốn chạy trên trình giả lập iOS - chỉ dành cho macOS)

## 🚀 Hướng dẫn cài đặt và chạy

### 1. Cài đặt các thư viện (Dependencies)

Mở terminal trong thư mục `Frontend/mobile` và chạy lệnh:

```bash
npm install
```

### 2. Cấu hình biến môi trường

Tạo file `.env` dựa trên file `.env.example`:

```bash
cp .env.example .env
```

Sau đó, mở file `.env` và cập nhật `BASE_URL`:
- Nếu chạy trên trình giả lập Android: `BASE_URL=http://10.0.2.2:3000`
- Nếu chạy trên trình giả lập iOS: `BASE_URL=http://localhost:3000`
- Nếu chạy trên thiết bị thật: Sử dụng địa chỉ IP nội bộ của máy tính (ví dụ: `http://192.168.1.x:3000`)

### 3. Khởi chạy ứng dụng

Sử dụng các lệnh sau tùy theo nhu cầu:

- **Chạy Expo Dev Menu:**
  ```bash
  npm start
  ```
  Quét mã QR bằng ứng dụng Expo Go trên điện thoại của bạn.

- **Chạy trên trình giả lập Android:**
  ```bash
  npm run android
  ```

- **Chạy trên trình giả lập iOS:**
  ```bash
  npm run ios
  ```

- **Chạy trên trình duyệt Web:**
  ```bash
  npm run web
  ```

## 🏗️ Cấu trúc thư mục

- `src/`: Thư mục chứa mã nguồn chính.
  - `api/`: Các tệp giao tiếp với Backend.
  - `assets/`: Image, icons và các tệp tĩnh khác.
  - `components/`: Các React components dùng chung.
  - `context/`: Quản lý trạng thái bằng React Context API.
  - `hooks/`: Các custom React hooks.
  - `navigation/`: Cấu hình điều hướng (Stack, Bottom Tabs).
  - `screens/`: Các màn hình chính (Screens) của ứng dụng.
  - `styles/`: Định nghĩa kiểu dáng và màu sắc chung.
- `App.js`: Điểm vào chính của ứng dụng.
- `app.json` & `app.config.js`: Cấu hình toàn cầu của Expo.

## 📝 Lưu ý quan trọng

- Dự án này sử dụng `dotenv-cli` để tải biến môi trường, hãy đảm bảo bạn đã tạo tệp `.env` trước khi chạy.
- Cổng mặc định được thiết lập là `3000` trong `package.json`. Nếu có xung đột, bạn có thể thay đổi số cổng trong các script của `package.json`.
