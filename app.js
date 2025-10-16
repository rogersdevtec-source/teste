import express from 'express';
import { chromium, devices } from 'playwright'; // NOVO: importar 'devices'
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'credaluga-login-api alive' });
});

// NOVO: Função de pausa para simular comportamento humano
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

app.post('/login', async (req, res) => {
  const email = process.env.LOGIN_EMAIL;
  const password = process.env.LOGIN_PASSWORD;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required on the server.' });
  }

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    
    // NOVO: Usar o contexto de um dispositivo real para se disfarçar
    const context = await browser.newContext(devices['Desktop Chrome']);
    const page = await context.newPage();

    await page.goto('https://app.credaluga.com.br/login', { waitUntil: 'networkidle' });
    
    // NOVO: Esperar o seletor do e-mail aparecer antes de interagir
    await page.waitForSelector('input[name="email"]');
    await delay(500); // Pausa de meio segundo

    await page.fill('input[name="email"]', email);
    await delay(500); // Pausa de meio segundo

    await page.fill('input[name="password"]', password);
    await delay(1000); // Pausa de 1 segundo

    await Promise.all([
        page.click('button[type="submit"]'),
        page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }), // Aumentar timeout para 30s
    ]);

    const currentUrl = page.url();
    if (!currentUrl.includes('/imobiliaria')) {
      // Se o login falhar, vamos tentar tirar um screenshot para debug (opcional)
      // await page.screenshot({ path: 'debug_login_failed.png' });
      return res.status(401).json({ error: 'Authentication failed. Invalid credentials.' });
    }
    
    const cookies = await context.cookies();
    
    res.status(200).json({ 
        message: 'Login successful!',
        cookies 
    });

  } catch (err) {
    console.error('Playwright failed:', err);
    res.status(500).json({ error: 'An internal error occurred during the login process.', details: err.message });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server listening on port ${PORT}`);
});
