FROM node:20-slim

RUN apt-get update && apt-get install -y ffmpeg

WORKDIR /usr/src/app

COPY package*.json ./
COPY package-lock.json ./

RUN npm install

COPY . .
EXPOSE 3000

CMD ["npm","start"]
