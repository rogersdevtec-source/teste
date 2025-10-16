import express from "express";
import { chromium } from "playwright";

const app = express();

app.get("/", (req, res) => {
  res.json({ message: "credaluga-login-api alive" });
});

app.get("/test", async (req, res) => {
  try {
    // Aguarda 1s para garantir que o Chromium está pronto
    await new Promise(r => setTimeout(r, 1000));

    const browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();
    await page.goto("https://example.com", { waitUntil: "domcontentloaded" });
    const title = await page.title();

    await browser.close();
    res.json({ ok: true, title });
  } catch (err) {
    res.status(500).json({ error: "Playwright failed", details: err.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
