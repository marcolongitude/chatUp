# Stage 1: Build NestJS
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Final Image
FROM node:20-alpine
WORKDIR /app

# Instalar dependências para o Electric (Erlang/OTP runtime se necessário ou binário)
# No caso do Electric 1.x, ele é servido como uma imagem, mas podemos usar um script 
# que orquestra os dois ou rodar o backend apontando para o binário.
# Para manter a simplicidade solicitada, vamos usar um script de entrada.

RUN apk add --no-cache curl bash

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/scripts ./scripts

# Expor portas do NestJS (3000) e Electric (5133)
EXPOSE 3000 5133

# Variáveis de ambiente padrão
ENV NODE_ENV=production
ENV PORT=3000

CMD ["sh", "-c", "npm run start:prod"]
