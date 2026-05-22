FROM node:22

WORKDIR /app

COPY package*.json ./

RUN npm install
RUN chmod -R +x node_modules/.bin

COPY . .

RUN npx vite build

EXPOSE 8080

CMD ["npx", "serve", "-s", "dist", "-l", "8080"]