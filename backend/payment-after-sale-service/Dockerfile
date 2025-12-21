# Payment & After-Sale Service Dockerfile
# Placeholder - Update when implementation is ready

FROM node:18-alpine
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose port
EXPOSE 5006

# Start service
CMD ["npm", "start"]
