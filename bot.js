import { Telegraf, session } from 'telegraf';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { tarotCards } from './tarot-data.js';

dotenv.config();

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const apiKey = process.env.GEMINI_API_KEY;

if (!botToken) {
  console.error("FATAL ERROR: TELEGRAM_BOT_TOKEN is not defined in the environment. Please configure it in .env file.");
  process.exit(1);
}

if (!apiKey) {
  console.error("FATAL ERROR: GEMINI_API_KEY is not defined in the environment. Please configure it in .env file.");
  process.exit(1);
}

const bot = new Telegraf(botToken);
const genAI = new GoogleGenerativeAI(apiKey);

// --- Specialized Tarot Reader system instruction ---
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
- Hướng dẫn họ cách tĩnh tâm, xào bài và yêu cầu họ cung cấp danh sách lá bài đã rút (kèm hướng xuôi/ngược) để bắt đầu giải bài.
`;

// Register Telegraf session middleware
bot.use(session());

// Initialize session state helper
function initSession(ctx) {
  ctx.session = ctx.session || {
    step: 'IDLE',
    question: '',
    situation: '',
    recommendedCount: 3,
    recommendedPositions: []
  };
  return ctx.session;
}

// Helper to parse card recommendation count and position names
function parseSpreadRecommendation(text) {
  let count = 3; // default
  const match = text.match(/(\d+)\s*(lá|quẻ|thiệp|cây)/i);
  if (match) {
    const parsed = parseInt(match[1], 10);
    if (parsed >= 1 && parsed <= 10) count = parsed;
  }
  
  let positions = [];
  if (count === 3) {
    positions = ["Quá khứ", "Hiện tại", "Tương lai"];
  } else if (count === 1) {
    positions = ["Tổng quan / Cốt lõi"];
  } else if (count === 2) {
    positions = ["Vấn đề hiện tại", "Trở ngại / Giải pháp"];
  } else if (count === 4) {
    positions = ["Hiện tại", "Trở ngại", "Lời khuyên", "Kết quả"];
  } else if (count === 5) {
    positions = ["Nguồn gốc", "Hiện tại", "Trở ngại", "Lời khuyên", "Kết quả"];
  } else {
    for (let i = 1; i <= count; i++) {
      positions.push(`Lá bài ${i}`);
    }
  }
  return { count, positions };
}

// Intelligent parser for physical cards input from text
function parseCardsFromText(text) {
  const parts = text.split(',').map(p => p.trim());
  const parsedCards = [];
  const errors = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;

    let orientation = 'upright';
    let cleanPart = part;
    if (part.toLowerCase().includes('ngược')) {
      orientation = 'reversed';
      cleanPart = part.replace(/ngược/i, '').trim();
    } else if (part.toLowerCase().includes('xuôi')) {
      orientation = 'upright';
      cleanPart = part.replace(/xuôi/i, '').trim();
    }

    // Normalize unicode and remove accents for fuzzy matching
    const query = cleanPart.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, '').trim();

    if (!query) {
      errors.push(`Lá bài thứ ${i+1} rỗng hoặc không hợp lệ.`);
      continue;
    }

    let matchedCard = null;
    let bestScore = 0;

    for (const card of tarotCards) {
      const cardViNorm = card.nameVi.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, '');
      const cardEnNorm = card.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, '');

      // Simple substring check
      if (cardViNorm.includes(query) || cardEnNorm.includes(query) || query.includes(cardViNorm) || query.includes(cardEnNorm)) {
        // Calculate match ratio (longer/shorter ratio) to handle best score
        const score = query.length / Math.max(cardViNorm.length, cardEnNorm.length);
        if (score > bestScore) {
          bestScore = score;
          matchedCard = card;
        }
      }
    }

    if (matchedCard) {
      parsedCards.push({
        name: matchedCard.name,
        nameVi: matchedCard.nameVi,
        orientation: orientation
      });
    } else {
      errors.push(`Không nhận diện được lá bài: "${part}"`);
    }
  }

  return { parsedCards, errors };
}

// Call Gemini API to fetch reading
async function generateTarotReading(question, situation, cards) {
  const cardsList = cards.map((c, i) => `- Lá số ${i+1} (${c.positionName || 'Vị trí ' + (i+1)}): ${c.nameVi} (${c.name}) - Hướng: ${c.orientation === 'reversed' ? 'NGƯỢC' : 'XUÔI'}`).join('\n');
  const prompt = `Querent hỏi: "${question}"\nHoàn cảnh của họ: "${situation}"\n\nCác lá bài rút được:\n${cardsList}\n\nHãy giải bài Tarot này thật sâu sắc theo phong thái vía mạnh, trực diện và không an ủi sáo rỗng. Hãy liên kết trực tiếp ý nghĩa xuôi/ngược của các lá bài vào hoàn cảnh của họ.`;

  const model = genAI.getGenerativeModel({
    model: "gemini-3.5-flash",
    systemInstruction: SYSTEM_INSTRUCTION
  });

  const result = await model.generateContent(prompt);
  return result.response.text();
}

// Command: /start
bot.start((ctx) => {
  const session = initSession(ctx);
  session.step = 'IDLE';
  
  ctx.replyWithMarkdown(
    `🔮 *KẺ DẪN ĐƯỜNG GIỮA CÁC CHIỀU KHÔNG GIAN* 🔮\n\n` +
    `"Chào linh hồn đang tìm kiếm ánh sáng hoặc đối mặt với bóng tối. Ta là Kẻ Dẫn Đường.\n` +
    `Ta không ở đây để an ủi ngươi bằng những lời dối trá ngọt ngào. Ta đọc vị tương lai và hiện tại dựa trên sự thật trần trụi của các lá bài."\n\n` +
    `👉 Hãy gõ lệnh \`/tarot\` để bắt đầu một phiên giải bài Tarot mới.`
  );
});

