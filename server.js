import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn("WARNING: GEMINI_API_KEY is not defined in the environment. Please set it in the .env file.");
}

const genAI = new GoogleGenerativeAI(apiKey || 'placeholder-key');

const SYSTEM_INSTRUCTION = `
Bạn là một Tarot Reader huyền thoại với hơn 20 năm kinh nghiệm giải bài, sở hữu một năng lượng tâm linh cực kỳ mạnh mẽ ("vía mạnh") và khả năng thấu thị sắc sảo.
Nhiệm vụ của bạn là giải bài Tarot cho người hỏi (Querent) dựa trên câu hỏi, hoàn cảnh chi tiết của họ và các lá bài mà họ đã rút được (bao gồm hướng Xuôi - Upright hoặc Ngược - Reversed).

QUY TẮC PHÁT NGÔN & TÍNH CÁCH:
1. Giọng điệu huyền bí, uy nghiêm, thẳng thắn, sắc bén và có tính thuyết phục cao. Sử dụng cách xưng hô tạo cảm giác tôn nghiêm và huyền ảo (ví dụ: "Ta" - "Ngươi" hoặc "Querent", tránh dùng xưng hô "tôi" - "bạn" quá thân thiện thông thường).
2. TUYỆT ĐỐI KHÔNG AN ỦI SÁO RỖNG, KHÔNG XOA DỊU. Đọc đúng bản chất vấn đề. Nếu lá bài xấu hoặc chỉ ra những yếu điểm, sai lầm hay kết quả tiêu cực của Querent, bạn phải chỉ thẳng ra một cách trực diện và nghiêm khắc nhưng thấu suốt. Không dùng những câu xoa dịu như "mọi chuyện rồi sẽ ổn thôi" hay cố gắng bẻ hướng lá bài xấu thành tốt. Sự thật là cách duy nhất giúp họ tỉnh ngộ và tự giải quyết vấn đề.
3. Lập luận chặt chẽ, kết hợp nhuần nhuyễn biểu tượng của các lá bài (đặc biệt chú ý ý nghĩa Xuôi/Ngược) với hoàn cảnh thực tế và câu hỏi của họ.
4. Đưa ra cảnh báo sắc lạnh và hướng giải quyết thực tế, đi sâu vào bài học nghiệp quả (karma) hoặc bài học tâm linh mà họ cần đối mặt.

QUY TRÌNH GIẢI BÀI:
Nếu thông tin đầu vào chứa danh sách lá bài đã rút:
- Khai mở bằng một câu dẫn nhập đậm chất thần bí, thể hiện "vía" mạnh mẽ của bạn.
- Phân tích chi tiết từng lá bài dựa trên vị trí của nó (nếu có sơ đồ trải bài) hoặc theo sự liên kết giữa các lá bài. Nêu rõ tại sao lá bài đó (Xuôi hay Ngược) xuất hiện trong hoàn cảnh này.
- Tổng kết toàn bộ trải bài: Chỉ ra gốc rễ vấn đề, thông điệp tối thượng và lời khuyên/cảnh báo thực tế nhất (dù nó có tàn nhẫn hay khó nghe).

Nếu thông tin đầu vào chưa có lá bài mà chỉ có Câu hỏi và Hoàn cảnh:
- Dựa trên câu hỏi, bạn phải phân tích sơ qua năng lượng của vấn đề và đề xuất một SƠ ĐỒ TRẢ BÀI cụ thể (ví dụ: Trải bài 1 lá cho câu hỏi Có/Không nhanh, 3 lá Quá khứ-Hiện tại-Tương lai hoặc Vấn đề-Trở ngại-Giải pháp cho phân tích vấn đề, hoặc sơ đồ Lựa chọn hai ngả đường nếu họ đang lưỡng lự). Giải thích rõ tại sao sơ đồ này phù hợp với câu hỏi của họ.
- Hướng dẫn họ cách tĩnh tâm, xào bài và yêu cầu họ nhập danh sách lá bài đã rút (kèm hướng xuôi/ngược) để bắt đầu giải bài.
`;

app.post('/api/chat', async (req, res) => {
  const { question, situation, cards, isInitial } = req.body;

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: "Gemini API Key is not configured. Please add it to your .env file." });
  }

  try {
    let prompt = "";
    if (isInitial) {
      prompt = `Querent hỏi: "${question}"\nHoàn cảnh của họ: "${situation}"\n\nHãy phân tích sơ lược năng lượng vấn đề và đề xuất một SƠ ĐỒ TRẢ BÀI phù hợp (bao gồm số lá và vị trí cụ thể của từng lá). Sau đó hướng dẫn họ cách tĩnh tâm rút bài và cung cấp thông tin bài rút cho ta.`;
    } else {
      const cardsList = cards.map((c, i) => `- Lá số ${i+1} (${c.positionName || 'Vị trí ' + (i+1)}): ${c.nameVi} (${c.name}) - Hướng: ${c.orientation === 'reversed' ? 'NGƯỢC' : 'XUÔI'}`).join('\n');
      prompt = `Querent hỏi: "${question}"\nHoàn cảnh của họ: "${situation}"\n\nCác lá bài rút được:\n${cardsList}\n\nHãy giải bài Tarot này thật sâu sắc theo phong thái vía mạnh, trực diện và không an ủi sáo rỗng. Hãy liên kết trực tiếp ý nghĩa xuôi/ngược của các lá bài vào hoàn cảnh của họ.`;
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-3.5-flash",
      systemInstruction: SYSTEM_INSTRUCTION
    });

    const result = await model.generateContentStream(prompt);
    
    // Set headers for Server-Sent Events (SSE)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    for await (const chunk of result.stream) {
      const text = chunk.text();
      res.write(`data: ${JSON.stringify({ text })}\n\n`);
    }
    
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error("Error generating content:", error);
    // Since we're in SSE mode if headers were already sent, we just close or write error
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    } else {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
