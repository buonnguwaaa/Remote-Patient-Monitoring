# Admin Panel - Remote Patient Monitoring System

Ứng dụng quản trị dành riêng cho Admin của hệ thống giám sát bệnh nhân từ xa.

## Tổng quan

Đây là ứng dụng admin độc lập, tách biệt hoàn toàn với ứng dụng web dành cho bác sĩ. Admin panel cung cấp các chức năng quản lý toàn bộ hệ thống.

## Cấu trúc dự án

```
admin/
├── src/
│   ├── components/       # Các component dùng chung
│   │   ├── layout/      # Layout components (MainLayout, SideBar)
│   │   └── ui/          # UI components
│   ├── context/         # React Context (AuthContext)
│   ├── data/            # Dữ liệu tĩnh (NavData)
│   ├── features/        # Features (auth)
│   ├── pages/           # Các trang admin
│   │   ├── AdminDashboard.tsx
│   │   ├── DoctorManagement.tsx
│   │   ├── PatientManagementAdmin.tsx
│   │   ├── NurseManagement.tsx
│   │   ├── DepartmentManagement.tsx
│   │   ├── AssignmentManagement.tsx
│   │   ├── SystemSettings.tsx
│   │   ├── ActivityHistory.tsx
│   │   └── LoginPage.tsx
│   ├── services/        # API services
│   ├── types/           # TypeScript types
│   └── App.tsx          # Main app component
├── package.json
└── vite.config.ts
```

## Các tính năng chính

### 1. Quản lý Bác sĩ
- Xem danh sách bác sĩ
- Thêm/sửa/xóa bác sĩ
- Quản lý thông tin bác sĩ

### 2. Quản lý Bệnh nhân
- Xem danh sách bệnh nhân
- Thêm/sửa/xóa bệnh nhân
- Quản lý thông tin bệnh nhân

### 3. Quản lý Y tá
- Xem danh sách y tá
- Thêm/sửa/xóa y tá
- Quản lý thông tin y tá

### 4. Quản lý Khoa phòng
- Xem danh sách khoa phòng
- Thêm/sửa/xóa khoa phòng
- Quản lý thành viên khoa phòng

### 5. Phân công
- Phân công bệnh nhân cho bác sĩ/y tá
- Quản lý các phân công hiện tại

### 6. Cài đặt Hệ thống
- Cấu hình hệ thống
- Quản lý các thiết lập

### 7. Lịch sử Hoạt động
- Xem lịch sử hoạt động của hệ thống
- Theo dõi các thay đổi

## Cài đặt

```bash
# Cài đặt dependencies
npm install

# Chạy development server
npm run dev

# Build production
npm run build

# Preview production build
npm run preview
```

## Cấu hình

### Port
Admin app chạy trên port **5174** (khác với web app chạy trên port 5173)

### API Endpoint
API endpoint được cấu hình trong `src/services/api.ts`

## Đăng nhập

Chỉ tài khoản có role **admin** mới có thể đăng nhập vào admin panel.

- Nếu user không phải admin, sẽ bị từ chối đăng nhập
- Sau khi đăng nhập thành công, admin sẽ được redirect đến dashboard

## Phân biệt với Web App

| Tính năng | Admin App | Web App |
|-----------|-----------|---------|
| Port | 5174 | 5173 |
| User Role | Admin only | Doctor only |
| Chức năng | Quản lý hệ thống | Theo dõi bệnh nhân |
| Routing | `/`, `/doctors`, `/patients`, etc. | `/`, `/patient`, `/threshold-alerts`, etc. |

## Development

### Tech Stack
- **React 18** với TypeScript
- **Vite** - Build tool
- **React Router** - Routing
- **Axios** - HTTP client
- **React Icons** - Icons
- **Recharts** - Charts (nếu cần)

### Code Style
- TypeScript strict mode
- ESLint configuration
- Functional components với hooks

## Production Deployment

Khi deploy production, cần:
1. Build cả 2 apps (admin và web)
2. Deploy admin app lên subdomain riêng hoặc path riêng
3. Cấu hình CORS cho backend
4. Cập nhật API endpoint trong production

## Lưu ý

- Admin app và Web app hoàn toàn độc lập
- Không share state giữa 2 apps
- Mỗi app có authentication riêng
- Backend cần hỗ trợ role-based access control
