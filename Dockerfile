FROM node:22-alpine
WORKDIR /app
COPY server.js .
COPY public ./public
EXPOSE 8787
CMD ["node", "server.js"]
