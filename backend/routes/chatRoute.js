import express from "express";
import database from "../services/database.js";

const router = express.Router();

function responseText(data) {
  return (data.candidates?.[0]?.content?.parts || [])
    .map((part) => typeof part.text === "string" ? part.text : "")
    .join("\n")
    .trim();
}

const productColors = [
  ["สีดำ", /ดำ|black/i], ["สีขาว", /ขาว|white/i], ["สีแดง", /แดง|red/i],
  ["สีน้ำเงิน", /น้ำเงิน|blue/i], ["สีกรมท่า", /กรมท่า|กรม|navy/i],
  ["สีเขียว", /เขียว|green/i], ["สีเหลือง", /เหลือง|yellow/i],
  ["สีชมพู", /ชมพู|pink/i], ["สีม่วง", /ม่วง|purple/i],
  ["สีส้ม", /ส้ม|orange/i], ["สีเทา", /เทา|gray|grey/i],
  ["สีน้ำตาล", /น้ำตาล|brown/i],
];

function findProductColorAnswer(message, conversation, products) {
  const query = message.toLocaleLowerCase("th");
  const isColorQuestion = /สีอะไร|มีสี|สีไหน|สีบ้าง|available colou?rs?/i.test(query);
  const userContext = conversation
    .filter((item) => item.role === "user")
    .map((item) => item.content)
    .join(" ");
  const wantsShirt = /เสื้อ|shirt|t-?shirt/i.test(userContext);
  if (isColorQuestion) {
    const relevant = wantsShirt
      ? products.filter((product) => /เสื้อ|shirt|t-?shirt/i.test(`${product.pdName || ""} ${product.pdRemark || ""} ${product.pdTypeName || ""}`))
      : products;
    const colors = productColors
      .filter(([, pattern]) => relevant.some((product) => pattern.test(`${product.pdName || ""} ${product.pdRemark || ""} ${product.pdTypeName || ""}`)))
      .map(([name]) => name);
    const subject = wantsShirt ? "เสื้อ" : "สินค้า";
    return colors.length
      ? `${subject}ที่มีข้อมูลสีในระบบมี${colors.join(" ")}ค่ะ`
      : `ยังไม่พบข้อมูลสีของ${subject}ในระบบค่ะ`;
  }

  // Carry the product type forward for short follow-ups such as “ขอสีดำหน่อย”.
  const asksForShirt = /เสื้อ|shirt|t-?shirt/i.test(query) || wantsShirt;
  const color = /ดำ|black/.test(query) ? /ดำ|black/i
    : /ขาว|white/.test(query) ? /ขาว|white/i
      : null;
  if (!asksForShirt) return null;

  const matches = products.filter((product) =>
    /เสื้อ|shirt|t-?shirt/i.test(`${product.pdName || ""} ${product.pdRemark || ""} ${product.pdTypeName || ""}`)
      && (!color || color.test(`${product.pdName || ""} ${product.pdRemark || ""} ${product.pdTypeName || ""}`)),
  );
  const colorLabel = color ? `สี${color.source.includes("ดำ") ? "ดำ" : "ขาว"}` : "";
  if (!matches.length) return color
    ? `จากรายการสินค้าที่ตรวจสอบ ยังไม่พบเสื้อ${colorLabel}ค่ะ`
    : "ขณะนี้ยังไม่พบรายการเสื้อในระบบค่ะ";
  const label = color ? `เสื้อ${colorLabel}` : "เสื้อ";
  return `มี${label} ${matches.length} รายการค่ะ\n${matches.map((product) => `• ${product.pdName} (รหัส ${product.pdId}) ราคา ${product.pdPrice ?? "สอบถาม"} บาท`).join("\n")}`;
}

