import dotenv from 'dotenv';
dotenv.config();

async function list() {
  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.error("GEMINI_API_KEY is not defined.");
      return;
    }
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    const data = await res.json();
    if (data.models) {
      console.log("=== AVAILABLE MODELS ===");
      data.models.forEach(m => {
        console.log(`- ID: ${m.name.replace('models/', '')} (${m.displayName})`);
      });
    } else {
      console.log(data);
    }
  } catch (err) {
    console.error(err);
  }
}
list();
