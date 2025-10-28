# Base image Node.js kecil, cukup buat jalanin server.js
FROM node:20-alpine

# Set workdir di dalam container
WORKDIR /app

# Copy file dependensi dulu biar layer cache efisien
COPY package*.json ./

# Install dependencies untuk production saja
RUN npm install --production

# Copy seluruh source code (models, routes, server.js, public/, dll)
COPY . .

# Set environment default di dalam container
ENV PORT=5000

# Expose port aplikasi
EXPOSE 5000

# Jalankan server
CMD ["node", "server.js"]
