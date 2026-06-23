# Use lightweight alpine Node LTS image
FROM node:20-alpine

# Create and set working directory
WORKDIR /app

# Copy package configuration
COPY package*.json ./

# Install dependencies (production-only for lighter image size)
RUN npm install --omit=dev

# Copy all remaining source files
COPY . .

# Expose the API server port (handled by Express dynamically via PORT env variable)
EXPOSE 3000

# Define start command
CMD ["npm", "start"]
