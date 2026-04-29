# Notification Sounds

## Cách thêm âm thanh thông báo tùy chỉnh:

1. **Chuẩn bị file âm thanh:**
   - Tên file: `rpm_notification.wav`
   - Định dạng: WAV hoặc MP3
   - Thời lượng: 1-3 giây (khuyến nghị)
   - Chất lượng: 44.1kHz, 16-bit (cho WAV)

2. **Đặt file vào thư mục này:**
   ```
   Frontend/mobile/assets/sounds/rpm_notification.wav
   ```

3. **Rebuild ứng dụng:**
   ```bash
   npx expo prebuild --clean
   ./gradlew assembleRelease
   ```

## Lưu ý:
- File âm thanh sẽ được tự động copy vào thư mục resources khi build
- Âm thanh sẽ được sử dụng cho tất cả push notifications
- Hỗ trợ cả Android và iOS

## Tạo âm thanh tùy chỉnh:
Bạn có thể:
- Sử dụng Audacity (miễn phí) để tạo/chỉnh sửa âm thanh
- Tải âm thanh từ freesound.org
- Ghi âm giọng nói "RPM" bằng điện thoại và chuyển đổi sang WAV