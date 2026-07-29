# CẨM NANG BẢO VỆ ĐỒ ÁN TỐT NGHIỆP
## Đề tài: Remote Patient Monitoring (RPM) — Hệ thống Theo dõi Bệnh nhân từ xa

---

## 📌 Lời khuyên chung khi bảo vệ đồ án

1. **Nguyên tắc 3S**: **Short** (Ngắn gọn) — **Specific** (Cụ thể vào dự án) — **Structure** (Rõ ràng theo từng ý).
2. **Thái độ trả lời**: Luôn xưng *"Thưa thầy/cô,..."* và trả lời thẳng vào trọng tâm trong 1-2 câu đầu tiên trước khi giải thích chi tiết.
3. **Nếu gặp câu chưa làm hoặc không biết**: Không đoán mò. Hãy tự tin trả lời: *"Báo cáo thầy/cô, trong phạm vi đồ án hiện tại em chưa cài đặt chi tiết phần này. Tuy nhiên theo tìm hiểu của em, giải pháp là [...] và em sẽ bổ sung trong hướng phát triển tiếp theo ạ."*

---

## 🎯 Nhóm 1: Tổng quan Đề tài & Bài toán Thực tế (Business Domain)

### ❓ Câu 1: Em hãy trình bày mục tiêu thực tế của đồ án và điểm khác biệt so với các ứng dụng quản lý khám chữa bệnh thông thường?
* **Trả lời mẫu**:
  > *"Thưa thầy/cô, các ứng dụng khám chữa bệnh thông thường chỉ quản lý lịch hẹn hoặc hồ sơ bệnh án tĩnh tại viện. Đồ án **Remote Patient Monitoring (RPM)** giải quyết bài toán theo dõi sức khỏe **liên tục và chủ động** ngoài cơ sở y tế.*
  > *Điểm khác biệt cốt lõi của hệ thống bao gồm:*
  > 1. **Cảnh báo thông minh**: Không chỉ cảnh báo theo mốc điểm tức thời (Point-in-time threshold) mà còn tự động phân tích **xu hướng (Trend Analysis 21 ngày)** huyết áp/đường huyết để phát hiện nguy cơ sớm.
  > 2. **Kiến trúc Đa ứng dụng (Multi-app)**: Chia tách thành 5 ứng dụng độc lập (Doctor Web, Admin Web, Patient App, Staff Mobile, Backend API) tối ưu cho từng vai trò.
  > 3. **Xử lý luồng bền vững (Durable Workflow)**: Nhờ Temporal.io, hệ thống đảm bảo các nhắc nhở uống thuốc và đánh giá cảnh báo không bao giờ bị sót ngay cả khi server gặp sự cố."*

---

### ❓ Câu 2: Hệ thống có bao nhiêu vai trò (Role)? Luồng phối hợp giữa Bác sĩ, Y tá, Bệnh nhân và Admin diễn ra như thế nào?
* **Trả lời mẫu**:
  > *"Hệ thống có **4 vai trò chính** với phân quyền chặt chẽ (RBAC):*
  > * **Admin**: Quản lý tài khoản, phòng ban, phân công nhân sự y tế. Admin tạo tài khoản cho bệnh nhân và gửi **Invite Link có thời hạn 15 phút** để bệnh nhân tự khởi tạo mật khẩu (tránh lộ mật khẩu thô).*
  > * **Bác sĩ (Doctor)**: Quản lý danh sách bệnh nhân được phân công, thiết lập **ngưỡng sinh hiệu cá nhân hóa**, kê đơn thuốc, xem biểu đồ xu hướng, nhận cảnh báo real-time và chat/video call (Jitsi) với bệnh nhân.*
  > * **Y tá (Nurse)**: Sử dụng **Staff Mobile (`doctor-app`)** để xem danh sách bệnh nhân và nhập chỉ số sinh hiệu hộ bệnh nhân khi cần.*
  > * **Bệnh nhân (Patient)**: Dùng **Patient Mobile App** nhập sinh hiệu, nhận nhắc nhở uống thuốc, xem lịch sử cảnh báo và trao đổi với đội ngũ chăm sóc."*

---

