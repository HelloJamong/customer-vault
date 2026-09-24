# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Build-time API base (default to relative path)
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# App version (GitHub Release 태그 주입, 예: v2.4.0)
ARG VITE_APP_VERSION=dev
ENV VITE_APP_VERSION=${VITE_APP_VERSION}

# 의존성 설치
COPY package*.json .npmrc ./
RUN npm ci

# 소스 복사 및 빌드
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

# IPv6 listen 자동 설정 스크립트는 apk로 패키지 저장소 조회를 시도해 폐쇄망에서 기동이 약 2분 지연된다.
# default.conf를 커스텀 설정으로 교체하므로 이 스크립트는 항상 변경 없이 종료된다 → 제거해도 동작 차이 없음.
RUN rm -f /docker-entrypoint.d/10-listen-on-ipv6-by-default.sh

# 빌드 결과물 복사
COPY --from=builder /app/dist /usr/share/nginx/html

# Nginx 설정 복사
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 포트 노출
EXPOSE 80

# Nginx 실행
CMD ["nginx", "-g", "daemon off;"]
