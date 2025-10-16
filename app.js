import express from 'express';
import { chromium, devices } from 'playwright';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'credaluga-login-api alive' });
});

// Função de pausa para simular comportamento humano
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
    const context = await browser.newContext(devices['Desktop Chrome']);
    const page = await context.newPage();

    // 1️⃣ Navega para a página de login
    await page.goto('https://app.credaluga.com.br/login');
    
    // 2️⃣ Espera pela resposta da API que nos dá o token CSRF real
    console.log('Waiting for CSRF token response...');
    const csrfResponse = await page.waitForResponse('**/api/auth/csrf');
    const csrfJson = await csrfResponse.json();
    const csrfToken = csrfJson.csrfToken;
    console.log(`CSRF Token captured successfully.`);

    // 3️⃣ Injeta o token CSRF válido no campo escondido da página
    await page.evaluate((token) => {
      const csrfInput = document.querySelector('input[name="csrfToken"]');
      if (csrfInput) {
        csrfInput.value = token;
      }
    }, csrfToken);

    // 4️⃣ Preenche o formulário de login
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await delay(500);

    // 5️⃣ Submete o formulário e espera a navegação
    await Promise.all([
        page.click('button[type="submit"]'),
        page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }),
    ]);

    // 6️⃣ Verifica se o login foi bem-sucedido checando a URL final
    const currentUrl = page.url();
    if (!currentUrl.includes('/imobiliaria')) {
      console.log('Login failed. Final URL:', currentUrl);
      return res.status(401).json({ error: 'Authentication failed. Invalid credentials or bot detection.' });
    }
    
    // 7️⃣ Se o login deu certo, captura os cookies e retorna o sucesso
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
