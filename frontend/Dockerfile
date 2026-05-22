FROM node:22

WORKDIR /app

COPY package*.json ./

RUN npm install --include=dev

COPY . .

RUN chmod -R 755 node_modules/.bin

RUN ./node_modules/.bin/vite build

EXPOSE 8080

CMD ["npx","serve","-s","dist","-l","8080"]