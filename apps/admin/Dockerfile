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
# React router fallback plus same-origin API proxy. This keeps bearer tokens and
# browser requests on the admin origin; the service name resolves in Compose.
RUN echo 'server { listen 80; location /api/ { proxy_pass http://api:3002; proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr; } location / { root /usr/share/nginx/html; index index.html; try_files $uri $uri/ /index.html; } }' > /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
