import express from "express";
import { chromium } from "playwright";

const app = express();

app.get("/", (req, res) => {
  res.json({ message: "credaluga-login-api alive" });
});

// 🔹 Endpoint de teste para validar o Chromium
app.get("/test", async (req, res) => {
  try {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto("https://example.com", { waitUntil: "domcontentloaded" });
    const title = await page.title();

    await browser.close();

    res.json({ ok: true, title });
  } catch (err) {
    res.status(500).json({
      error: "Playwright failed",
      details: err.message,
    });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
