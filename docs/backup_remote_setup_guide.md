# 원격 백업(SFTP) 설정 가이드

이 문서는 고객창고(Customer Vault) 애플리케이션의 원격 SFTP 백업 기능을 사용하기 위해
**운영 서버**와 **원격 백업 서버** 양쪽에서 필요한 설정을 설명합니다.

---

## 구성 개요

```
[운영 서버]                         [원격 백업 서버]
 Docker 컨테이너 (backend)
 /app/backups/
   db-backup/db_YYYY-MM-DD_*.sql.gz  →  SFTP 전송  →  /home/backup/customer-vault/db-backup/
   doc-backup/docs_YYYY-MM-DD_*.tar.gz →  SFTP 전송  →  /home/backup/customer-vault/doc-backup/
```

- 백업은 **운영 서버의 backend 컨테이너**에서 실행됩니다.
- 백업 파일을 생성한 후 SFTP 프로토콜을 통해 원격 서버로 전송합니다.
- 인증 방식은 **계정+패스워드** 또는 **SSH 키** 중 선택합니다.

---

## 1. 원격 백업 서버 설정

### 1-1. 전용 백업 계정 생성

원격 서버에 백업 전용 계정을 생성합니다.

```bash
# 백업 전용 계정 생성 (로그인 쉘 없이 SFTP 전용)
sudo useradd -m -s /bin/bash backupuser

# 패스워드 설정 (패스워드 인증 방식 사용 시)
sudo passwd backupuser
```

### 1-2. 백업 디렉토리 생성

```bash
# 백업 루트 경로 생성 (경로는 자유롭게 지정 가능)
sudo mkdir -p /home/backupuser/customer-vault/db-backup
sudo mkdir -p /home/backupuser/customer-vault/doc-backup

# 소유권 및 권한 설정
sudo chown -R backupuser:backupuser /home/backupuser/customer-vault
sudo chmod -R 750 /home/backupuser/customer-vault
```

> **참고**: 애플리케이션이 `db-backup/`, `doc-backup/` 하위 폴더를 자동으로 생성하므로,
> 루트 경로(`customer-vault/`)만 만들어두어도 됩니다.

### 1-3. SFTP 서비스 확인

원격 서버에 SSH/SFTP 서비스가 실행 중인지 확인합니다.

```bash
# SSH 서비스 상태 확인
sudo systemctl status sshd

# 포트 확인 (기본값: 22)
sudo ss -tlnp | grep sshd
```

#### `/etc/ssh/sshd_config` 주요 설정 확인

```
# SFTP 서브시스템 활성화 여부 확인 (기본으로 활성화되어 있음)
Subsystem sftp /usr/lib/openssh/sftp-server

# 패스워드 인증 허용 여부 (패스워드 방식 사용 시)
PasswordAuthentication yes
```

설정 변경 후 SSH 재시작:

```bash
sudo systemctl restart sshd
```

### 1-4. 방화벽 설정

운영 서버의 IP에서 SSH 포트(기본 22)로의 접근을 허용합니다.

```bash
# UFW 사용 시
sudo ufw allow from <운영서버_IP> to any port 22

# firewalld 사용 시 (CentOS/RHEL 계열)
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="<운영서버_IP>" port port="22" protocol="tcp" accept'
sudo firewall-cmd --reload
```

---

## 2. SSH 키 인증 방식 설정 (권장)

패스워드보다 보안이 강한 SSH 키 방식을 권장합니다.

### 2-1. 운영 서버에서 SSH 키 생성

SSH 키는 **backend 컨테이너 내부**에서 접근 가능한 경로에 생성해야 합니다.
컨테이너와 호스트 간에 공유되는 볼륨 경로를 활용합니다.

```bash
# 호스트 서버에서 키 생성 (backups 볼륨 내 .ssh 폴더 활용)
mkdir -p /home/dev/project/customer-vault/backups/.ssh
ssh-keygen -t ed25519 -f /home/dev/project/customer-vault/backups/.ssh/backup_key -N "" -C "customer-vault-backup"
```

생성 결과:
- 개인키: `./backups/.ssh/backup_key` → 컨테이너 내부 `/app/backups/.ssh/backup_key`
- 공개키: `./backups/.ssh/backup_key.pub`

### 2-2. 공개키를 원격 서버에 등록

```bash
# 원격 서버에서 실행
sudo -u backupuser mkdir -p /home/backupuser/.ssh
sudo -u backupuser chmod 700 /home/backupuser/.ssh

# 공개키 내용을 authorized_keys에 추가
# (운영 서버에서 backup_key.pub 내용을 복사하여 붙여넣기)
sudo -u backupuser nano /home/backupuser/.ssh/authorized_keys
sudo -u backupuser chmod 600 /home/backupuser/.ssh/authorized_keys
```

또는 `ssh-copy-id` 사용:

```bash
# 운영 서버(호스트)에서 실행
ssh-copy-id -i ./backups/.ssh/backup_key.pub backupuser@<원격서버_IP>
```

### 2-3. 연결 테스트

