my-project/
├── .vscode/ # Cài đặt VSCode cho dự án
├── node_modules/ # Thư viện
├── public/ # Tài nguyên tĩnh (favicon, index.html)
├── src/
│ ├── assets/ # 🏞️ Hình ảnh, fonts, icons...
│ ├── components/ # 🧩 Các component UI tái sử dụng
│ │ ├── layout/ # (Header, Footer, Sidebar...)
│ │ └── ui/ # (Button, Input, Card, Modal...)
│ ├── features/ # 🚀 Các cụm tính năng nghiệp vụ
│ │ └── auth/ # (Ví dụ: Tính năng xác thực)
│ │ ├── components/ # (LoginForm, RegisterForm...)
│ │ ├── hooks/ # (useAuth.ts)
│ │ ├── services/ # (authApi.ts)
│ │ └── index.ts # (Export mọi thứ của feature)
│ ├── hooks/ # 🎣 Các custom hooks toàn cục (global)
│ ├── lib/ # 🛠️ (hoặc utils) Hàm tiện ích chung
│ ├── pages/ # 📄 Các component ứng với từng trang (route)
│ │ ├── HomePage.tsx
│ │ └── ProfilePage.tsx
│ ├── services/ # 📡 (hoặc api) Logic gọi API (base client)
│ ├── store/ # 💾 (hoặc context) Quản lý state toàn cục
│ ├── styles/ # 🎨 CSS toàn cục, theme, variables
│ ├── types/ # 🏷️ Định nghĩa TypeScript toàn cục
│ ├── App.tsx # Component gốc của ứng dụng
│ └── main.tsx # Điểm vào (entry point)
│
├── .gitignore
├── package.json
├── README.md
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts

