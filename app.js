import express from 'express';
import { chromium, devices } from 'playwright';
import 'dotenv/config'; // Configura o dotenv automaticamente

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'credaluga-login-api alive' });
});

app.post('/login', async (req, res) => {
  const email = process.env.LOGIN_EMAIL;
  const password = process.env.LOGIN_PASSWORD;
  const loginUrl = 'https://app.credaluga.com.br/login';

  // CORREÇÃO CRÍTICA: A URL final de sucesso no site é /dashboard, não /imobiliaria
  const successUrlPart = '/dashboard'; 
  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios nas variáveis de ambiente.' });
  }

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext(devices['Desktop Chrome']);
    const page = await context.newPage();

    console.log(`Iniciando navegação para: ${loginUrl}`);

    // 1. Navega e espera o carregamento completo (60s de timeout para o carregamento inicial)
    await page.goto(loginUrl, { waitUntil: 'networkidle', timeout: 60000 }); 

    // 2. Tenta encontrar o CSRF token do campo escondido no DOM (Método de alta estabilidade)
    const csrfToken = await page.$eval('input[name="csrfToken"]', el => el.value)
      .catch(() => {
        console.log('CSRF Token não encontrado no DOM. Prosseguindo sem injeção.');
        return null;
      });
    
    // 3. Preenche os campos de login
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);

    console.log('Preenchendo credenciais e clicando em Entrar...');

    // 4. Clica no botão de submit e espera a navegação para a URL de sucesso
    // O Playwright vai esperar que o navegador navegue para qualquer URL que contenha '/dashboard'
    await Promise.all([
        page.getByRole('button', { name: 'Entrar' }).click(), 
        page.waitForURL(`**/*${successUrlPart}**`, { timeout: 30000, waitUntil: 'domcontentloaded' }), // CORREÇÃO AQUI
    ]);

    // 5. Verifica a URL final
    const currentUrl = page.url();
    if (!currentUrl.includes(successUrlPart)) {
      console.log('Login falhou. URL final inesperada:', currentUrl);
      return res.status(401).json({ error: 'Falha na autenticação. Credenciais inválidas ou o site não navegou para o painel.' });
    }
    
    // 6. Captura os cookies de sessão e retorna
    console.log('Login bem-sucedido! Capturando cookies...');
    const cookies = await context.cookies();
    
    res.status(200).json({ 
        message: 'Login realizado com sucesso!',
        cookies: cookies
    });

  } catch (err) {
    console.error('Playwright falhou:', err);
    
    // Trata erros de timeout na URL de sucesso como falha de autenticação
    if (err.message.includes('waitForURL') || err.message.includes('Entrar')) {
        return res.status(401).json({ error: 'Falha na Autenticação ou Timeout na Navegação.', details: err.message });
    }

    res.status(500).json({ error: 'Ocorreu um erro interno durante o processo de login.', details: err.message });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server listening on port ${PORT}`);
});
