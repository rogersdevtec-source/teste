import express from 'express';
import { execSync } from 'child_process';
import playwright from 'playwright';

//
// 🔧 Instala o Chromium automaticamente ao iniciar o container Render
//
try {
  console.log('🧩 Verificando instalação do Playwright...');
  execSync('npx playwright install chromium', { stdio: 'inherit' });
  console.log('✅ Chromium instalado com sucesso.');
} catch (e) {
  console.error('❌ Falha ao instalar Chromium:', e);
}

//
// 🚀 Inicializa o servidor Express
//
const app = express();
const port = process.env.PORT || 10000;

app.get('/', (req, res) => {
  res.json({ message: 'credaluga-login-api alive' });
});

//
// 🔍 Endpoint de teste com Playwright
//
app.get('/test', async (req, res) => {
  try {
    const browser = await playwright.chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto('https://example.com');
    const title = await page.title();
    await browser.close();

    res.json({ ok: true, title });
  } catch (err) {
    console.error('Erro Playwright:', err);
    res.status(500).json({ error: 'Playwright failed', details: err.message });
  }
});

//
// 🖥️ Inicia o servidor
//
app.listen(port, () => {
  console.log(`✅ Server listening on port ${port}`);
});