## 🏗️ Nhóm 2: Kiến trúc Hệ thống & Lựa chọn Công nghệ (Tech Stack)

### ❓ Câu 3: Tại sao em lại chọn Golang (Gin Framework) làm Backend mà không dùng Node.js hay Java/Python?
* **Trả lời mẫu**:
  > *"Thưa thầy/cô, dữ liệu từ các thiết bị/bệnh nhân gửi về hệ thống RPM có tần suất cao và đòi hỏi xử lý thời gian thực. Em chọn Golang và Gin vì:*
  > 1. **Hiệu năng & Concurrency cực cao**: Mô hình **Goroutine** của Go rất nhẹ (chỉ tốn vài KB bộ nhớ mỗi goroutine), giúp backend xử lý hàng nghìn kết nối đồng thời với Latency cực thấp.
  > 2. **Tốc độ biên dịch & Đóng gói nhẹ**: Biên dịch ra file binary đơn lẻ, khởi động tức thì, tương thích hoàn hảo với môi trường Docker Container.
  > 3. **Gin Framework**: Cung cấp Routing rất nhanh (dựa trên Radix tree), Middleware linh hoạt cho auth và logging mà không mang quá nhiều overhead như Spring Boot hay Django."*

---

### ❓ Câu 4: Tại sao chọn MongoDB (NoSQL) cho dữ liệu y tế thay vì CSDL quan hệ (PostgreSQL/MySQL)?
* **Trả lời mẫu**:
  > *"Em chọn MongoDB xuất phát từ bản chất dữ liệu của hệ thống RPM:*
  > 1. **Schema linh hoạt (Dynamic Schema)**: Mỗi loại sinh hiệu (Huyết áp, Nhịp tim, Đường huyết, SPO2...) có cấu trúc đo lường và chỉ số khác nhau (ví dụ: Huyết áp gồm Tâm thu/Tâm trương, Đường huyết lại có Trước ăn/Sau ăn). NoSQL giúp lưu trữ dưới dạng Document linh hoạt mà không cần `JOIN` phức tạp hay tạo quá nhiều bảng thưa (sparse tables).
  > 2. **Ghi tốc độ cao (High Write Throughput)**: Sinh hiệu là chuỗi dữ liệu theo thời gian (Time-series data), MongoDB hỗ trợ ghi append-only nhanh và dễ dàng mở rộng theo chiều ngang (**Sharding**) khi lượng bệnh nhân tăng mạnh."*
* *(Nếu hỏi tiếp: "Thế tính toàn vẹn dữ liệu thì sao?"):*
  > *"Đối với các giao dịch quan trọng (như kê đơn, phân công bệnh nhân), MongoDB từ phiên bản 4.0 đã hỗ trợ **ACID Multi-document Transactions**, đồng thời logic kiểm tra ràng buộc được em xử lý chặt chẽ ở tầng Service layer trong Backend Go."*

---

### ❓ Câu 5: Temporal.io là gì? Tại sao em dùng Temporal mà không dùng Cron Job hoặc Message Queue (RabbitMQ/Celery)?
* **Trả lời mẫu**:
  > *"Thưa thầy/cô, **Temporal.io** là một **Durable Execution Engine** (Hệ thống thực thi luồng bền vững).*
  > *Nếu dùng Cron Job hay Message Queue thông thường, khi Server hoặc Worker bị sập/restart đúng lúc đang đánh giá cảnh báo hay gửi nhắc nhở uống thuốc, trạng thái tác vụ sẽ bị mất hoặc phải viết code retry rất phức tạp.*
  > *Temporal giải quyết triệt để vấn đề này:*
  > * Nó lưu vết trạng thái luồng (Event History). Nếu Worker bị crash, khi dựng lại nó sẽ **tiếp tục đúng bước đang dở dang** mà không làm mất dữ liệu.
  > * Cho phép tạo các luồng kéo dài (Long-running Workflows) như: theo dõi tiến trình 21 ngày của bệnh nhân, hẹn giờ nhắc nhở định kỳ với cơ chế Retry tự động linh hoạt."*

---

