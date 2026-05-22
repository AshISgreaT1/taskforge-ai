FROM node:22

WORKDIR /app

COPY package*.json ./

RUN npm install
RUN chmod -R 755 node_modules/.bin

COPY . .

RUN npm run build

EXPOSE 8080

CMD ["npx", "serve", "-s", "dist", "-l", "8080"]