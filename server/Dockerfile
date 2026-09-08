# 빌드 스테이지
# 서버(OCI)에 설치된 Node 버전(v24)에 맞춤 — 로컬 dev와 배포 런타임 버전을 통일
FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# 런타임 스테이지 (OCI VM에서 Docker로 실행)
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/main"]