### ❓ Câu 6: Cơ chế Real-time (WebSocket + Redis Pub/Sub) trong hệ thống hoạt động như thế nào?
* **Trả lời mẫu**:
  > *"Hệ thống kết hợp **WebSocket** và **Redis Pub/Sub** để thông báo tức thì:*
  > 1. Khi bệnh nhân gửi chỉ số bất thường hoặc gửi tin nhắn chat, Backend API xử lý và **Publish** một Event vào **Redis Channel** tương ứng.
  > 2. Các **WebSocket Server Nodes** đang lắng nghe (Subscribe) Redis Channel sẽ nhận được Event này và ngay lập tức đẩy (Push) dữ liệu xuống đúng kết nối WebSocket của Bác sĩ/Bệnh nhân đang mở.
  > 3. Mô hình này giúp hệ thống **mở rộng theo chiều ngang (Scale out)** dễ dàng: Dù người dùng kết nối tới bất kỳ WebSocket Server node nào, Redis Pub/Sub vẫn đảm bảo tin nhắn đến đúng người nhận mà không bị dính chặt vào 1 server đơn lẻ."*

---

## 🔒 Nhóm 3: Chi tiết Kỹ thuật & Bảo mật (Deep-Dive)

### ❓ Câu 7: Cơ chế đánh giá cảnh báo (Alert Evaluation) hoạt động thế nào? Sự khác biệt giữa Cảnh báo Ngưỡng và Cảnh báo Xu hướng?
* **Trả lời mẫu**:
  > *"Khi có một bản ghi sinh hiệu mới, `AlertWorkflow` của Temporal sẽ kích hoạt 2 cấp độ kiểm tra:*
  > 1. **Personal Threshold (Cảnh báo Ngưỡng)**: So sánh giá trị mới nhập với khoảng Min/Max do Bác sĩ thiết lập riêng cho bệnh nhân đó (ví dụ: Huyết áp tâm thu > 140 mmHg).
  > 2. **Trend Alert (Cảnh báo Xu hướng 21 ngày)**: Hệ thống truy vấn lịch sử đo lường trong khoảng 21 ngày gần nhất để tính toán biến thiên/độ lệch (như huyết áp tăng dần liên tục trong 5 ngày dù chưa vượt ngưỡng tuyệt đối). Điều này giúp cảnh báo sớm nguy cơ biến chứng trước khi bệnh nhân rơi vào tình trạng nguy cấp."*

---

### ❓ Câu 8: Hệ thống quản lý Xác thực & Phân quyền ra sao? Xử lý Đăng xuất (Logout) như thế nào khi JWT là Stateless?
* **Trả lời mẫu**:
  > *"Hệ thống sử dụng **JWT (JSON Web Token)** kết hợp với **RBAC Middleware** trên Go/Gin.*
  > *Về vấn đề Đăng xuất (Logout): Do JWT có tính chất Stateless (không lưu session trên DB), để hủy token lập tức khi người dùng bấm Logout hoặc bị thu hồi quyền, em áp dụng cơ chế **Redis JWT Blacklist**:*
  > * Khi người dùng Logout, `jti` (JWT ID) hoặc hash của Token sẽ được ghi vào Redis với thời gian sống (**TTL**) đúng bằng thời gian hết hạn còn lại của Token đó.
  > * Mọi API call đi qua Auth Middleware sẽ kiểm tra nhanh trong Redis (tốc độ in-memory < 1ms). Nếu Token nằm trong Blacklist, request sẽ bị từ chối `401 Unauthorized` ngay lập tức."*

---

### ❓ Câu 9: Dữ liệu y tế (PHI - Protected Health Information) có tính bảo mật rất cao. Đồ án của em bảo vệ dữ liệu này như thế nào?
* **Trả lời mẫu**:
  > *"Hệ thống áp dụng chiến lược bảo vệ đa lớp:*
  > 1. **Mã hóa dữ liệu khi lưu trữ (Encryption at Rest)**: Sử dụng thuật toán **AES-GCM** để mã hóa cấp trường (Field-level encryption) đối với các thông tin nhạy cảm như dữ liệu sinh hiệu, nội dung chat trước khi ghi vào MongoDB thông qua khóa bí mật `FIELD_ENCRYPTION_KEY`.
  > 2. **Mã hóa khi truyền tải (Encryption in Transit)**: Toàn bộ giao tiếp giữa Client - Backend và giữa các Service đều chạy trên HTTPS/WSS.
  > 3. **Nhật ký truy vết (Audit Trail)**: Mọi thao tác quản trị, thay đổi cấu hình hoặc truy cập dữ liệu nhạy cảm đều được ghi lại trong Activity Log để sẵn sàng truy vết khi có sự cố."*

