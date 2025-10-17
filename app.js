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
  const successUrlPart = '/imobiliaria'; // Parte da URL após o login bem-sucedido

  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios nas variáveis de ambiente.' });
  }

  let browser;
  try {
    // 1. Inicializa o contexto do navegador
    browser = await chromium.launch({ headless: true });
    // Usar o context e o user-agent de um desktop real para evitar detecção
    const context = await browser.newContext(devices['Desktop Chrome']);
    const page = await context.newPage();

    console.log(`Iniciando navegação para: ${loginUrl}`);

    // 2. Navega para a página de login e espera que toda a rede acalme (networkidle)
    // Isso garante que o token CSRF no DOM esteja carregado.
    await page.goto(loginUrl, { waitUntil: 'networkidle', timeout: 60000 }); // Aumenta timeout para 60s

    // 3. Tenta encontrar e extrair o CSRF token do campo escondido no DOM
    const csrfToken = await page.$eval('input[name="csrfToken"]', el => el.value)
      .catch(() => {
        // Se não encontrar o token no DOM, retorna null
        console.log('CSRF Token não encontrado no DOM. Prosseguindo sem injeção.');
        return null;
      });
    
    // 4. Preenche os campos de login
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);

    // Opcional: Injeta o token apenas se ele foi encontrado
    // O Playwright (geralmente) lida com o token automaticamente no submit, 
    // mas deixamos a lógica de injeção direta caso o formulário não o capture.
    if (csrfToken) {
        // Esta etapa de injeção é mais complexa e muitas vezes desnecessária
        // se o Playwright estiver clicando no botão do formulário. Vamos confiar no clique.
        console.log(`CSRF Token [${csrfToken.substring(0, 8)}...] pronto para submit.`);
    }

    console.log('Preenchendo credenciais e clicando em Entrar...');

    // 5. Clica no botão de submit e espera a navegação para a URL de sucesso
    // Usamos um seletor textual para maior robustez
    await Promise.all([
        page.getByRole('button', { name: 'Entrar' }).click(), // Tenta clicar em um botão com o texto "Entrar"
        page.waitForURL(`**/*${successUrlPart}**`, { timeout: 30000 }), // Espera a URL de sucesso por 30s
    ]);

    // 6. Verifica a URL final para garantir que o login foi bem-sucedido
    const currentUrl = page.url();
    if (!currentUrl.includes(successUrlPart)) {
      console.log('Login falhou. URL final inesperada:', currentUrl);
      return res.status(401).json({ error: 'Falha na autenticação. Credenciais inválidas ou o site não navegou para o painel.' });
    }
    
    // 7. Captura os cookies de sessão e retorna
    console.log('Login bem-sucedido! Capturando cookies...');
    const cookies = await context.cookies();
    
    res.status(200).json({ 
        message: 'Login realizado com sucesso!',
        cookies: cookies
    });

  } catch (err) {
    console.error('Playwright falhou:', err);
    // Retorna 401 se for um erro relacionado a credenciais ou timeout de navegação
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
