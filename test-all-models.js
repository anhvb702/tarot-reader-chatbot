import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const models = [
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-2.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash",
  "gemini-flash-latest",
  "gemini-pro-latest",
  "gemini-3-flash-preview",
  "gemini-3.1-flash-lite-preview"
];

async function testAll() {
  for (const modelName of models) {
    try {
      console.log(`Testing model: ${modelName}...`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent("Hi");
      console.log(`✅ SUCCESS: ${modelName}`);
      console.log(`Response: ${result.response.text().trim()}`);
      console.log("------------------------");
    } catch (err) {
      console.log(`❌ FAILED: ${modelName}. Error: ${err.message.substring(0, 150)}`);
      console.log("------------------------");
    }
  }
}
testAll();