```bash
# 운영 서버(호스트)에서 테스트
ssh -i ./backups/.ssh/backup_key -p 22 backupuser@<원격서버_IP>

# 또는 컨테이너 내부에서 테스트
docker compose exec backend ssh -i /app/backups/.ssh/backup_key -p 22 backupuser@<원격서버_IP>
```

---

## 3. 운영 서버 설정

### 3-1. `.env` 파일 설정

운영 서버의 프로젝트 루트 경로에 있는 `.env` 파일에 아래 항목을 설정합니다.

```dotenv
# SFTP 패스워드 암호화 키 (32바이트 hex, 반드시 변경)
# 생성 명령: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY=여기에_64자리_hex_문자열_입력
```

> ⚠️ `ENCRYPTION_KEY`는 SFTP 패스워드를 AES-256-CBC로 암호화하는 데 사용됩니다.
> 기본값(`000...`)을 그대로 사용하면 보안에 취약하므로 반드시 변경하세요.

### 3-2. `ENCRYPTION_KEY` 생성

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

출력된 64자리 hex 문자열을 `.env`의 `ENCRYPTION_KEY`에 입력합니다.

### 3-3. 백업 디렉토리 권한 확인

```bash
# 호스트에서 backups 디렉토리가 컨테이너에서 쓰기 가능한지 확인
ls -la /home/dev/project/customer-vault/backups/
# 필요 시 권한 조정
sudo chmod -R 755 /home/dev/project/customer-vault/backups/
```

---

## 4. 시스템 설정 화면에서 SFTP 구성

슈퍼관리자 계정으로 로그인 후 **시스템 설정 → 7. 데이터 백업** 섹션에서 설정합니다.

| 항목 | 설명 | 예시 |
|------|------|------|
| 백업 저장 경로 | **원격(SFTP)** 체크 | ✅ |
| SFTP 서버 주소 | `IP:포트` 형식 | `192.168.0.200:22` |
| 계정 | 원격 서버 백업 계정 | `backupuser` |
| 패스워드 | 계정 패스워드 (키 방식이면 입력 불필요) | `••••••••` |
| SSH 키 파일 경로 | 컨테이너 내부 개인키 경로 (키 방식 사용 시) | `/app/backups/.ssh/backup_key` |
| 원격 백업 경로 | 원격 서버의 백업 루트 경로 | `/home/backupuser/customer-vault` |

> **SSH 키 vs 패스워드**: SSH 키 파일 경로가 입력되어 있고 파일이 존재하면 키 인증을 사용하며,
> 그렇지 않으면 패스워드 인증을 사용합니다.

---

## 5. 동작 확인

### 5-1. 즉시 백업 실행

**백업 관리** 페이지에서 **즉시 백업 실행** 버튼을 클릭합니다.

### 5-2. 원격 서버에서 파일 확인

```bash
# 원격 서버에서 백업 파일 도착 확인
ls -lh /home/backupuser/customer-vault/db-backup/
ls -lh /home/backupuser/customer-vault/doc-backup/
```

정상적으로 전송되면 아래와 같은 파일이 생성됩니다:

```
/home/backupuser/customer-vault/
├── db-backup/
│   └── db_2026-02-23_11-30-00.sql.gz
└── doc-backup/
    └── docs_2026-02-23_11-30-00.tar.gz
```

### 5-3. 백업 이력 확인

**백업 관리** 페이지의 이력 테이블에서 상태(성공/실패)와 오류 메시지를 확인합니다.

---

## 6. 문제 해결

| 증상 | 원인 | 해결 방법 |
|------|------|-----------|
| `ECONNREFUSED` | 원격 서버 SSH 포트 미오픈 | 방화벽 및 sshd 상태 확인 |
| `Authentication failed` | 계정/패스워드 또는 키 오류 | 자격증명 재확인, 공개키 등록 여부 확인 |
| `No such file` (SSH 키) | 키 파일 경로 오류 | 컨테이너 내부 경로(`/app/backups/.ssh/...`) 확인 |
| `Permission denied` (디렉토리) | 원격 경로 권한 부족 | `chown`/`chmod` 재설정 |
| `ENCRYPTION_KEY` 오류 | 키 변경 후 기존 암호화 패스워드 불일치 | 시스템 설정에서 패스워드 재입력 후 저장 |

> ⚠️ `ENCRYPTION_KEY`를 변경하면 기존에 저장된 SFTP 패스워드를 복호화할 수 없습니다.
> 키 변경 후에는 반드시 시스템 설정에서 SFTP 패스워드를 다시 입력하고 저장하세요.

---

## 7. 보안 권장 사항

- SSH 키 인증 방식을 우선 사용하고, 패스워드 인증은 보조 수단으로만 활용하세요.
- 원격 서버의 백업 계정은 백업 디렉토리에만 쓰기 권한을 부여하고, 다른 경로 접근을 제한하세요.
- SFTP 전용 chroot 환경을 구성하면 보안을 더욱 강화할 수 있습니다 (`/etc/ssh/sshd_config`의 `ChrootDirectory` 옵션).
- `ENCRYPTION_KEY`는 `.env` 파일로만 관리하고, 별도의 안전한 장소에 백업해두세요.
- 운영 서버와 원격 서버 간의 네트워크는 사설망(VPN 또는 전용선)을 통해 연결하는 것을 권장합니다.
