FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY turbo.json ./
COPY apps/admin/package.json ./apps/admin/
COPY packages/database/package.json ./packages/database/
RUN npm ci
COPY . .
RUN npm run build --workspace=@lorrycarry/admin

FROM nginx:alpine
COPY --from=builder /app/apps/admin/dist /usr/share/nginx/html
# React router fallback configuration
RUN echo 'server { listen 80; location / { root /usr/share/nginx/html; index index.html; try_files $uri $uri/ /index.html; } }' > /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
