# Use Node.js 20 LTS (Recommended for modern dependencies)
FROM node:20-slim

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./

RUN npm install --omit=dev --legacy-peer-deps

# Bundle app source
COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 3001

# Command to run the application
CMD [ "npm", "start" ]