router.post("/chat", async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;

  const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];
  const conversation = messages
    .filter((message) => ["user", "assistant"].includes(message?.role) && typeof message.content === "string")
    .slice(-12)
    .map((message) => ({ role: message.role, content: message.content.trim().slice(0, 2000) }))
    .filter((message) => message.content.length > 0);
  if (!conversation.length || conversation.at(-1).role !== "user") {
    return res.status(400).json({ message: "กรุณาพิมพ์ข้อความที่ต้องการสอบถาม" });
  }

  let catalog = "";
  let products = [];
  try {
    [products] = await database.query(
      "SELECT p.pdId, p.pdName, p.pdPrice, p.pdRemark, t.pdTypeName FROM `Product` p LEFT JOIN `ProductType` t ON t.pdTypeId = p.pdTypeId ORDER BY p.pdId LIMIT 80",
    );
    catalog = products.map((product) =>
      `${product.pdName} (รหัส ${product.pdId}, ราคา ${product.pdPrice ?? "สอบถาม"} บาท)${product.pdRemark ? ` — ${product.pdRemark}` : ""}`,
    ).join("\n");
  } catch (error) {
    // Keep general store questions available while the product database is offline.
    console.error("[POST /chat] product catalog unavailable:", error);
  }

  if (products.length) {
    const exactAnswer = findProductColorAnswer(conversation.at(-1).content, conversation, products);
    if (exactAnswer) return res.json({ answer: exactAnswer });
  }
  if (!apiKey) return res.status(503).json({ message: "ระบบแชตยังไม่ได้ตั้งค่า GEMINI_API_KEY" });

  try {
    const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";
    const requestBody = JSON.stringify({
        systemInstruction: {
          parts: [{ text: `คุณคือผู้ช่วยร้าน I HAVE KU ตอบเป็นภาษาไทยอย่างสุภาพและกระชับ ช่วยตอบคำถามทั่วไปเกี่ยวกับร้านได้ แต่การแนะนำสินค้า ราคา สต็อก และคุณสมบัติต้องอ้างอิงรายการด้านล่างเท่านั้น ห้ามแต่งข้อมูลขึ้นเอง${catalog ? " หากไม่พบข้อมูลให้บอกลูกค้าให้ติดต่อร้าน" : " ขณะนี้เข้าถึงฐานข้อมูลสินค้าไม่ได้ จึงห้ามสรุปว่าร้านไม่มีสินค้า หากลูกค้าถามสินค้า ราคา หรือสต็อก ให้แจ้งว่าตรวจสอบข้อมูลไม่ได้ชั่วคราวและแนะนำให้ติดต่อร้าน"}\n\nรายการสินค้า:\n${catalog || "ยังโหลดข้อมูลสินค้าไม่ได้"}` }],
        },
        contents: conversation.map((message) => ({
          role: message.role === "assistant" ? "model" : "user",
          parts: [{ text: message.content }],
        })),
        generationConfig: { maxOutputTokens: 500 },
      });
    const requestModel = (modelName) => fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
      body: requestBody,
      signal: AbortSignal.timeout(30_000),
    });
    let upstream;
    try {
      upstream = await requestModel(model);
    } catch (error) {
      // A brief upstream/network interruption should not immediately fail the chat.
      console.warn("Gemini request failed; retrying once:", error.cause?.code || error.name);
      await new Promise((resolve) => setTimeout(resolve, 500));
      upstream = await requestModel(model);
    }
    for (const fallbackModel of ["gemini-3.5-flash", "gemini-3.1-flash-lite"]) {
      if (upstream.status !== 503) break;
      if (model === fallbackModel) continue;
      console.warn(`Gemini model request returned 503; retrying with ${fallbackModel}`);
      upstream = await requestModel(fallbackModel);
    }

    const raw = await upstream.text();
    let data;
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      console.error("Gemini API returned invalid JSON:", upstream.status, raw.slice(0, 500));
      return res.status(502).json({ message: "AI ตอบกลับไม่สำเร็จ กรุณาลองอีกครั้ง" });
    }

    if (!upstream.ok) {
      console.error("Gemini API request failed:", upstream.status, data.error?.message || data);
      const message = upstream.status === 503
        ? "บริการ AI กำลังมีผู้ใช้งานจำนวนมาก กรุณาลองอีกครั้งในอีกสักครู่"
        : upstream.status === 429
          ? "ถึงขีดจำกัดการใช้งาน AI ชั่วคราว กรุณาลองใหม่ภายหลัง"
          : [401, 403].includes(upstream.status)
            ? "ระบบ AI ยังไม่ได้รับอนุญาตให้ใช้งาน กรุณาตรวจสอบ API key"
            : "AI ตอบกลับไม่สำเร็จ กรุณาลองอีกครั้ง";
      return res.status(502).json({ message });
    }
    const answer = responseText(data);
    return res.json({ answer: answer || "ขออภัย ระบบยังสร้างคำตอบไม่ได้ กรุณาลองถามอีกครั้ง" });
  } catch (error) {
    const code = error.cause?.code;
    console.error("[POST /chat] failed during Gemini request:", code || error.name, error.message);
    const message = error.name === "TimeoutError" || error.name === "AbortError"
      ? "AI ใช้เวลาตอบนานเกินไป กรุณาลองใหม่อีกครั้ง"
      : "เซิร์ฟเวอร์เชื่อมต่อบริการ AI ไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตและการตั้งค่าเครือข่ายของ backend";
    return res.status(502).json({ message });
  }
});

export default router;
