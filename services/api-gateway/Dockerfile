FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/types/package.json ./packages/types/
COPY packages/shared/package.json ./packages/shared/
COPY services/api-gateway/package.json ./services/api-gateway/

# Install dependencies
RUN npm install

# Copy source code
COPY packages/ ./packages/
COPY services/api-gateway/ ./services/api-gateway/

# Build shared packages
RUN npm run build --workspace=@ideaforge/types
RUN npm run build --workspace=@ideaforge/shared

# Build API Gateway
WORKDIR /app/services/api-gateway
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]