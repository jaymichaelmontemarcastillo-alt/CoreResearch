# Use an official Node runtime as a parent image, based on Debian Bullseye
FROM node:18-bullseye-slim

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080
ENV USE_LIBREOFFICE_IMPORT=true

# Install LibreOffice, Java (required for some LibreOffice filters), and fonts
RUN apt-get update && apt-get install -y --no-install-recommends \
    libreoffice \
    default-jre \
    fonts-liberation \
    fonts-dejavu \
    fonts-noto \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 8080

# Command to run the application
CMD ["node", "index.js"]
