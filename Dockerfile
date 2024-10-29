# Etapa 1: Build da aplicação
FROM node:18-alpine AS base

RUN npm i -g pnpm

# Definir o diretório de trabalho

FROM base AS dependencies

WORKDIR /app

# Copiar os arquivos package.json e package-lock.json para instalar as dependências
COPY package*.json pnpm-lock.yaml ./

# Instalar dependências necessárias para o build
RUN pnpm install

FROM base AS build

WORKDIR /app

# Copiar o restante do código da aplicação
COPY . .
COPY --from=dependencies /app/node_modules ./node_modules

# Compilar o TypeScript para JavaScript
RUN pnpm run build

# Etapa 2: Configuração de produção
FROM node:18-alpine AS production

# Definir o diretório de trabalho
WORKDIR /app

RUN npm i -g pnpm

# Copiar apenas as dependências de produção
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/.migrations ./.migrations

# Copiar os arquivos compilados da aplicação
COPY --from=build /app/dist ./dist

# Expor a porta da aplicação
EXPOSE 3002

# Comando para iniciar a aplicação
CMD ["pnpm", "start"]