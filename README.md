# Tarot Reader Chatbot - Kẻ Dẫn Đường Tâm Linh

Chào mừng bạn đến với **Tarot Reader Chatbot (Kẻ Dẫn Đường)**, một ứng dụng trò chuyện và giải mã các thông điệp Tarot dựa trên trí tuệ nhân tạo (API Gemini 2.5 Flash). Ứng dụng được thiết kế theo phong cách huyền bí, tinh tế và tập trung vào trải nghiệm trực quan của người dùng.

## Tính Năng Nổi Bật

- **Giao diện huyền bí (Mystical Glassmorphic UI):** Tông màu chủ đạo là tím đậm, xanh không gian kết hợp viền vàng ánh kim và hiệu ứng ánh sáng, lật bài mượt mà.
- **Tarot Reader "Vía Mạnh":** Trả lời trực diện, thấu suốt thực tế câu hỏi và hoàn cảnh của người trải, **không xoa dịu/an ủi sáo rỗng**, đi thẳng vào bản chất vấn đề và bài học tâm linh cần đối mặt.
- **Sơ đồ trải bài linh hoạt:** Đề xuất số lượng lá bài và sơ đồ trải bài phù hợp nhất dựa trên Câu hỏi & Hoàn cảnh của bạn.
- **Tương tác linh hoạt (2 Chế độ):**
  - *Tự Nhập Bài Rút (Physical Mode):* Cho phép bạn xào bài vật lý của riêng mình, rút bài và nhập từng lá bài đã rút (kèm hướng Xuôi/Ngược) vào hệ thống thông qua bộ lọc thông minh (search autocomplete) của 78 lá bài.
  - *Rút Bài Tự Động (Digital Mode):* Hệ thống sẽ tự động xào và rút bài ngẫu nhiên (không trùng lặp) và đặt vào các vị trí sơ đồ tương ứng.
- **Hiệu ứng Streaming (Server-Sent Events):** Kết quả giải bài được truyền tải từ API dưới dạng streaming thời gian thực, mang lại cảm giác sống động như người giải bài đang trực tiếp gõ chữ.

## Công Nghệ Sử Dụng

- **Backend:** Node.js, Express, `@google/generative-ai` (Gemini SDK), `dotenv`, `cors`
- **Frontend:** Vanilla HTML5, CSS3 (Custom transitions, gradients, keyframe animations), ES6 Modules JavaScript
- **Mô hình AI:** `gemini-2.5-flash`

## Hướng Dẫn Cài Đặt và Chạy

### 1. Chuẩn Bị
Yêu cầu hệ thống đã cài đặt sẵn **Node.js** (Khuyên dùng phiên bản 18+).

### 2. Cài đặt Dependencies
Mở terminal tại thư mục dự án và chạy lệnh:
```bash
npm install
```

### 3. Cấu hình Environment
Tạo tệp `.env` tại thư mục gốc (hoặc sao chép từ `.env.example`) và điền API Key Gemini của bạn:
```env
PORT=3000
GEMINI_API_KEY=your_actual_gemini_api_key_here
```
*(Nếu chưa có API Key, bạn có thể tạo miễn phí tại [Google AI Studio](https://aistudio.google.com/))*

### 4. Khởi động Ứng dụng
Khởi chạy server Node.js:
```bash
npm start
```
Truy cập vào ứng dụng qua trình duyệt web tại địa chỉ: [http://localhost:3000](http://localhost:3000)

## Cấu Trúc Thư Mục
```
tarot-reader-chatbot/
├── public/                 # Thư mục chứa tài nguyên tĩnh
│   ├── app.js              # Mã nguồn xử lý logic frontend & API
│   ├── index.html          # Giao diện chính của ứng dụng
│   ├── style.css           # Định nghĩa giao diện & hiệu ứng CSS
│   └── tarot-data.js       # Dữ liệu thuộc tính của 78 lá bài Tarot
├── .env                    # File cấu hình môi trường chứa API Key (được bỏ qua bởi git)
├── .env.example            # Bản mẫu cấu hình môi trường
├── .gitignore              # Định nghĩa các tệp bỏ qua khi push git
├── package.json            # Quản lý thư viện cài đặt & scripts chạy dự án
├── README.md               # Hướng dẫn dự án này
└── server.js               # Máy chủ Backend Node.js kết nối API Gemini
```
