# Tarot Reader Telegram Bot - Kẻ Dẫn Đường Tâm Linh

Chào mừng bạn đến với **Tarot Reader Telegram Bot (Kẻ Dẫn Đường)**, một bot Telegram trò chuyện và giải mã các thông điệp Tarot dựa trên trí tuệ nhân tạo (API Gemini 2.5 Flash). Bot được cấu hình với giọng điệu thần bí, thấu suốt thực tế câu hỏi và hoàn cảnh của người trải, **không xoa dịu/an ủi sáo rỗng**, đi thẳng vào bản chất vấn đề và bài học tâm linh cần đối mặt.

## Tính Năng Nổi Bật

- **Tarot Reader "Vía Mạnh":** Trực diện, sắc sảo và uy nghiêm. Chỉ thẳng lỗi sai, trở ngại và điểm nghẽn nghiệp quả của người hỏi mà không xoa dịu bằng lời nói ngọt ngào sáo rỗng.
- **Sơ đồ trải bài linh hoạt:** Dựa vào câu hỏi, bot sẽ phân tích năng lượng vấn đề và đề xuất sơ đồ trải bài phù hợp nhất (1 lá, 3 lá Quá khứ - Hiện tại - Tương lai, v.v.).
- **2 Chế độ Rút Bài:**
  - *Rút bài tự động (Digital Mode):* Bot sẽ tự xáo bài và rút ngẫu nhiên các lá bài không trùng lặp từ kho dữ liệu 78 lá, gán hướng Xuôi/Ngược và giải bài lập tức.
  - *Tự nhập bài vật lý (Physical Mode):* Cho phép bạn nhập danh sách bài đã rút từ bài vật lý của riêng bạn dưới dạng văn bản đơn giản (ví dụ: `Fool xuôi, Death ngược, Sun xuôi`). Bot có bộ lọc thông minh (Fuzzy logic) tự động nhận diện chính xác 78 lá bài kể cả viết tắt hay tiếng Anh.
- **Trạng thái Gõ Chữ (Typing status):** Giúp cuộc trò chuyện tự nhiên hơn trong thời gian bot chờ kết nối API Gemini.

## Công Nghệ Sử Dụng

- **Backend:** Node.js, `telegraf` (Telegram Bot SDK), `@google/generative-ai` (Gemini SDK), `dotenv`
- **Mô hình AI:** `gemini-2.5-flash`

## Hướng Dẫn Cài Đặt và Chạy

### 1. Chuẩn Bị
- Máy tính đã cài đặt **Node.js** (Phiên bản 18+).
- Một **Telegram Bot Token** được tạo từ BotFather trên Telegram (gõ chat với [@BotFather](https://t.me/BotFather) để tạo bot mới và nhận token).
- Một **Gemini API Key** tạo miễn phí tại [Google AI Studio](https://aistudio.google.com/).

### 2. Cài đặt Dependencies
Mở terminal tại thư mục dự án và chạy:
```bash
npm install
```

### 3. Cấu hình Environment
Tạo tệp `.env` tại thư mục gốc (hoặc sao chép từ `.env.example`) và điền các API Key & Token của bạn:
```env
PORT=3000
GEMINI_API_KEY=your_actual_gemini_api_key_here
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
```

### 4. Khởi động Bot Telegram
Khởi chạy bot:
```bash
npm start
```
Mở Telegram, tìm kiếm username của Bot bạn đã tạo và gõ `/start` hoặc `/tarot` để bắt đầu cuộc trò chuyện giải bài Tarot.

---

*Lưu ý: Dự án vẫn giữ lại mã nguồn của máy chủ Web app ở tệp `server.js` và thư mục `public/`. Nếu muốn chạy giao diện Web, bạn có thể chạy lệnh `npm run web` và truy cập `http://localhost:3000`.*
