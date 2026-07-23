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

Sau đó, mở file `.env` và cập nhật `BASE_URL` (trỏ tới **backend API**, cổng `8080`):
- Nếu chạy trên trình giả lập Android: `BASE_URL=http://10.0.2.2:8080`
- Nếu chạy trên trình giả lập iOS: `BASE_URL=http://localhost:8080`
- Nếu chạy trên thiết bị thật: Sử dụng địa chỉ IP nội bộ của máy tính (ví dụ: `http://192.168.1.x:8080`)

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

## 📦 Build ứng dụng với EAS (Expo Application Services)

Để đóng gói và build ứng dụng thành file cài đặt (APK cho Android, IPA cho iOS), chúng ta sử dụng **EAS Build**.

### 1. Cài đặt EAS CLI (Nếu chưa cài)
Cài đặt công cụ EAS CLI trên máy tính của bạn:
```bash
npm install -g eas-cli
```

### 2. Đăng nhập tài khoản Expo
```bash
eas login
```

### 3. Các lệnh Build

#### 📱 Android

*   **Build bản Development (Chạy với Expo Dev Client):**
    ```bash
    eas build --platform android --profile development
    ```
    *Dùng cho lập trình viên chạy thử code trực tiếp trên thiết bị hoặc giả lập (hỗ trợ hot-reload và debug).*

*   **Build bản Preview (Tạo file APK để cài đặt và test trực tiếp):**
    ```bash
    eas build --platform android --profile preview
    ```
    *Tạo file APK hoàn chỉnh, có thể tải về và cài đặt trực tiếp lên điện thoại Android để test độc lập.*

*   **Build bản Production (Chuẩn bị phát hành lên Google Play):**
    ```bash
    eas build --platform android --profile production
    ```

#### 🍎 iOS

*   **Build bản Development:**
    ```bash
    eas build --platform ios --profile development
    ```

*   **Build bản Preview (Cần cấu hình Apple Developer account):**
    ```bash
    eas build --platform ios --profile preview
    ```

*   **Build bản Production (Phát hành lên App Store):**
    ```bash
    eas build --platform ios --profile production
    ```

## 📝 Lưu ý quan trọng

- Dự án này sử dụng `dotenv-cli` để tải biến môi trường, hãy đảm bảo bạn đã tạo tệp `.env` trước khi chạy.
- Cổng Expo Dev mặc định là **8081** (xem scripts trong `package.json`). Nếu có xung đột, bạn có thể đổi `--port` trong các script.
- **Quên mật khẩu:** luồng 3 bước trên app — gửi OTP 6 chữ số qua email → xác thực OTP → đặt mật khẩu mới (OTP hiệu lực 15 phút trên backend).
- Bệnh nhân được admin tạo nhận liên kết mời (email/SMS) để đặt mật khẩu lần đầu trên trang HTML `/auth/accept-invite` của backend; không nhận mật khẩu tạm plaintext.
