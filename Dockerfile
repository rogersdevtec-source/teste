# 1. Use uma imagem oficial do Node.js que inclua ferramentas de build do Playwright
FROM mcr.microsoft.com/playwright:jammy

# 2. Defina o diretório de trabalho dentro do contêiner
WORKDIR /usr/src/app

# 3. Copie os arquivos de dependência
COPY package.json package-lock.json ./

# 4. Instale as dependências do projeto.
# A imagem base já vem com os navegadores, então o postinstall é desnecessário.
# Vamos removê-lo para acelerar o build.
RUN npm install --omit=dev && npm config set update-notifier false

# 5. Copie o restante do código da sua aplicação
COPY . .

# 6. Exponha a porta que seu app usa
EXPOSE 10000

# 7. Defina o comando para iniciar a aplicação
CMD ["node", "app.js"]
