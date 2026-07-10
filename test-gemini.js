import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function test() {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent("Xin chào, bạn là ai?");
    console.log("Success with gemini-2.0-flash!");
    console.log("Response:", result.response.text());
  } catch (err) {
    console.error("Failed with gemini-2.0-flash:", err);
  }
}
test();
