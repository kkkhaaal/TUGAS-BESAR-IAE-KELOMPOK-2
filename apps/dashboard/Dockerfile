# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Copy application files
COPY App.jsx ./
COPY src/ ./src/
COPY components/ ./components/
COPY index.css ./
COPY index.html ./
COPY vite.config.js ./
COPY tailwind.config.js ./
COPY postcss.config.js ./

# Build the React app
RUN npm run build

# Production stage - Nginx server
FROM nginx:alpine

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built app from builder
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
