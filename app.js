import express from 'express';
import { chromium } from 'playwright';

const app = express();
const PORT = process.env.PORT || 10000;

app.get('/test', async (req, res) => {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    // 1️⃣ Ir para a página de login
    await page.goto('https://app.credaluga.com.br/login', { waitUntil: 'networkidle' });

    // 2️⃣ Capturar CSRF do input escondido
    const csrfToken = await page.$eval('input[name="csrfToken"]', el => el.value);

    // 3️⃣ Preencher login
    await page.fill('input[name="email"]', 'caroline@amppliataimoveis.com.br');
    await page.fill('input[name="password"]', 'Carol@123');

    // 4️⃣ Submeter o formulário
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle' }),
    ]);

    // 5️⃣ Capturar cookies
    const cookies = await context.cookies();

    // 6️⃣ Retornar resultado em JSON
    res.json({
      csrfToken,
      cookies
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Playwright failed', details: error.message });
  } finally {
    if (browser) await browser.close();
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server listening on port ${PORT}`);
});
