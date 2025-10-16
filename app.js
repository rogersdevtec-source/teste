const express = require('express');
const { chromium } = require('playwright');

const EMAIL = process.env.LOGIN_EMAIL || 'caroline@amppliataimoveis.com.br';
const PASSWORD = process.env.LOGIN_PASSWORD || 'Carol@123';
const LOGIN_PAGE = 'https://app.credaluga.com.br/api/auth/signin/credentials'; // usa rota de signin
const CALLBACK_WAIT_URL = 'https://app.credaluga.com.br/'; // onde espera que caia pós-login

const app = express();
const port = process.env.PORT || 3000;

app.get('/tokens', async (req, res) => {
  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    // ir para a página de signin que rendeform com CSRF
    await page.goto(LOGIN_PAGE, { waitUntil: 'domcontentloaded', timeout: 15000 });

    // aguardar inputs e preencher
    await page.waitForSelector('input[name="email"]', { timeout: 7000 });
    await page.fill('input[name="email"]', EMAIL);
    await page.fill('input[name="password"]', PASSWORD);

    // submeter e aguardar navegação/requests
    await Promise.all([
      page.click('button[type="submit"], form button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle', timeout: 10000 }).catch(() => null)
    ]);

    // dar pequeno delay para cookies acertarem
    await page.waitForTimeout(500);

    const cookies = await context.cookies();
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    const sessionCookie = cookies.find(c => c.name.includes('session') || c.name.includes('next-auth'));

    // pegar csrfToken atual da página (se existir)
    let csrfToken = null;
    try {
      csrfToken = await page.$eval('input[name="csrfToken"]', el => el.value);
    } catch (e) {
      // ignore se não achou
    }

    await browser.close();

    if (!sessionCookie) {
      return res.status(500).json({ error: 'session cookie not found', cookies, csrfToken });
    }

    return res.json({
      cookieHeader,
      sessionCookie: `${sessionCookie.name}=${sessionCookie.value}`,
      csrfToken
    });
  } catch (err) {
    if (browser) try { await browser.close(); } catch(e){/*ignore*/ }
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => res.send('credaluga-login-api alive'));
app.listen(port, () => console.log(`Server listening on ${port}`));
