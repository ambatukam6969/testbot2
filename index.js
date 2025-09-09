import TelegramBot from "node-telegram-bot-api";
import fs from "fs";
import path from "path";
import { GoogleGenerativeAI } from "@google/generative-ai";

// === CONFIG ===
// Token bot Telegram dari BotFather
const token = process.env.TELEGRAM_TOKEN;
// ID Telegram kamu (owner)
const ownerId = process.env.OWNER_ID;

// API Key Gemini dari Google AI Studio
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// === INIT TELEGRAM BOT ===
const bot = new TelegramBot(token, { polling: true });

// === SESSION HANDLING ===
const sessionDir = path.resolve("./sessions");
if (!fs.existsSync(sessionDir)) {
  fs.mkdirSync(sessionDir);
}

function getSession(userId) {
  const filePath = path.join(sessionDir, `${userId}.json`);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify([]));
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function saveSession(userId, session) {
  const filePath = path.join(sessionDir, `${userId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(session, null, 2));
}

// === BOT HANDLER ===
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text?.trim();

  if (!text) return;

  if (text === "/start") {
    bot.sendMessage(
      chatId,
      `Hai ${msg.from.first_name}, aku YukiAi 🌸\nKetik apa saja untuk ngobrol denganku.`
    );
    return;
  }

  if (text === "/reset") {
    saveSession(userId, []);
    bot.sendMessage(chatId, "✨ Riwayat percakapanmu sudah direset!");
    return;
  }

  // ambil session user
  let session = getSession(userId);

  // tambahkan pesan user
  session.push({ role: "user", content: text });

  try {
    // siapkan history untuk Gemini
    const prompt =
      session.map((m) => `${m.role === "user" ? "User" : "Yuki"}: ${m.content}`).join("\n") +
      `\nYuki:`;

    const result = await model.generateContent(prompt);
    const reply = result.response.text();

    // simpan jawaban ke session
    session.push({ role: "assistant", content: reply });
    saveSession(userId, session);

    bot.sendMessage(chatId, reply);
  } catch (err) {
    console.error("Error Gemini:", err);
    bot.sendMessage(chatId, "❌ Ups, ada error saat menghubungi AI.");
  }
});
