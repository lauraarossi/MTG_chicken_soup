FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

ARG BACKEND_URL
ENV BACKEND_URL=$BACKEND_URL

EXPOSE 3000

RUN npm run build

CMD ["sh", "-c", "npm start -- -p ${PORT:-3000}"]