---

## 📈 Nhóm 4: Hiệu năng, Khả năng mở rộng & Hạn chế

### ❓ Câu 10: Giả sử hệ thống có 100.000 bệnh nhân gửi sinh hiệu liên tục mỗi phút, hệ thống của em có bị nghẽn không? Em sẽ scale như thế nào?
* **Trả lời mẫu**:
  > *"Thưa thầy/cô, kiến trúc hiện tại được thiết kế sẵn sàng cho việc Scale:*
  > * **Stateless API Backend**: Server Go/Gin hoàn toàn không giữ trạng thái, có thể nhân bản thành nhiều Instance đứng sau một **Load Balancer (Nginx/ALB)**.
  > * **Phân tách Worker**: Tiến trình `cmd/worker` của Temporal chạy độc lập với API Server `cmd/server`. Khi lượng job cảnh báo tăng, ta chỉ cần scale số lượng Worker container.
  > * **Caching với Redis**: Giảm tải cho CSDL với chiến lược **Cache-aside** cho các dữ liệu đọc nhiều (như thông tin profile, ngưỡng cài đặt).
  > * **Database Sharding**: Với MongoDB, ta có thể phân mảnh (Sharding) tập dữ liệu `measurements` theo `patient_id` để phân tán tải I/O ghi trên nhiều node."*

---

### ❓ Câu 11: Hệ thống tích hợp nhiều dịch vụ bên thứ 3 (Twilio, Cloudinary, Firebase FCM, Jitsi). Nếu một dịch vụ bên ngoài bị sập thì sao?
* **Trả lời mẫu**:
  > *"Hệ thống được thiết kế theo cơ chế **Fault-Tolerance (Kháng lỗi)**:*
  > * Các tác vụ gửi SMS (Twilio) hay Push Notification (FCM) đều được bọc trong **Temporal Activity**.
  > * Temporal hỗ trợ cấu hình **Retry Policy** (tự động thử lại với Exponential Backoff khi API bên thứ 3 ngắt kết nối tạm thời).
  > * Các tính năng không cốt lõi (như avatar Cloudinary hoặc Video call Jitsi) nếu gián đoạn sẽ chỉ làm ảnh hưởng riêng tính năng đó, không làm ngưng trệ toàn bộ luồng ghi nhận sinh hiệu hay luồng lưu trữ cốt lõi của Backend."*

---

### ❓ Câu 12: Hạn chế lớn nhất của đồ án hiện tại là gì? Hướng phát triển tiếp theo của em?
* **Trả lời mẫu**:
  > *" **Hạn chế hiện tại**:*
  > * Nhập sinh hiệu hiện tại vẫn phụ thuộc vào việc bệnh nhân/y tá tự nhập thủ công qua giao diện Mobile App mà chưa kết nối trực tiếp qua Bluetooth (BLE) với các thiết bị y tế đo phần cứng thực tế.
  > * Thuật toán phân tích xu hướng 21 ngày đang dựa trên rule-based/thống kê mô tả.
  > 
  > **Hướng phát triển tiếp theo**:*
  > 1. Tích hợp chuẩn **FHIR (Fast Healthcare Interoperability Resources)** để dễ dàng kết nối dữ liệu với các hệ thống EMR/HIS của bệnh viện.
  > 2. Đưa mô hình **Machine Learning/AI** vào để dự đoán nguy cơ đột quỵ/diễn biến xấu dựa trên chuỗi thời gian (Time-series ML) thay vì chỉ dùng ngưỡng tĩnh."*

---

## 🛠️ Danh mục URL & Công cụ minh họa khi Demo
* **Swagger API Documentation**: `http://localhost:8080/swagger/index.html`
* **Temporal Workflow Web UI**: `http://localhost:8233`
* **Backend Health Check**: `http://localhost:8080/health`
