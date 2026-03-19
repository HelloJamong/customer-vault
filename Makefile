.PHONY: help build push dev prod up down logs clean restart update

# 변수 설정
DOCKER_USERNAME ?= hellojamong
IMAGE_NAME = customer-storage
VERSION ?= latest
FULL_IMAGE = $(DOCKER_USERNAME)/$(IMAGE_NAME):$(VERSION)

help: ## 사용 가능한 명령어 목록 표시
	@echo "Customer Storage - 개발자용 명령어"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

build: ## Docker 이미지 빌드
	@echo "🔨 Docker 이미지 빌드 중..."
	docker build -t $(IMAGE_NAME):$(VERSION) .
	docker tag $(IMAGE_NAME):$(VERSION) $(FULL_IMAGE)
	@echo "✓ 빌드 완료: $(FULL_IMAGE)"

push: ## Docker Hub에 이미지 푸시
	@echo "📤 Docker Hub에 이미지 푸시 중..."
	docker push $(FULL_IMAGE)
	@echo "✓ 푸시 완료: $(FULL_IMAGE)"

build-push: build push ## 빌드 후 즉시 푸시

tag: ## 새 버전 태그 생성 (예: make tag VERSION=26.03.01)
	@if [ -z "$(VERSION)" ] || [ "$(VERSION)" = "latest" ]; then \
		echo "❌ VERSION을 지정해주세요. 예: make tag VERSION=26.03.01"; \
		exit 1; \
	fi
	@echo "🏷️  버전 태그 생성: v$(VERSION)"
	git tag -a v$(VERSION) -m "Release version $(VERSION)"
	git push origin v$(VERSION)
	@echo "✓ 태그 푸시 완료. GitHub Actions가 자동으로 이미지를 빌드합니다."

dev: ## 개발 환경 시작 (로컬 빌드)
	@echo "🚀 개발 환경 시작 중..."
	docker compose up -d --build
	@echo "✓ 개발 환경 시작 완료"
	@echo "접속: http://localhost:5001"

prod: ## 프로덕션 환경 시작 (Docker Hub 이미지 사용)
	@echo "🚀 프로덕션 환경 시작 중..."
	docker compose -f docker-compose.prod.yml up -d
	@echo "✓ 프로덕션 환경 시작 완료"
	@echo "접속: http://localhost:5001"

up: dev ## 개발 환경 시작 (별칭)

down: ## 컨테이너 중지 및 제거
	@echo "🛑 컨테이너 중지 중..."
	docker compose down
	@echo "✓ 중지 완료"

logs: ## 실시간 로그 확인
	docker compose logs -f

logs-web: ## 웹 서버 로그만 확인
	docker compose logs -f web

logs-db: ## 데이터베이스 로그만 확인
	docker compose logs -f db

restart: ## 컨테이너 재시작
	@echo "🔄 컨테이너 재시작 중..."
	docker compose restart
	@echo "✓ 재시작 완료"

update: ## 최신 이미지로 업데이트 (프로덕션)
	@echo "⬆️  최신 이미지 다운로드 중..."
	docker compose -f docker-compose.prod.yml pull
	docker compose -f docker-compose.prod.yml up -d
	@echo "✓ 업데이트 완료"

clean: ## 컨테이너, 이미지, 볼륨 모두 제거 (주의!)
	@echo "⚠️  모든 데이터가 삭제됩니다!"
	@read -p "정말로 계속하시겠습니까? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker compose down -v; \
		docker rmi $(IMAGE_NAME):$(VERSION) 2>/dev/null || true; \
		echo "✓ 정리 완료"; \
	else \
		echo "취소됨"; \
	fi

ps: ## 실행 중인 컨테이너 확인
	docker compose ps

shell-web: ## 웹 컨테이너 쉘 접속
	docker compose exec web /bin/bash

shell-db: ## 데이터베이스 컨테이너 쉘 접속
	docker compose exec db /bin/bash

db-backup: ## 데이터베이스 백업
	@echo "💾 데이터베이스 백업 중..."
	@mkdir -p backups
	@TIMESTAMP=$$(date +%Y%m%d_%H%M%S); \
	docker compose exec -T db mysqldump -u root -p$${DB_ROOT_PASSWORD} customer_db > backups/backup_$${TIMESTAMP}.sql
	@echo "✓ 백업 완료: backups/backup_$${TIMESTAMP}.sql"

db-restore: ## 데이터베이스 복원 (예: make db-restore FILE=backups/backup.sql)
	@if [ -z "$(FILE)" ]; then \
		echo "❌ 복원할 파일을 지정해주세요. 예: make db-restore FILE=backups/backup.sql"; \
		exit 1; \
	fi
	@echo "📥 데이터베이스 복원 중..."
	docker compose exec -T db mysql -u root -p$${DB_ROOT_PASSWORD} customer_db < $(FILE)
	@echo "✓ 복원 완료"

test: ## 테스트 실행 (향후 구현)
	@echo "테스트 기능은 아직 구현되지 않았습니다."

lint: ## 코드 린팅 (향후 구현)
	@echo "린팅 기능은 아직 구현되지 않았습니다."

install-dev: ## 개발 환경 설정
	@echo "🔧 개발 환경 설정 중..."
	pip install -r requirements.txt
	@echo "✓ 개발 환경 설정 완료"

# 개발자 워크플로우
release: ## 새 버전 릴리즈 (예: make release VERSION=26.03.01)
	@if [ -z "$(VERSION)" ] || [ "$(VERSION)" = "latest" ]; then \
		echo "❌ VERSION을 지정해주세요. 예: make release VERSION=26.03.01"; \
		exit 1; \
	fi
	@echo "🚀 버전 $(VERSION) 릴리즈 준비..."
	@echo "1. 현재 변경사항 커밋 확인..."
	git status
	@read -p "변경사항을 커밋하셨습니까? [y/N] " -n 1 -r; \
	echo; \
	if [[ ! $$REPLY =~ ^[Yy]$$ ]]; then \
		echo "먼저 변경사항을 커밋해주세요."; \
		exit 1; \
	fi
	@echo "2. 태그 생성 및 푸시..."
	git tag -a v$(VERSION) -m "Release version $(VERSION)"
	git push origin main
	git push origin v$(VERSION)
	@echo "✓ 릴리즈 완료! GitHub Actions가 자동으로 Docker 이미지를 빌드합니다."
	@echo "진행 상황 확인: https://github.com/YOUR_USERNAME/customer-storage/actions"
