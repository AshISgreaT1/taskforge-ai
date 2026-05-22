FROM node:22

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN chmod +x node_modules/.bin/vite

RUN npm run build

EXPOSE 8080

CMD ["npm", "start"]