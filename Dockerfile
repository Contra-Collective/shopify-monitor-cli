FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY src ./src

# Build TypeScript
RUN npm run build

# Create volume mount point for state file
VOLUME ["/app/data"]

# Set default environment variables
ENV STATE_FILE_PATH=/app/data/shopify-monitor-state.json
ENV CHECK_INTERVAL=15

# Default command (can be overridden)
CMD ["node", "dist/cli.js", "watch", "--config", "/app/config/shopify-monitor.config.js"]
