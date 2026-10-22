# 빌드 스테이지
# 서버(OCI)에 설치된 Node 버전(v24)에 맞춤 — 로컬 dev와 배포 런타임 버전을 통일.
# node:24-alpine은 패치 버전까지 고정 안 한 플로팅 태그라, 매 빌드마다 그 시점의
# 최신 24.x 패치를 자동으로 받음 — 예: 2026-10-21 Node 보안 릴리즈(브로틀리 디코더
# OOB write RCE, TLS 인증서 호스트명 검증 우회 등 HIGH 4건 포함 CVE 10건, 22.23.4/
# 24.22.1/26.12.1로 패치)도 이 재빌드로 자동 반영됨 — Dockerfile 자체는 안 바뀌어도
# 이미지 재빌드 자체가 필요해서 이 주석으로 재배포를 트리거함
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
EXPOSE 3030
CMD ["node", "dist/main"]
