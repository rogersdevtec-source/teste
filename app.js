import express from 'express';
import { chromium } from 'playwright';
import dotenv from 'dotenv';

// Carrega as variáveis de ambiente do arquivo .env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware para interpretar o corpo da requisição como JSON
app.use(express.json());

// Endpoint de health check
app.get('/', (req, res) => {
  res.json({ message: 'credaluga-login-api alive' });
});

// 🚀 Endpoint de login usando POST, mais seguro e semanticamente correto
app.post('/login', async (req, res) => {
  // Pega as credenciais do corpo da requisição ou das variáveis de ambiente como fallback
  const email = req.body.email || process.env.LOGIN_EMAIL;
  const password = req.body.password || process.env.LOGIN_PASSWORD;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    // 1️⃣ Navega para a página de login
    await page.goto('https://app.credaluga.com.br/login', { waitUntil: 'networkidle' });

    // 2️⃣ Preenche as credenciais
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);

    // 3️⃣ Submete o formulário e espera por um de dois resultados:
    //    - Sucesso: Navegação para a URL do painel.
    //    - Falha: Aparecimento de uma mensagem de erro na página.
    //    Promise.race resolve assim que uma das promises for resolvida.
    await Promise.all([
        page.click('button[type="submit"]'),
        page.waitForNavigation({ waitUntil: 'networkidle' }),
    ]);

    // 4️⃣ VERIFICA se o login foi bem-sucedido
    // Uma boa verificação é checar se a URL mudou para a página do dashboard
    const currentUrl = page.url();
    if (!currentUrl.includes('/imobiliaria')) {
      // Se não navegou para a página correta, o login falhou
      return res.status(401).json({ error: 'Authentication failed. Invalid credentials.' });
    }
    
    // 5️⃣ Captura cookies
    const cookies = await context.cookies();
    const csrfToken = await page.$eval('input[name="csrfToken"]', el => el.value).catch(() => null);

    // 6️⃣ Retorna sucesso com os dados
    res.status(200).json({ 
        message: 'Login successful!',
        csrfToken, 
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

// Inicializa servidor
app.listen(PORT, () => {
  console.log(`✅ Server listening on port ${PORT}`);
});