// Command: /tarot
bot.command('tarot', (ctx) => {
  const session = initSession(ctx);
  session.step = 'AWAITING_QUESTION';
  session.question = '';
  session.situation = '';
  session.slots = [];
  
  ctx.reply("Ta đã lắng nghe. Hãy nhập CÂU HỎI mà ngươi khao khát có lời giải đáp lúc này.");
});

// Handling Inline Keyboard Callbacks
bot.on('callback_query', async (ctx) => {
  const session = initSession(ctx);
  const data = ctx.callbackQuery.data;

  if (session.step !== 'AWAITING_METHOD_SELECTION') {
    return ctx.answerCbQuery("Phiên giải bài đã hết hạn hoặc không khớp. Vui lòng gõ /tarot để bắt đầu lại.");
  }

  await ctx.answerCbQuery();

  if (data === 'mode_digital') {
    // Digital Draw
    await ctx.reply("🔮 Ta đang xáo bài và rút ngẫu nhiên các lá bài cho ngươi...");
    
    // Draw cards randomly without replacement
    let shuffled = [...tarotCards].sort(() => 0.5 - Math.random());
    const count = session.recommendedCount;
    const drawn = [];
    
    for (let i = 0; i < count; i++) {
      const card = shuffled[i];
      const orientation = Math.random() > 0.5 ? 'upright' : 'reversed';
      drawn.push({
        name: card.name,
        nameVi: card.nameVi,
        orientation: orientation,
        positionName: session.recommendedPositions[i] || `Vị trí ${i+1}`
      });
    }

    session.slots = drawn;
    
    // Report drawn cards
    let cardReport = `✨ *Các lá bài đã rút được:* \n`;
    drawn.forEach((c, idx) => {
      cardReport += `*Lá số ${idx+1} (${c.positionName}):* ${c.nameVi} (${c.name}) - Hướng: *${c.orientation === 'upright' ? 'XUÔI' : 'NGƯỢC'}*\n`;
    });
    
    await ctx.replyWithMarkdown(cardReport);

    // Proceed to reading
    const statusMsg = await ctx.reply("⚡ Kẻ Dẫn Đường đang kết nối năng lượng tâm linh và giải mã quẻ bài...");
    await ctx.sendChatAction('typing');

    try {
      const reading = await generateTarotReading(session.question, session.situation, session.slots);
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        statusMsg.message_id,
        null,
        reading,
        { parse_mode: 'Markdown' }
      );
    } catch (err) {
      console.error(err);
      await ctx.reply("Vũ trụ nghẽn kết nối: " + err.message);
    }

    session.step = 'IDLE';

  } else if (data === 'mode_physical') {
    // Physical Card Input
    session.step = 'AWAITING_CARDS';
    
    let instructions = `✍️ *Hãy nhập danh sách các lá bài ngươi tự rút được.*\n\n` +
      `Nhập tên các lá bài theo thứ tự, cách nhau bằng dấu phẩy và kèm theo hướng *xuôi* hoặc *ngược* cho từng lá.\n\n` +
      `*Ví dụ định dạng (với ${session.recommendedCount} lá):*\n` +
      `\`Chàng Khờ xuôi, Cái Chết ngược, Mặt Trời xuôi\`\n\n` +
      `Hãy nhập và gửi tin nhắn cho ta ngay sau đây.`;
      
    await ctx.replyWithMarkdown(instructions);
  }
});

