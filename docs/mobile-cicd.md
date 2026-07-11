# Mobile CI/CD — Hướng dẫn

Tài liệu này mô tả cách hoạt động của CI/CD pipeline dành cho hai ứng dụng mobile trong dự án:

- **Patient App** — `Frontend/mobile`
- **Doctor/Staff App** — `Frontend/doctor-app`

---

## Tổng quan các Workflow

| Workflow | File | Khi nào chạy |
|---|---|---|
| Mobile CI | `.github/workflows/mobile-ci.yml` | Pull Request / Push vào `develop` hoặc `master` |
| Mobile Android Build | `.github/workflows/mobile-android-build.yml` | Thủ công (`workflow_dispatch`) |

---

## 1. Mobile CI (`mobile-ci.yml`)

**Mục đích:** Kiểm tra nhanh xem code của 2 app Expo có thể xuất (export) Android JS bundle thành công hay không — **không cần máy native, không cần Expo account**.

**Các bước thực hiện:**
1. Cài dependencies (`npm ci`)
2. Chạy `lint` nếu có (bỏ qua nếu script không tồn tại)
3. Chạy `typecheck` nếu có (bỏ qua nếu script không tồn tại)
4. Chạy `npx expo export --platform android` để kiểm tra bundle có lỗi hay không

> **Lưu ý:** Ở bước `expo export` trong CI, `EXPO_PUBLIC_BASE_URL` và `BASE_URL` được set là `http://localhost:8080`. Điều này là **chấp nhận được** vì mục đích chỉ là kiểm tra cú pháp và bundle — CI không chạy app thật, không gọi backend thật.

**Secrets cần thiết:** Không cần secret nào.

---

## 2. Mobile Android Build (`mobile-android-build.yml`)

**Mục đích:** Dùng **EAS Build** của Expo để đóng gói APK Android thật, sẵn sàng cài đặt trên điện thoại. Build được thực hiện trên server của Expo (không cần máy build local có Android SDK).

**Khi nào chạy:** Thủ công qua GitHub Actions (`workflow_dispatch`). Có thể chọn build `both`, `patient-app`, hoặc `doctor-app`.

**Các bước thực hiện:**
1. Checkout code
2. Setup Node.js 22
3. Xác thực với Expo bằng `EXPO_TOKEN`
4. Cài dependencies
5. **Validate API URL** — kiểm tra secret trước khi build (xem bên dưới)
6. Chạy `eas build --platform android --profile preview --no-wait`
7. Link tải APK hiển thị tại [https://expo.dev](https://expo.dev) sau khi build xong

---

## Secrets cần cấu hình

Vào **GitHub repo → Settings → Secrets and variables → Actions** để thêm:

| Secret | Bắt buộc | Mô tả |
|---|---|---|
| `EXPO_TOKEN` | ✅ Bắt buộc | Access Token từ [expo.dev/settings/access-tokens](https://expo.dev/accounts/[username]/settings/access-tokens) |
| `EXPO_PUBLIC_BASE_URL` | ✅ Khi build APK | URL backend staging/production (VD: `https://api.yourbackend.com`) |
| `BASE_URL` | ✅ Khi build APK | Tương tự `EXPO_PUBLIC_BASE_URL`, cần ít nhất 1 trong 2 |

### ⚠️ Cảnh báo quan trọng: Không dùng `localhost` cho APK

APK khi cài trên điện thoại Android sẽ hiểu `localhost` (hay `127.0.0.1`) là **chính chiếc điện thoại đó**, **không phải** máy tính backend của bạn. Nếu API URL là `localhost`, mọi request tới backend sẽ **thất bại hoàn toàn**.

✅ **Đúng:** `https://api.yourbackend.com` hoặc `http://192.168.x.x:8080` (IP LAN thật)  
❌ **Sai:** `http://localhost:8080` hoặc `http://127.0.0.1:8080`

Nếu cả hai secret `EXPO_PUBLIC_BASE_URL` và `BASE_URL` đều rỗng, workflow sẽ **tự động fail** với thông báo hướng dẫn rõ ràng trước khi gọi EAS Build.

---

## Cấu hình Doctor App lần đầu (bắt buộc)

File `Frontend/doctor-app/app.json` hiện có `extra.eas.projectId` đang **rỗng**. EAS Build sẽ thất bại nếu không có `projectId`.

Để tạo `projectId`, chạy lệnh sau **1 lần duy nhất** ở máy local:

```bash
cd Frontend/doctor-app
npx eas build:configure
```

Lệnh này sẽ:
1. Tạo project trên expo.dev (nếu chưa có)
2. Cập nhật `projectId` trong `app.json`

Sau đó **commit và push** file `app.json` đã được cập nhật vào repository.

> **Patient App** (`Frontend/mobile`) đã được cấu hình EAS và có `projectId` hợp lệ.

---

## Phạm vi hỗ trợ hiện tại

| Tính năng | Trạng thái |
|---|---|
| Android APK (CI check) | ✅ Hỗ trợ |
| Android APK (EAS Build) | ✅ Hỗ trợ |
| iOS Build | ❌ Chưa hỗ trợ |
| EAS Submit (Google Play) | ❌ Chưa hỗ trợ |
| EAS Update (OTA) | ❌ Chưa hỗ trợ |

---

## EAS Build Profiles

Cả hai app sử dụng `eas.json` với 3 profile:

| Profile | Phân phối | Định dạng | Mục đích |
|---|---|---|---|
| `development` | internal | APK | Dev client, debug |
| `preview` | internal | APK | **Build CI/CD dùng profile này** — APK nội bộ chia sẻ qua expo.dev |
| `production` | internal | APK | APK production (chưa submit lên store) |

> `submit.production` đã được xóa khỏi `eas.json` vì EAS Submit chưa được sử dụng.
