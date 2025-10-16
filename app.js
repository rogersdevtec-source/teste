import express from 'express';
import { chromium } from 'playwright';

const app = express();
const PORT = process.env.PORT || 10000;

// Endpoint de teste simples
app.get('/', (req, res) => {
  res.json({ message: 'credaluga-login-api alive' });
});

// Endpoint de login com Playwright
app.get('/login-test', async (req, res) => {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    // 1️⃣ Navega para a página de login
    await page.goto('https://app.credaluga.com.br/login', { waitUntil: 'networkidle' });

    // 2️⃣ Pega o CSRF token do input escondido
    const csrfToken = await page.$eval('input[name="csrfToken"]', el => el.value);

    // 3️⃣ Preenche login
    await page.fill('input[name="email"]', 'caroline@amppliataimoveis.com.br');
    await page.fill('input[name="password"]', 'Carol@123');

    // 4️⃣ Submete o formulário e espera navegação
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle' }),
    ]);

    // 5️⃣ Captura cookies
    const cookies = await context.cookies();

    // 6️⃣ Retorna resultado
    res.json({ csrfToken, cookies });

  } catch (err) {
    console.error('Playwright failed:', err);
    res.status(500).json({ error: 'Playwright failed', details: err.message });
  } finally {
    if (browser) await browser.close();
  }
});

// Inicializa servidor
app.listen(PORT, () => {
  console.log(`✅ Server listening on port ${PORT}`);
});