// Handling Text Messages
bot.on('text', async (ctx) => {
  const session = initSession(ctx);
  const text = ctx.message.text.trim();

  if (session.step === 'AWAITING_QUESTION') {
    session.question = text;
    session.step = 'AWAITING_SITUATION';
    await ctx.reply("Ta đã ghi nhận câu hỏi. Bây giờ, hãy chia sẻ HOÀN CẢNH thực tế lúc này của ngươi để vũ trụ định hình năng lượng.");
    
  } else if (session.step === 'AWAITING_SITUATION') {
    session.situation = text;
    session.step = 'AWAITING_METHOD_SELECTION';
    
    const waitMsg = await ctx.reply("🌌 Ta đang thấu thị hoàn cảnh của ngươi...");
    await ctx.sendChatAction('typing');

    try {
      // Ask Gemini for recommended spread
      const model = genAI.getGenerativeModel({
        model: "gemini-3.5-flash",
        systemInstruction: SYSTEM_INSTRUCTION
      });
      const prompt = `Querent hỏi: "${session.question}"\nHoàn cảnh của họ: "${session.situation}"\n\nHãy phân tích sơ lược năng lượng vấn đề và đề xuất một SƠ ĐỒ TRẢ BÀI phù hợp (bao gồm số lá và vị trí cụ thể của từng lá). Sau đó hướng dẫn họ cách tĩnh tâm rút bài và cung cấp thông tin bài rút cho ta.`;
      
      const result = await model.generateContent(prompt);
      const recommendationText = result.response.text();
      
      // Parse recommendation
      const { count, positions } = parseSpreadRecommendation(recommendationText);
      session.recommendedCount = count;
      session.recommendedPositions = positions;

      // Edit wait message to show Gemini's recommendation
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        waitMsg.message_id,
        null,
        recommendationText,
        { parse_mode: 'Markdown' }
      );

      // Present keyboard options
      await ctx.reply(
        `Hãy chọn phương thức rút bài để tiếp tục:`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                { text: '🔮 Rút bài tự động', callback_data: 'mode_digital' },
                { text: '✍️ Tự nhập bài vật lý', callback_data: 'mode_physical' }
              ]
            ]
          }
        }
      );

    } catch (err) {
      console.error(err);
      await ctx.reply("Đã xảy ra lỗi khi thấu thị năng lượng: " + err.message);
      session.step = 'IDLE';
    }

  } else if (session.step === 'AWAITING_CARDS') {
    // Parse user input cards
    const { parsedCards, errors } = parseCardsFromText(text);

    if (errors.length > 0) {
      let errMsg = `❌ *Có lỗi khi nhận diện bài của ngươi:*\n` + errors.map(e => `- ${e}`).join('\n') + `\n\nHãy kiểm tra lại tên lá bài (ví dụ: Chàng Khờ, Nhà Ảo Thuật, Hiệp sĩ Kiếm, Ace of Cups...) và gửi lại đúng định dạng.`;
      await ctx.replyWithMarkdown(errMsg);
      return;
    }

    if (parsedCards.length !== session.recommendedCount) {
      await ctx.reply(`Cảnh báo: Sơ đồ trải bài yêu cầu rút đúng ${session.recommendedCount} lá bài, nhưng ngươi vừa cung cấp ${parsedCards.length} lá bài. Hãy nhập lại chính xác.`);
      return;
    }

    // Attach position names to parsed cards
    parsedCards.forEach((c, idx) => {
      c.positionName = session.recommendedPositions[idx] || `Vị trí ${idx+1}`;
    });

    session.slots = parsedCards;

    // Report cards
    let cardReport = `✨ *Ghi nhận các lá bài của ngươi:* \n`;
    parsedCards.forEach((c, idx) => {
      cardReport += `*Lá số ${idx+1} (${c.positionName}):* ${c.nameVi} (${c.name}) - Hướng: *${c.orientation === 'upright' ? 'XUÔI' : 'NGƯỢC'}*\n`;
    });
    
    await ctx.replyWithMarkdown(cardReport);

    // Proceed to reading
    const statusMsg = await ctx.reply("⚡ Kẻ Dẫn Đường đang kết nối năng lượng tâm linh và giải mã quẻ bài...");
    await ctx.sendChatAction('typing');

    try {
      const reading = await generateTarotReading(session.question, session.situation, session.slots);
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        statusMsg.message_id,
        null,
        reading,
        { parse_mode: 'Markdown' }
      );
    } catch (err) {
      console.error(err);
      await ctx.reply("Vũ trụ nghẽn kết nối: " + err.message);
    }

    session.step = 'IDLE';

  } else {
    // Default reply if idle
    await ctx.reply("Ngươi muốn xin lời giải đáp từ các lá bài? Hãy gõ lệnh /tarot để bắt đầu kết nối kết giới.");
  }
});

// Launch bot
bot.launch().then(() => {
  console.log("Telegram Tarot Bot is running successfully...");
}).catch(err => {
  console.error("Failed to launch Telegram Bot:", err);
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
