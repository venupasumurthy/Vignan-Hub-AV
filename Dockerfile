# Stage 1: Build the application
FROM node:20-alpine as build

WORKDIR /app

# Copy package files
COPY package.json ./
# Note: package-lock.json might not exist, so we copy it optionally or just install
# COPY package-lock.json ./ 

# Install dependencies (ignoring scripts to avoid potential post-install failures from removed plugins)
RUN npm install --ignore-scripts

# Copy source code
COPY . .

# Build the app
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy built assets from builder stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
