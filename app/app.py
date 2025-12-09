import os
import re
import uuid
import shutil
import logging
from logging.handlers import RotatingFileHandler
from functools import wraps
from flask import Flask, render_template, redirect, url_for, flash, request, abort, session, jsonify, send_file
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta, date
from dateutil.relativedelta import relativedelta

app = Flask(__name__)

# 설정
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key')
app.config['SQLALCHEMY_DATABASE_URI'] = f"mysql+pymysql://{os.environ.get('DB_USER')}:{os.environ.get('DB_PASSWORD')}@{os.environ.get('DB_HOST')}/{os.environ.get('DB_NAME')}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = '/app/uploads'
app.config['MAX_CONTENT_LENGTH'] = int(os.environ.get('MAX_UPLOAD_SIZE', 16777216))

# 로깅 설정 - 운영 환경에서는 DEBUG 비활성화
if not app.debug:
    # 로그 디렉토리 생성
    if not os.path.exists('/app/logs'):
        os.makedirs('/app/logs')
    
    # 파일 핸들러 설정 (최대 10MB, 백업 10개)
    file_handler = RotatingFileHandler(
        '/app/logs/error.log',
        maxBytes=10485760,  # 10MB
        backupCount=10
    )
    file_handler.setFormatter(logging.Formatter(
        '[%(asctime)s] %(levelname)s in %(module)s: %(message)s'
    ))
    file_handler.setLevel(logging.ERROR)
    app.logger.addHandler(file_handler)
    app.logger.setLevel(logging.ERROR)
    app.logger.info('Application error logging enabled')

# 데이터베이스 초기화
db = SQLAlchemy(app)

# 로그인 매니저 초기화
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

# 세션 타임아웃 미들웨어
@app.before_request
def before_request():
    """모든 요청 전에 세션 타임아웃 체크"""
    if current_user.is_authenticated:
        if not check_session_timeout():
            user_id = current_user.id
            user_name = current_user.name
            username = current_user.username
            
            # 세션 타임아웃 로그 생성
            create_service_log(
                user_id=user_id,
                log_type='정상',
                action='로그아웃',
                description=f'{user_name}({username}) 사용자가 세션 타임아웃으로 인해 로그아웃되었습니다.',
                ip_address=request.remote_addr
            )
            
            logout_user()
            session.clear()
            flash('세션이 만료되었습니다. 다시 로그인해주세요.', 'warning')
            return redirect(url_for('login'))

        # 세션 활동 시간 업데이트 (DB)
        if 'session_id' in session:
            user_session = UserSession.query.filter_by(session_id=session['session_id']).first()
            if user_session:
                user_session.last_activity = datetime.utcnow()
                db.session.commit()

# 권한 상수
ROLE_SUPER_ADMIN = 'super_admin'
ROLE_ADMIN = 'admin'
ROLE_USER = 'user'

# 사용자-고객사 연결 테이블 (다대다 관계)
user_customers = db.Table('user_customers',
    db.Column('user_id', db.Integer, db.ForeignKey('users.id'), primary_key=True),
    db.Column('customer_id', db.Integer, db.ForeignKey('customers.id'), primary_key=True),
    db.Column('assigned_at', db.DateTime, default=datetime.utcnow)
)

# 데이터베이스 모델
class User(UserMixin, db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)  # 로그인용 계정 ID
    name = db.Column(db.String(100), nullable=False)  # 실명/표시명
    password_hash = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=True)  # 선택 사항
    role = db.Column(db.String(20), nullable=False, default=ROLE_USER)  # super_admin, admin, user
    department = db.Column(db.String(20), nullable=True)  # 기술팀, 영업팀 (일반 사용자만 해당)
    is_active = db.Column(db.Boolean, default=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'), nullable=True)  # 일반 사용자만 연결

    # 계정 잠금 관련
    is_locked = db.Column(db.Boolean, default=False)
    locked_until = db.Column(db.DateTime, nullable=True)
    failed_login_attempts = db.Column(db.Integer, default=0)

    # 최초 로그인 여부 (기본 패스워드 변경 필요)
    is_first_login = db.Column(db.Boolean, default=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    password_changed_at = db.Column(db.DateTime, default=datetime.utcnow)  # 패스워드 마지막 변경 시각
    last_login = db.Column(db.DateTime, nullable=True)  # 마지막 로그인 시각

    # 기존 단일 고객사 관계 (하위 호환성 유지)
    customer = db.relationship('Customer', backref='user', uselist=False, foreign_keys='Customer.id', primaryjoin='User.customer_id == Customer.id', viewonly=True)

    # 새로운 다대다 관계 - 담당 고객사 목록
    assigned_customers = db.relationship('Customer', secondary=user_customers, backref=db.backref('assigned_users', lazy='dynamic'), lazy='dynamic')

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
        self.password_changed_at = datetime.utcnow()  # 패스워드 변경 시 시간 업데이트
        self.is_first_login = False  # 패스워드 변경 후 최초 로그인 플래그 해제

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def is_super_admin(self):
        return self.role == ROLE_SUPER_ADMIN

    def is_admin(self):
        return self.role == ROLE_ADMIN

    def is_normal_user(self):
        return self.role == ROLE_USER

    def is_account_locked(self):
        """계정이 잠겨있는지 확인"""
        if not self.is_locked:
            return False
        if self.locked_until and datetime.utcnow() > self.locked_until:
            # 잠금 시간이 지났으면 잠금 해제
            self.is_locked = False
            self.locked_until = None
            self.failed_login_attempts = 0
            db.session.commit()
            return False
        return True

    def is_password_expired(self, settings=None):
        """패스워드가 만료되었는지 확인"""
        if not settings:
            from app import get_system_settings
            settings = get_system_settings()

        if not settings.password_expiry_enabled:
            return False

        if not self.password_changed_at:
            return True  # 변경 이력이 없으면 만료로 간주

        days_since_change = (datetime.utcnow() - self.password_changed_at).days
        return days_since_change >= settings.password_expiry_days

class Customer(db.Model):
    __tablename__ = 'customers'
    id = db.Column(db.Integer, primary_key=True)

    # 고객사 기본 정보
    name = db.Column(db.String(200), nullable=False)  # 고객사명 (회사명)
    location = db.Column(db.String(200))  # 위치

    # 고객사 담당자 정보 (정 담당자)
    contact_name = db.Column(db.String(100))  # 담당자 이름
    contact_position = db.Column(db.String(100))  # 담당자 직급
    contact_department = db.Column(db.String(100))  # 담당자 소속
    contact_mobile = db.Column(db.String(50))  # 연락처(휴대전화)
    contact_phone = db.Column(db.String(50))  # 연락처(내선)
    contact_email = db.Column(db.String(120))  # 이메일

    # 고객사 부담당자1 정보
    contact_name_sub1 = db.Column(db.String(100))  # 부담당자1 이름
    contact_position_sub1 = db.Column(db.String(100))  # 부담당자1 직급
    contact_department_sub1 = db.Column(db.String(100))  # 부담당자1 소속
    contact_mobile_sub1 = db.Column(db.String(50))  # 부담당자1 휴대전화
    contact_phone_sub1 = db.Column(db.String(50))  # 부담당자1 내선
    contact_email_sub1 = db.Column(db.String(120))  # 부담당자1 이메일

    # 고객사 부담당자2 정보
    contact_name_sub2 = db.Column(db.String(100))  # 부담당자2 이름
    contact_position_sub2 = db.Column(db.String(100))  # 부담당자2 직급
    contact_department_sub2 = db.Column(db.String(100))  # 부담당자2 소속
    contact_mobile_sub2 = db.Column(db.String(50))  # 부담당자2 휴대전화
    contact_phone_sub2 = db.Column(db.String(50))  # 부담당자2 내선
    contact_email_sub2 = db.Column(db.String(120))  # 부담당자2 이메일

    # 고객사 부담당자3 정보
    contact_name_sub3 = db.Column(db.String(100))  # 부담당자3 이름
    contact_position_sub3 = db.Column(db.String(100))  # 부담당자3 직급
    contact_department_sub3 = db.Column(db.String(100))  # 부담당자3 소속
    contact_mobile_sub3 = db.Column(db.String(50))  # 부담당자3 휴대전화
    contact_phone_sub3 = db.Column(db.String(50))  # 부담당자3 내선
    contact_email_sub3 = db.Column(db.String(120))  # 부담당자3 이메일

    # 계약 정보
    contract_type = db.Column(db.String(20), default='미계약')  # 무상, 유상, 미계약, 만료
    contract_start_date = db.Column(db.Date, nullable=True)  # 계약 시작일
    contract_end_date = db.Column(db.Date, nullable=True)  # 계약 종료일

    # 점검 정보
    inspection_cycle_type = db.Column(db.String(20), default='매월')  # 매월, 분기, 반기, 연1회, 협력사진행, 무상기간
    inspection_cycle_month = db.Column(db.Integer, nullable=True)  # 점검 주기 월 (분기: 1,2,3 / 반기: 1,2 / 연1회: 1-12)
    last_inspection_date = db.Column(db.Date, nullable=True)  # 마지막 점검일

    # 비고
    notes = db.Column(db.Text)  # 비고

    # 사내 담당자
    engineer_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)  # 담당엔지니어
    engineer_sub_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)  # 부담당엔지니어
    sales_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)  # 담당영업

    # 시스템 정보
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    documents = db.relationship('Document', backref='customer', lazy=True, cascade='all, delete-orphan')
    engineer = db.relationship('User', foreign_keys=[engineer_id], backref='customers_as_engineer')
    engineer_sub = db.relationship('User', foreign_keys=[engineer_sub_id], backref='customers_as_engineer_sub')
    sales = db.relationship('User', foreign_keys=[sales_id], backref='customers_as_sales')

    def is_inspection_needed_this_month(self):
        """이번 달 점검 대상인지 확인"""
        # 계약 상태가 만료 또는 미계약이면 점검 대상 아님
        if self.contract_type in ['만료', '미계약']:
            return False
        
        # 점검 주기가 협력사진행 또는 무상기간이면 점검 대상 아님
        if self.inspection_cycle_type in ['협력사진행', '무상기간']:
            return False
        
        from dateutil.relativedelta import relativedelta
        today = datetime.today().date()
        current_month = today.month
        current_year = today.year

        if self.inspection_cycle_type == '매월':
            return True

        if not self.inspection_cycle_month:
            return False

        if self.inspection_cycle_type == '분기':
            # 분기별: 1(1,4,7,10월), 2(2,5,8,11월), 3(3,6,9,12월)
            quarter_months = {1: [1, 4, 7, 10], 2: [2, 5, 8, 11], 3: [3, 6, 9, 12]}
            return current_month in quarter_months.get(self.inspection_cycle_month, [])

        elif self.inspection_cycle_type == '반기':
            # 반기별: 1(1,7월), 2(2,8월), 3(3,9월), 4(4,10월), 5(5,11월), 6(6,12월)
            half_year_months = {1: [1, 7], 2: [2, 8], 3: [3, 9], 4: [4, 10], 5: [5, 11], 6: [6, 12]}
            return current_month in half_year_months.get(self.inspection_cycle_month, [])

        elif self.inspection_cycle_type == '연1회':
            # 연1회: 지정된 월
            return current_month == self.inspection_cycle_month

        return False

    def is_inspection_completed_this_month(self):
        """이번 달 점검 완료 여부 확인"""
        if not self.last_inspection_date:
            return False

        today = datetime.today().date()
        current_month = today.month
        current_year = today.year

        inspection_month = self.last_inspection_date.month
        inspection_year = self.last_inspection_date.year

        return inspection_month == current_month and inspection_year == current_year

class Document(db.Model):
    __tablename__ = 'documents'
    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    filename = db.Column(db.String(255), nullable=False)
    filepath = db.Column(db.String(500), nullable=False)
    file_size = db.Column(db.Integer)
    uploaded_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)
    inspection_date = db.Column(db.Date)
    inspection_type = db.Column(db.String(20))  # '방문' 또는 '원격'

    uploader = db.relationship('User', backref='documents')

class SystemSettings(db.Model):
    __tablename__ = 'system_settings'
    id = db.Column(db.Integer, primary_key=True)

    # 기본 패스워드 설정
    default_password = db.Column(db.String(50), default='Welcome1!')

    # 패스워드 복잡성 설정
    password_min_length = db.Column(db.Integer, default=8)
    password_max_length = db.Column(db.Integer, default=20)
    password_require_uppercase = db.Column(db.Boolean, default=True)
    password_require_special = db.Column(db.Boolean, default=True)
    password_require_number = db.Column(db.Boolean, default=True)

    # 중복 로그인 설정
    prevent_duplicate_login = db.Column(db.Boolean, default=False)

    # 세션 타임아웃 설정
    session_timeout_enabled = db.Column(db.Boolean, default=False)
    session_timeout_minutes = db.Column(db.Integer, default=30)  # 3-60분

    # 로그인 실패 설정
    login_failure_limit = db.Column(db.Integer, default=5)  # 1-5회
    account_lock_minutes = db.Column(db.Integer, default=10)  # 5-30분

    # 패스워드 변경 주기 설정
    password_expiry_enabled = db.Column(db.Boolean, default=False)
    password_expiry_days = db.Column(db.Integer, default=90)  # 30-365일

    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = db.Column(db.Integer, db.ForeignKey('users.id'))

class LoginAttempt(db.Model):
    """로그인 시도 기록"""
    __tablename__ = 'login_attempts'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    attempt_time = db.Column(db.DateTime, default=datetime.utcnow)
    success = db.Column(db.Boolean, default=False)
    ip_address = db.Column(db.String(45))

class UserSession(db.Model):
    """사용자 세션 관리"""
    __tablename__ = 'user_sessions'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    session_id = db.Column(db.String(255), unique=True, nullable=False)
    login_time = db.Column(db.DateTime, default=datetime.utcnow)
    last_activity = db.Column(db.DateTime, default=datetime.utcnow)
    ip_address = db.Column(db.String(45))

class ServiceLog(db.Model):
    """서비스 로그"""
    __tablename__ = 'service_logs'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    log_type = db.Column(db.String(20), nullable=False)  # '정상', '경고', '오류', '정보'
    action = db.Column(db.String(50), nullable=False)  # '로그인', '로그아웃', '패스워드 변경' 등
    description = db.Column(db.Text)
    ip_address = db.Column(db.String(45))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    user = db.relationship('User', backref='service_logs')

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# ========== 헬퍼 함수 ==========
def get_system_settings():
    """시스템 설정 가져오기 (없으면 기본값으로 생성)"""
    settings = SystemSettings.query.first()
    if not settings:
        settings = SystemSettings()
        db.session.add(settings)
        db.session.commit()
    return settings

def get_disk_usage():
    """디스크 사용량 정보 가져오기"""
    try:
        # uploads 폴더가 있는 경로의 디스크 사용량 확인
        upload_path = app.config['UPLOAD_FOLDER']
        disk = shutil.disk_usage(upload_path)
        
        # 바이트를 GB로 변환
        total_gb = disk.total / (1024 ** 3)
        used_gb = disk.used / (1024 ** 3)
        free_gb = disk.free / (1024 ** 3)
        usage_percent = (disk.used / disk.total) * 100
        
        return {
            'total_gb': round(total_gb, 2),
            'used_gb': round(used_gb, 2),
            'free_gb': round(free_gb, 2),
            'usage_percent': round(usage_percent, 1),
            'is_warning': usage_percent >= 80
        }
    except Exception as e:
        print(f"Failed to get disk usage: {str(e)}")
        return {
            'total_gb': 0,
            'used_gb': 0,
            'free_gb': 0,
            'usage_percent': 0,
            'is_warning': False
        }

def create_service_log(user_id, log_type, action, description, ip_address=None):
    """서비스 로그 생성"""
    try:
        if ip_address is None:
            # 프록시 환경에서 실제 클라이언트 IP 가져오기
            # X-Forwarded-For, X-Real-IP 헤더 확인
            if request:
                ip_address = request.headers.get('X-Forwarded-For', 
                             request.headers.get('X-Real-IP', 
                             request.remote_addr))
                # X-Forwarded-For는 여러 IP가 쉼표로 구분될 수 있으므로 첫 번째 IP 사용
                if ip_address and ',' in ip_address:
                    ip_address = ip_address.split(',')[0].strip()
            else:
                ip_address = None
        
        log = ServiceLog(
            user_id=user_id,
            log_type=log_type,
            action=action,
            description=description,
            ip_address=ip_address
        )
        db.session.add(log)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f"Failed to create service log: {str(e)}")

def validate_password(password):
    """패스워드가 시스템 설정의 복잡성 요구사항을 충족하는지 검증"""
    settings = get_system_settings()

    # 길이 검증
    if len(password) < settings.password_min_length:
        return False, f'패스워드는 최소 {settings.password_min_length}자 이상이어야 합니다.'
    if len(password) > settings.password_max_length:
        return False, f'패스워드는 최대 {settings.password_max_length}자 이하여야 합니다.'

    # 대문자 검증
    if settings.password_require_uppercase and not re.search(r'[A-Z]', password):
        return False, '패스워드에 대문자가 포함되어야 합니다.'

    # 특수문자 검증
    if settings.password_require_special and not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False, '패스워드에 특수문자가 포함되어야 합니다.'

    # 숫자 검증
    if settings.password_require_number and not re.search(r'\d', password):
        return False, '패스워드에 숫자가 포함되어야 합니다.'

    return True, '패스워드가 요구사항을 충족합니다.'

def get_client_ip():
    """클라이언트 IP 주소 가져오기"""
    if request.headers.get('X-Forwarded-For'):
        return request.headers.get('X-Forwarded-For').split(',')[0]
    return request.remote_addr

def record_login_attempt(user_id, success):
    """로그인 시도 기록"""
    attempt = LoginAttempt(
        user_id=user_id,
        success=success,
        ip_address=get_client_ip()
    )
    db.session.add(attempt)
    db.session.commit()

def check_account_lock(user):
    """계정 잠금 상태 확인 및 처리"""
    if user.is_account_locked():
        remaining_time = (user.locked_until - datetime.utcnow()).total_seconds() / 60
        return True, f'계정이 잠겨있습니다. {int(remaining_time)}분 후에 다시 시도하세요.'
    return False, None

def handle_failed_login(user):
    """로그인 실패 처리 - 실패 횟수 증가 및 계정 잠금"""
    settings = get_system_settings()
    user.failed_login_attempts += 1

    if user.failed_login_attempts >= settings.login_failure_limit:
        user.is_locked = True
        user.locked_until = datetime.utcnow() + timedelta(minutes=settings.account_lock_minutes)
        db.session.commit()
        
        # 계정 잠금 로그 생성
        create_service_log(
            user_id=user.id,
            log_type='경고',
            action='계정 잠금',
            description=f'{user.name}({user.username}) 사용자의 계정이 패스워드 {settings.login_failure_limit}회 입력 오류로 {settings.account_lock_minutes}분간 잠겼습니다.',
            ip_address=request.remote_addr if request else None
        )
        
        return f'로그인 {settings.login_failure_limit}회 실패로 계정이 {settings.account_lock_minutes}분간 잠겼습니다.'

    db.session.commit()
    remaining = settings.login_failure_limit - user.failed_login_attempts
    return f'로그인 실패. {remaining}회 더 실패하면 계정이 잠깁니다.'

def reset_failed_login_attempts(user):
    """로그인 성공 시 실패 횟수 초기화"""
    was_locked = user.is_locked
    user.failed_login_attempts = 0
    user.is_locked = False
    user.locked_until = None
    db.session.commit()
    
    # 계정 잠금 해제 로그 생성
    if was_locked:
        create_service_log(
            user_id=user.id,
            log_type='정보',
            action='계정 잠금 해제',
            description=f'{user.name}({user.username}) 사용자의 계정 잠금이 해제되었습니다.',
            ip_address=request.remote_addr if request else None
        )

def manage_user_session(user_id):
    """사용자 세션 관리 - 중복 로그인 방지"""
    settings = get_system_settings()

    if settings.prevent_duplicate_login:
        # 기존 세션 모두 삭제
        UserSession.query.filter_by(user_id=user_id).delete()
        db.session.commit()

    # 새 세션 생성
    session_id = str(uuid.uuid4())
    new_session = UserSession(
        user_id=user_id,
        session_id=session_id,
        ip_address=get_client_ip()
    )
    db.session.add(new_session)
    db.session.commit()

    session['session_id'] = session_id
    return session_id

def check_session_timeout():
    """세션 타임아웃 체크"""
    settings = get_system_settings()

    if not settings.session_timeout_enabled:
        return True

    if 'last_activity' in session:
        last_activity = datetime.fromisoformat(session['last_activity'])
        timeout_delta = timedelta(minutes=settings.session_timeout_minutes)

        if datetime.utcnow() - last_activity > timeout_delta:
            return False

    session['last_activity'] = datetime.utcnow().isoformat()
    return True

# 권한 체크 데코레이터
def role_required(*roles):
    """지정된 role만 접근 가능하도록 하는 데코레이터"""
    def decorator(f):
        @wraps(f)
        @login_required
        def decorated_function(*args, **kwargs):
            if not current_user.is_active:
                flash('비활성화된 계정입니다. 관리자에게 문의하세요.', 'danger')
                return redirect(url_for('login'))
            if current_user.role not in roles:
                flash('접근 권한이 없습니다.', 'danger')
                abort(403)
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def super_admin_required(f):
    """슈퍼 관리자만 접근 가능"""
    return role_required(ROLE_SUPER_ADMIN)(f)

def admin_required(f):
    """슈퍼 관리자 또는 일반 관리자만 접근 가능"""
    return role_required(ROLE_SUPER_ADMIN, ROLE_ADMIN)(f)

# 라우트
@app.route('/')
@login_required
def index():
    """메인 페이지 - 권한별 대시보드로 리다이렉트"""
    return redirect(url_for('dashboard'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('index'))

    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        user = User.query.filter_by(username=username).first()

        if user:
            # 1. 계정 활성화 확인
            if not user.is_active:
                flash('비활성화된 계정입니다. 관리자에게 문의하세요.', 'danger')
                return render_template('login.html')

            # 2. 계정 잠금 확인
            is_locked, lock_message = check_account_lock(user)
            if is_locked:
                flash(lock_message, 'danger')
                return render_template('login.html')

            # 3. 비밀번호 확인
            if user.check_password(password):
                # 로그인 성공
                reset_failed_login_attempts(user)
                record_login_attempt(user.id, success=True)
                
                # 로그인 성공 로그 생성
                ip_address = request.remote_addr
                create_service_log(
                    user_id=user.id,
                    log_type='정상',
                    action='로그인',
                    description=f'{user.name}({user.username}) 사용자가 로그인했습니다.',
                    ip_address=ip_address
                )

                # 마지막 로그인 시간 업데이트
                user.last_login = datetime.utcnow()
                db.session.commit()

                # 세션 관리 (중복 로그인 방지 포함)
                manage_user_session(user.id)

                login_user(user)

                # 4. 최초 로그인 확인
                if user.is_first_login:
                    # admin 계정의 최초 로그인인 경우 새 슈퍼관리자 생성 페이지로 이동
                    if user.username == 'admin' and user.role == ROLE_SUPER_ADMIN:
                        flash('기본 관리자 계정으로 로그인하셨습니다. 새로운 슈퍼관리자 계정을 생성해주세요.', 'warning')
                        return redirect(url_for('create_new_super_admin'))
                    else:
                        # 일반 사용자/관리자는 패스워드 변경
                        flash('최초 로그인입니다. 보안을 위해 패스워드를 변경해주세요.', 'warning')
                        return redirect(url_for('change_password', first_login='true'))

                # 5. 패스워드 만료 확인
                settings = get_system_settings()
                if user.is_password_expired(settings):
                    flash('패스워드가 만료되었습니다. 패스워드를 변경해주세요.', 'warning')
                    return redirect(url_for('change_password', expired='true'))

                # 권한별 리다이렉트 (환영 메시지 제거)
                next_page = request.args.get('next')
                if next_page:
                    return redirect(next_page)

                return redirect(url_for('dashboard'))
            else:
                # 로그인 실패 - 패스워드 오류
                record_login_attempt(user.id, success=False)
                error_message = handle_failed_login(user)
                
                # 패스워드 오류 로그 생성
                create_service_log(
                    user_id=user.id,
                    log_type='경고',
                    action='로그인 실패',
                    description=f'{user.name}({user.username}) 사용자의 패스워드 입력 오류가 발생했습니다.',
                    ip_address=request.remote_addr
                )
                
                flash(error_message, 'danger')
        else:
            # 존재하지 않는 계정
            create_service_log(
                user_id=None,
                log_type='오류',
                action='로그인 실패',
                description=f'존재하지 않는 계정({username})으로 로그인을 시도했습니다.',
                ip_address=request.remote_addr
            )
            flash('아이디 또는 비밀번호가 올바르지 않습니다.', 'danger')

    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    user_id = current_user.id
    user_name = current_user.name
    username = current_user.username
    
    # 로그아웃 로그 생성
    create_service_log(
        user_id=user_id,
        log_type='정상',
        action='로그아웃',
        description=f'{user_name}({username}) 사용자가 로그아웃했습니다.',
        ip_address=request.remote_addr
    )
    
    # 세션 정리
    if 'session_id' in session:
        UserSession.query.filter_by(session_id=session['session_id']).delete()
        db.session.commit()

    logout_user()
    session.clear()

    # 패스워드 변경 후 로그아웃인 경우 메시지 표시
    if request.args.get('password_changed') == 'true':
        flash('패스워드가 변경되었습니다. 새 패스워드로 다시 로그인해주세요.', 'success')

    return redirect(url_for('login'))

@app.route('/change-password', methods=['GET', 'POST'])
@login_required
def change_password():
    """패스워드 변경"""
    # GET 요청 시 직접 접근 차단: first_login 또는 expired 파라미터가 있을 때만 허용
    if request.method == 'GET':
        first_login = request.args.get('first_login')
        expired = request.args.get('expired')
        
        # 파라미터가 없거나, 이미 패스워드를 변경한 경우 접근 차단
        if not (first_login == 'true' or expired == 'true'):
            flash('잘못된 접근입니다.', 'danger')
            return redirect(url_for('dashboard'))
        
        # 최초 로그인이 아니거나 패스워드가 만료되지 않은 경우 접근 차단
        settings = get_system_settings()
        if first_login == 'true' and not current_user.is_first_login:
            flash('이미 패스워드를 변경하셨습니다.', 'info')
            return redirect(url_for('dashboard'))
        
        if expired == 'true' and not current_user.is_password_expired(settings):
            flash('패스워드가 만료되지 않았습니다.', 'info')
            return redirect(url_for('dashboard'))
    
    # 패스워드 만료 확인 (GET/POST 모두에서 사용)
    settings = get_system_settings()
    password_expired = current_user.is_password_expired(settings)
    days_until_expiry = None

    if settings.password_expiry_enabled and current_user.password_changed_at:
        days_since_change = (datetime.utcnow() - current_user.password_changed_at).days
        days_until_expiry = settings.password_expiry_days - days_since_change

    if request.method == 'POST':
        current_password = request.form.get('current_password')
        new_password = request.form.get('new_password')
        confirm_password = request.form.get('confirm_password')

        # 최초 로그인이 아닌 경우에만 현재 비밀번호 확인
        if not current_user.is_first_login:
            # 1. 현재 비밀번호 확인
            if not current_password:
                flash('현재 패스워드를 입력해주세요.', 'danger')
                return render_template('change_password.html',
                                     password_expired=password_expired,
                                     days_until_expiry=days_until_expiry,
                                     settings=settings)
            
            if not current_user.check_password(current_password):
                flash('현재 비밀번호가 올바르지 않습니다.', 'danger')
                return render_template('change_password.html',
                                     password_expired=password_expired,
                                     days_until_expiry=days_until_expiry,
                                     settings=settings)

            # 3. 현재 비밀번호와 동일한지 확인
            if current_password == new_password:
                flash('새 비밀번호는 현재 비밀번호와 달라야 합니다.', 'danger')
                return render_template('change_password.html',
                                     password_expired=password_expired,
                                     days_until_expiry=days_until_expiry,
                                     settings=settings)

        # 2. 새 비밀번호 확인
        if new_password != confirm_password:
            flash('새 비밀번호가 일치하지 않습니다.', 'danger')
            return render_template('change_password.html',
                                 password_expired=password_expired,
                                 days_until_expiry=days_until_expiry,
                                 settings=settings)

        # 4. 패스워드 복잡성 검증
        is_valid, message = validate_password(new_password)
        if not is_valid:
            flash(message, 'danger')
            return render_template('change_password.html',
                                 password_expired=password_expired,
                                 days_until_expiry=days_until_expiry,
                                 settings=settings)

        # 5. 패스워드 변경
        user_id = current_user.id
        user_name = current_user.name
        username = current_user.username
        
        current_user.set_password(new_password)
        db.session.commit()
        
        # 패스워드 변경 로그 생성
        create_service_log(
            user_id=user_id,
            log_type='정보',
            action='패스워드 변경',
            description=f'{user_name}({username}) 사용자가 패스워드를 변경했습니다.',
            ip_address=request.remote_addr
        )

        # 로그아웃 처리
        logout_user()
        
        flash('패스워드가 성공적으로 변경되었습니다. 새 패스워드로 다시 로그인해주세요.', 'success')
        return redirect(url_for('login'))

    return render_template('change_password.html',
                         password_expired=password_expired,
                         days_until_expiry=days_until_expiry,
                         settings=settings)

@app.route('/create-new-super-admin', methods=['GET', 'POST'])
@login_required
def create_new_super_admin():
    """기본 admin 계정 최초 로그인 시 새 슈퍼관리자 생성"""
    # admin 계정이 아니거나 최초 로그인이 아닌 경우 접근 차단
    if current_user.username != 'admin' or not current_user.is_first_login:
        flash('잘못된 접근입니다.', 'danger')
        return redirect(url_for('dashboard'))

    if request.method == 'POST':
        username = request.form.get('username')
        name = request.form.get('name')
        email = request.form.get('email') if request.form.get('email') else None
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')

        # 1. 사용자명 검증 - admin 사용 불가
        if username.lower() == 'admin':
            flash('슈퍼관리자 계정 ID로 "admin"은 사용할 수 없습니다.', 'danger')
            return render_template('create_new_super_admin.html')

        # 2. 중복 체크
        if User.query.filter_by(username=username).first():
            flash('이미 존재하는 계정 ID입니다.', 'danger')
            return render_template('create_new_super_admin.html')

        if email and User.query.filter_by(email=email).first():
            flash('이미 사용 중인 이메일입니다.', 'danger')
            return render_template('create_new_super_admin.html')

        # 3. 패스워드 확인
        if password != confirm_password:
            flash('패스워드가 일치하지 않습니다.', 'danger')
            return render_template('create_new_super_admin.html')

        # 4. 패스워드 복잡성 검증 (대문자, 숫자, 특수문자, 8자리 이상)
        if len(password) < 8:
            flash('패스워드는 최소 8자 이상이어야 합니다.', 'danger')
            return render_template('create_new_super_admin.html')

        if not re.search(r'[A-Z]', password):
            flash('패스워드에 대문자가 포함되어야 합니다.', 'danger')
            return render_template('create_new_super_admin.html')

        if not re.search(r'\d', password):
            flash('패스워드에 숫자가 포함되어야 합니다.', 'danger')
            return render_template('create_new_super_admin.html')

        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            flash('패스워드에 특수문자가 포함되어야 합니다.', 'danger')
            return render_template('create_new_super_admin.html')

        # 5. 새 슈퍼관리자 생성
        new_super_admin = User(
            username=username,
            name=name,
            email=email,
            role=ROLE_SUPER_ADMIN,
            is_active=True,
            is_first_login=False  # 새 슈퍼관리자는 최초 로그인 플래그 해제
        )
        new_super_admin.set_password(password)
        db.session.add(new_super_admin)

        # 6. 기본 admin 계정 비활성화 (삭제하지 않음)
        admin_account = User.query.filter_by(username='admin').first()
        if admin_account:
            admin_account.is_active = False
            admin_account.is_first_login = False  # 최초 로그인 플래그도 해제

        db.session.commit()

        # 7. 서비스 로그 생성
        create_service_log(
            user_id=current_user.id,
            log_type='정보',
            action='슈퍼관리자 생성',
            description=f'새로운 슈퍼관리자 계정 생성: {username} ({name}). 기본 admin 계정 비활성화됨.',
            ip_address=request.remote_addr
        )

        # 8. 로그아웃 후 새 계정으로 로그인하도록 안내
        logout_user()
        flash(f'새로운 슈퍼관리자 계정 "{username}"이 생성되었습니다. 새 계정으로 로그인해주세요.', 'success')
        return redirect(url_for('login'))

    return render_template('create_new_super_admin.html')

# ========== 통합 대시보드 (역할별 자동 라우팅) ==========
@app.route('/dashboard')
@login_required
def dashboard():
    """통합 대시보드 - 사용자 역할에 따라 적절한 대시보드로 연결"""
    if current_user.is_super_admin():
        return super_admin_dashboard()
    elif current_user.is_admin():
        return admin_dashboard()
    else:
        return user_dashboard()

# ========== 슈퍼 관리자 전용 페이지 ==========
def super_admin_dashboard():
    """슈퍼 관리자 대시보드 - 모든 메뉴 접근 가능"""
    total_users = User.query.count()
    total_admins = User.query.filter_by(role=ROLE_ADMIN).count()
    total_normal_users = User.query.filter_by(role=ROLE_USER).count()
    total_customers = Customer.query.count()
    total_documents = Document.query.count()

    # 이번 달 점검 대상 및 완료 현황 계산
    monthly_inspection_targets = 0
    monthly_inspection_completed = 0

    all_customers = Customer.query.all()
    for customer in all_customers:
        # 이번 달 점검 대상인지 확인
        if customer.is_inspection_needed_this_month():
            monthly_inspection_targets += 1

            # 이번 달 점검 완료했는지 확인
            if customer.is_inspection_completed_this_month():
                monthly_inspection_completed += 1

    # 디스크 사용량 정보
    disk_usage = get_disk_usage()

    return render_template('super_admin/dashboard.html',
                         total_users=total_users,
                         total_admins=total_admins,
                         total_normal_users=total_normal_users,
                         total_customers=total_customers,
                         total_documents=total_documents,
                         monthly_inspection_targets=monthly_inspection_targets,
                         monthly_inspection_completed=monthly_inspection_completed,
                         disk_usage=disk_usage)

@app.route('/admins')
@super_admin_required
def manage_admins():
    """일반 관리자 목록 및 관리"""
    admins = User.query.filter_by(role=ROLE_ADMIN).all()
    return render_template('super_admin/admins.html', admins=admins)

@app.route('/users')
@admin_required
def manage_users_unified():
    """사용자 관리 - 슈퍼 관리자와 일반 관리자 통합"""
    if current_user.is_super_admin():
        # 슈퍼 관리자는 모든 일반 사용자 관리
        users = User.query.filter_by(role=ROLE_USER).all()
        customers = Customer.query.all()
        return render_template('super_admin/users.html', users=users, customers=customers)
    else:
        # 일반 관리자는 일반 사용자만 관리
        users = User.query.filter_by(role=ROLE_USER).all()
        return render_template('admin/users.html', users=users)

@app.route('/customers')
@login_required
def manage_customers():
    """고객사 목록 및 관리 - 모든 로그인 사용자 접근 가능"""
    # 사용자 권한에 따라 고객사 목록 필터링
    if current_user.is_super_admin() or current_user.is_admin():
        customers_list = Customer.query.all()
    else:
        # 일반 사용자는 담당 고객사만 조회
        customers_list = current_user.assigned_customers.all()
    
    # 점검 대상 여부와 완료 여부 계산
    for customer in customers_list:
        customer.is_monthly_target = customer.is_inspection_needed_this_month()
        customer.is_monthly_completed = customer.is_inspection_completed_this_month()
    return render_template('super_admin/customers.html', customers=customers_list)

@app.route('/customers/create', methods=['POST'])
@login_required
def create_customer():
    """고객사 생성 (회사명만 필수) - 모든 로그인 사용자 가능"""
    name = request.form.get('name')

    if not name:
        flash('회사명을 입력해주세요.', 'danger')
        return redirect(url_for('manage_customers'))

    # 중복 체크
    if Customer.query.filter_by(name=name).first():
        flash('이미 존재하는 고객사명입니다.', 'danger')
        return redirect(url_for('manage_customers'))

    # 고객사 생성 (회사명만으로)
    customer = Customer(name=name)
    db.session.add(customer)
    db.session.commit()

    # 서비스 로그 생성
    create_service_log(
        user_id=current_user.id,
        log_type='정보',
        action='고객사 생성',
        description=f'고객사명: {name}'
    )

    flash('고객사가 생성되었습니다. 세부 정보를 입력해주세요.', 'success')
    return redirect(url_for('customer_detail', customer_id=customer.id))

@app.route('/customers/<int:customer_id>')
@login_required
def customer_detail(customer_id):
    """고객사 세부 정보 조회 - 모든 로그인 사용자 가능"""
    customer = Customer.query.get_or_404(customer_id)
    # 부서별 사용자 목록
    engineers = User.query.filter_by(role=ROLE_USER, is_active=True, department='기술팀').all()
    sales = User.query.filter_by(role=ROLE_USER, is_active=True, department='영업팀').all()
    return render_template('super_admin/customer_detail.html', customer=customer, engineers=engineers, sales=sales)

@app.route('/customers/<int:customer_id>/update', methods=['POST'])
@login_required
def update_customer(customer_id):
    """고객사 세부 정보 업데이트 - 모든 로그인 사용자 가능"""
    customer = Customer.query.get_or_404(customer_id)

    # 변경 사항 추적을 위한 이전 값 저장
    old_name = customer.name
    old_contract_type = customer.contract_type
    old_inspection_cycle = customer.inspection_cycle_type
    
    # 담당자 정보 이전 값
    old_contact_name = customer.contact_name
    old_contact_mobile = customer.contact_mobile
    old_contact_email = customer.contact_email
    
    # 부담당자 정보 이전 값
    old_contact_name_sub1 = customer.contact_name_sub1
    old_contact_name_sub2 = customer.contact_name_sub2
    old_contact_name_sub3 = customer.contact_name_sub3
    
    # 사내 담당자 이전 값
    old_engineer = customer.engineer
    old_engineer_sub = customer.engineer_sub
    old_sales = customer.sales
    
    changes = []

    # 고객사 기본 정보
    new_name = request.form.get('name')
    if old_name != new_name:
        changes.append(f'고객사명: "{old_name}" → "{new_name}"')
    customer.name = new_name
    customer.location = request.form.get('location')

    # 고객사 담당자 정보 (정 담당자)
    new_contact_name = request.form.get('contact_name')
    new_contact_mobile = request.form.get('contact_mobile')
    new_contact_email = request.form.get('contact_email')
    
    if old_contact_name != new_contact_name:
        changes.append(f'담당자명: "{old_contact_name or "없음"}" → "{new_contact_name or "없음"}"')
    if old_contact_mobile != new_contact_mobile:
        changes.append(f'담당자 연락처: "{old_contact_mobile or "없음"}" → "{new_contact_mobile or "없음"}"')
    if old_contact_email != new_contact_email:
        changes.append(f'담당자 이메일: "{old_contact_email or "없음"}" → "{new_contact_email or "없음"}"')
    
    customer.contact_name = new_contact_name
    customer.contact_position = request.form.get('contact_position')
    customer.contact_department = request.form.get('contact_department')
    customer.contact_mobile = new_contact_mobile
    customer.contact_phone = request.form.get('contact_phone')
    customer.contact_email = new_contact_email

    # 고객사 부담당자 정보 (부담당자 1)
    new_contact_name_sub1 = request.form.get('contact_name_sub1')
    if old_contact_name_sub1 != new_contact_name_sub1:
        if old_contact_name_sub1 and new_contact_name_sub1:
            changes.append(f'부담당자1: "{old_contact_name_sub1}" → "{new_contact_name_sub1}"')
        elif new_contact_name_sub1:
            changes.append(f'부담당자1 추가: "{new_contact_name_sub1}"')
        elif old_contact_name_sub1:
            changes.append(f'부담당자1 삭제: "{old_contact_name_sub1}"')
    
    customer.contact_name_sub1 = new_contact_name_sub1
    customer.contact_position_sub1 = request.form.get('contact_position_sub1')
    customer.contact_department_sub1 = request.form.get('contact_department_sub1')
    customer.contact_mobile_sub1 = request.form.get('contact_mobile_sub1')
    customer.contact_phone_sub1 = request.form.get('contact_phone_sub1')
    customer.contact_email_sub1 = request.form.get('contact_email_sub1')

    # 고객사 부담당자 정보 (부담당자 2)
    new_contact_name_sub2 = request.form.get('contact_name_sub2')
    if old_contact_name_sub2 != new_contact_name_sub2:
        if old_contact_name_sub2 and new_contact_name_sub2:
            changes.append(f'부담당자2: "{old_contact_name_sub2}" → "{new_contact_name_sub2}"')
        elif new_contact_name_sub2:
            changes.append(f'부담당자2 추가: "{new_contact_name_sub2}"')
        elif old_contact_name_sub2:
            changes.append(f'부담당자2 삭제: "{old_contact_name_sub2}"')
    
    customer.contact_name_sub2 = new_contact_name_sub2
    customer.contact_position_sub2 = request.form.get('contact_position_sub2')
    customer.contact_department_sub2 = request.form.get('contact_department_sub2')
    customer.contact_mobile_sub2 = request.form.get('contact_mobile_sub2')
    customer.contact_phone_sub2 = request.form.get('contact_phone_sub2')
    customer.contact_email_sub2 = request.form.get('contact_email_sub2')

    # 고객사 부담당자 정보 (부담당자 3)
    new_contact_name_sub3 = request.form.get('contact_name_sub3')
    if old_contact_name_sub3 != new_contact_name_sub3:
        if old_contact_name_sub3 and new_contact_name_sub3:
            changes.append(f'부담당자3: "{old_contact_name_sub3}" → "{new_contact_name_sub3}"')
        elif new_contact_name_sub3:
            changes.append(f'부담당자3 추가: "{new_contact_name_sub3}"')
        elif old_contact_name_sub3:
            changes.append(f'부담당자3 삭제: "{old_contact_name_sub3}"')
    
    customer.contact_name_sub3 = new_contact_name_sub3
    customer.contact_position_sub3 = request.form.get('contact_position_sub3')
    customer.contact_department_sub3 = request.form.get('contact_department_sub3')
    customer.contact_mobile_sub3 = request.form.get('contact_mobile_sub3')
    customer.contact_phone_sub3 = request.form.get('contact_phone_sub3')
    customer.contact_email_sub3 = request.form.get('contact_email_sub3')

    # 계약 정보
    new_contract_type = request.form.get('contract_type')
    if old_contract_type != new_contract_type:
        changes.append(f'계약형태: "{old_contract_type or "없음"}" → "{new_contract_type or "없음"}"')
    customer.contract_type = new_contract_type
    contract_start = request.form.get('contract_start_date')
    contract_end = request.form.get('contract_end_date')
    customer.contract_start_date = datetime.strptime(contract_start, '%Y-%m-%d').date() if contract_start else None
    customer.contract_end_date = datetime.strptime(contract_end, '%Y-%m-%d').date() if contract_end else None

    # 점검 정보
    new_inspection_cycle = request.form.get('inspection_cycle_type')
    if old_inspection_cycle != new_inspection_cycle:
        changes.append(f'점검주기: "{old_inspection_cycle or "없음"}" → "{new_inspection_cycle or "없음"}"')
    customer.inspection_cycle_type = new_inspection_cycle
    cycle_month = request.form.get('inspection_cycle_month')
    customer.inspection_cycle_month = int(cycle_month) if cycle_month else None

    # 비고
    customer.notes = request.form.get('notes')

    # 사내 담당자
    engineer = request.form.get('engineer_id')
    engineer_sub = request.form.get('engineer_sub_id')
    sales = request.form.get('sales_id')
    
    new_engineer_id = int(engineer) if engineer else None
    new_engineer_sub_id = int(engineer_sub) if engineer_sub else None
    new_sales_id = int(sales) if sales else None
    
    # 담당 엔지니어 변경 확인
    if (old_engineer and old_engineer.id != new_engineer_id) or (not old_engineer and new_engineer_id):
        new_engineer = User.query.get(new_engineer_id) if new_engineer_id else None
        old_name_eng = old_engineer.name if old_engineer else "없음"
        new_name_eng = new_engineer.name if new_engineer else "없음"
        if old_name_eng != new_name_eng:
            changes.append(f'담당 엔지니어: "{old_name_eng}" → "{new_name_eng}"')
    elif old_engineer and not new_engineer_id:
        changes.append(f'담당 엔지니어 삭제: "{old_engineer.name}"')
    
    # 부담당 엔지니어 변경 확인
    if (old_engineer_sub and old_engineer_sub.id != new_engineer_sub_id) or (not old_engineer_sub and new_engineer_sub_id):
        new_engineer_sub = User.query.get(new_engineer_sub_id) if new_engineer_sub_id else None
        old_name_sub = old_engineer_sub.name if old_engineer_sub else "없음"
        new_name_sub = new_engineer_sub.name if new_engineer_sub else "없음"
        if old_name_sub != new_name_sub:
            changes.append(f'부담당 엔지니어: "{old_name_sub}" → "{new_name_sub}"')
    elif old_engineer_sub and not new_engineer_sub_id:
        changes.append(f'부담당 엔지니어 삭제: "{old_engineer_sub.name}"')
    
    # 담당 영업 변경 확인
    if (old_sales and old_sales.id != new_sales_id) or (not old_sales and new_sales_id):
        new_sales = User.query.get(new_sales_id) if new_sales_id else None
        old_name_sales = old_sales.name if old_sales else "없음"
        new_name_sales = new_sales.name if new_sales else "없음"
        if old_name_sales != new_name_sales:
            changes.append(f'담당 영업: "{old_name_sales}" → "{new_name_sales}"')
    elif old_sales and not new_sales_id:
        changes.append(f'담당 영업 삭제: "{old_sales.name}"')
    
    customer.engineer_id = new_engineer_id
    customer.engineer_sub_id = new_engineer_sub_id
    customer.sales_id = new_sales_id

    # user_customers 테이블 동기화 - 담당 엔지니어만 assigned_customers에 포함
    # 기존 할당 관계 모두 제거 (리스트로 변환 후 제거)
    current_assigned = list(customer.assigned_users.all())
    for user in current_assigned:
        customer.assigned_users.remove(user)
    
    # 담당 엔지니어가 지정된 경우 추가
    if new_engineer_id:
        engineer_user = User.query.get(new_engineer_id)
        if engineer_user:
            customer.assigned_users.append(engineer_user)
    
    # 부담당 엔지니어가 지정된 경우 추가
    if new_engineer_sub_id:
        engineer_sub_user = User.query.get(new_engineer_sub_id)
        if engineer_sub_user:
            customer.assigned_users.append(engineer_sub_user)

    customer.updated_at = datetime.utcnow()

    db.session.commit()
    
    # 서비스 로그 생성 (변경사항이 있을 때만)
    if changes:
        create_service_log(
            user_id=current_user.id,
            log_type='정보',
            action='고객사 수정',
            description=f'고객사: {customer.name}, 변경내역: {", ".join(changes)}'
        )
    
    flash('고객사 정보가 업데이트되었습니다.', 'success')
    return redirect(url_for('customer_detail', customer_id=customer.id))

@app.route('/customers/<int:customer_id>/delete', methods=['POST'])
@admin_required
def delete_customer(customer_id):
    """고객사 삭제"""
    customer = Customer.query.get_or_404(customer_id)

    # 고객사 이름 확인
    confirm_name = request.form.get('confirm_name')
    if confirm_name != customer.name:
        flash('고객사 이름이 일치하지 않습니다.', 'danger')
        return redirect(url_for('customer_detail', customer_id=customer.id))

    customer_name = customer.name

    # 고객사 삭제 (관련 문서는 cascade='all, delete-orphan'으로 자동 삭제됨)
    db.session.delete(customer)
    db.session.commit()

    # 서비스 로그 생성
    create_service_log(
        user_id=current_user.id,
        log_type='경고',
        action='고객사 삭제',
        description=f'삭제된 고객사: {customer_name}'
    )

    flash(f'고객사 "{customer_name}"이(가) 삭제되었습니다.', 'success')
    return redirect(url_for('manage_customers'))

@app.route('/customers/<int:customer_id>/documents')
@login_required
def customer_documents(customer_id):
    """고객사 점검서 목록 조회"""
    customer = Customer.query.get_or_404(customer_id)
    documents = Document.query.filter_by(customer_id=customer_id).order_by(Document.uploaded_at.desc()).all()
    return render_template('super_admin/customer_documents.html', customer=customer, documents=documents)

@app.route('/documents/<int:document_id>/view')
@login_required
def view_document(document_id):
    """점검서 PDF 뷰어"""
    document = Document.query.get_or_404(document_id)
    return render_template('super_admin/view_document.html', document=document)

@app.route('/documents/<int:document_id>/file')
@login_required
def serve_document(document_id):
    """점검서 파일 제공"""
    document = Document.query.get_or_404(document_id)
    return send_file(document.filepath, mimetype='application/pdf')

@app.route('/documents/<int:document_id>/delete', methods=['POST'])
@admin_required
def delete_document(document_id):
    """점검서 삭제 - 관리자만 가능"""
    document = Document.query.get_or_404(document_id)
    customer_id = document.customer_id
    customer = Customer.query.get_or_404(customer_id)
    deleted_inspection_date = document.inspection_date
    deleted_filename = document.title
    
    try:
        # 파일 삭제
        if os.path.exists(document.filepath):
            os.remove(document.filepath)
        
        # 데이터베이스 레코드 삭제
        db.session.delete(document)
        db.session.commit()
        
        # 서비스 로그 생성
        create_service_log(
            user_id=current_user.id,
            log_type='경고',
            action='점검서 삭제',
            description=f'고객사: {customer.name}, 파일: {deleted_filename}.pdf'
        )
        
        # 삭제된 점검서가 가장 최근 점검인 경우, last_inspection_date 업데이트
        if customer.last_inspection_date == deleted_inspection_date:
            # 해당 고객사의 남은 점검서 중 가장 최근 것 찾기
            latest_document = Document.query.filter_by(customer_id=customer_id)\
                .filter(Document.inspection_date.isnot(None))\
                .order_by(Document.inspection_date.desc())\
                .first()
            
            if latest_document:
                # 이전 점검서가 있으면 그 날짜로 업데이트
                customer.last_inspection_date = latest_document.inspection_date
            else:
                # 남은 점검서가 없으면 NULL로 설정
                customer.last_inspection_date = None
            
            db.session.commit()
        
        flash('점검서가 삭제되었습니다.', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'점검서 삭제 중 오류가 발생했습니다: {str(e)}', 'danger')
    
    return redirect(url_for('customer_documents', customer_id=customer_id))

@app.route('/create-admin', methods=['POST'])
@super_admin_required
def create_admin():
    """관리자 계정 생성"""
    username = request.form.get('username')
    name = request.form.get('name')
    email = request.form.get('email') if request.form.get('email') else None

    # 중복 체크
    if User.query.filter_by(username=username).first():
        flash('이미 존재하는 계정 ID입니다.', 'danger')
        return redirect(url_for('manage_admins'))

    if email and User.query.filter_by(email=email).first():
        flash('이미 사용 중인 이메일입니다.', 'danger')
        return redirect(url_for('manage_admins'))

    # 기본 패스워드 가져오기
    settings = get_system_settings()

    # 관리자 생성
    admin = User(
        username=username,
        name=name,
        email=email,
        role=ROLE_ADMIN,
        is_active=True
    )
    # 기본 패스워드로 설정하되, is_first_login은 True로 유지
    admin.password_hash = generate_password_hash(settings.default_password)
    admin.password_changed_at = datetime.utcnow()
    admin.is_first_login = True

    db.session.add(admin)
    db.session.commit()

    # 서비스 로그 생성
    create_service_log(
        user_id=current_user.id,
        log_type='정보',
        action='관리자 생성',
        description=f'계정: {username}, 이름: {name}, 이메일: {email or "없음"}'
    )

    flash(f'관리자 계정 "{username}"이 생성되었습니다. 기본 패스워드: {settings.default_password}', 'success')
    return redirect(url_for('manage_admins'))

@app.route('/create-user', methods=['POST'])
@admin_required
def create_user_unified():
    """사용자 계정 생성 - 슈퍼 관리자와 일반 관리자 통합"""
    if current_user.is_super_admin():
        return create_user()
    else:
        return admin_create_user()

def create_user():
    """슈퍼 관리자용 - 일반 사용자 계정 생성"""
    username = request.form.get('username')
    name = request.form.get('name')
    email = request.form.get('email') if request.form.get('email') else None
    department = request.form.get('department')
    customer_id = request.form.get('customer_id') if request.form.get('customer_id') else None

    # 필수 필드 확인
    if not department:
        flash('소속을 선택해주세요.', 'danger')
        return redirect(url_for('manage_users_unified'))

    # 중복 체크
    if User.query.filter_by(username=username).first():
        flash('이미 존재하는 계정 ID입니다.', 'danger')
        return redirect(url_for('manage_users_unified'))

    if email and User.query.filter_by(email=email).first():
        flash('이미 사용 중인 이메일입니다.', 'danger')
        return redirect(url_for('manage_users_unified'))

    # 기본 패스워드 가져오기
    settings = get_system_settings()

    # 사용자 생성
    user = User(
        username=username,
        name=name,
        email=email,
        role=ROLE_USER,
        department=department,
        is_active=True,
        customer_id=int(customer_id) if customer_id else None
    )
    # 기본 패스워드로 설정하되, is_first_login은 True로 유지
    user.password_hash = generate_password_hash(settings.default_password)
    user.password_changed_at = datetime.utcnow()
    user.is_first_login = True

    db.session.add(user)
    db.session.commit()

    # 서비스 로그 생성
    create_service_log(
        user_id=current_user.id,
        log_type='정보',
        action='사용자 생성',
        description=f'계정: {username}, 이름: {name}, 소속: {department}, 이메일: {email or "없음"}'
    )

    flash(f'사용자 계정 "{username}"이 생성되었습니다. 기본 패스워드: {settings.default_password}', 'success')
    return redirect(url_for('manage_users_unified'))

@app.route('/reset-password/<int:user_id>', methods=['POST'])
@admin_required
def reset_password_unified(user_id):
    """패스워드 초기화 - 슈퍼 관리자와 일반 관리자 통합"""
    if current_user.is_super_admin():
        return reset_password(user_id)
    else:
        return admin_reset_password(user_id)

def reset_password(user_id):
    """슈퍼 관리자용 - 사용자 패스워드 초기화"""
    user = User.query.get_or_404(user_id)

    # 슈퍼 관리자 자신은 초기화할 수 없음
    if user.id == current_user.id:
        flash('자신의 패스워드는 초기화할 수 없습니다.', 'danger')
        return redirect(request.referrer or url_for('dashboard'))

    # 기본 패스워드로 초기화
    settings = get_system_settings()
    user.password_hash = generate_password_hash(settings.default_password)
    user.password_changed_at = datetime.utcnow()
    user.is_first_login = True
    db.session.commit()

    flash(f'{user.username}의 패스워드가 기본 패스워드로 초기화되었습니다.', 'success')
    return redirect(request.referrer or url_for('dashboard'))

@app.route('/delete-user/<int:user_id>', methods=['POST'])
@admin_required
def delete_user_unified(user_id):
    """사용자 삭제 - 슈퍼 관리자와 일반 관리자 통합"""
    if current_user.is_super_admin():
        return delete_user(user_id)
    else:
        return admin_delete_user(user_id)

def delete_user(user_id):
    """슈퍼 관리자용 - 사용자 삭제"""
    user = User.query.get_or_404(user_id)

    # 슈퍼 관리자 자신은 삭제할 수 없음
    if user.id == current_user.id:
        flash('자신의 계정은 삭제할 수 없습니다.', 'danger')
        return redirect(request.referrer or url_for('dashboard'))

    # 슈퍼 관리자는 삭제할 수 없음
    if user.role == ROLE_SUPER_ADMIN:
        flash('슈퍼 관리자 계정은 삭제할 수 없습니다.', 'danger')
        return redirect(request.referrer or url_for('dashboard'))

    username = user.username
    user_role = user.role

    # 관련 데이터 삭제 (외래 키 제약 조건 해결)
    # 1. 로그인 시도 기록 삭제
    LoginAttempt.query.filter_by(user_id=user.id).delete()

    # 2. 사용자 세션 삭제
    UserSession.query.filter_by(user_id=user.id).delete()

    # 3. 사용자 삭제
    db.session.delete(user)
    db.session.commit()

    # 서비스 로그 생성
    role_text = '관리자' if user_role == ROLE_ADMIN else '사용자'
    create_service_log(
        user_id=current_user.id,
        log_type='경고',
        action=f'{role_text} 삭제',
        description=f'삭제된 {role_text}: {username}'
    )

    flash(f'계정 "{username}"이 삭제되었습니다.', 'success')
    return redirect(request.referrer or url_for('dashboard'))

@app.route('/update-user/<int:user_id>', methods=['POST'])
@admin_required
def update_user_unified(user_id):
    """사용자 정보 수정 - 슈퍼 관리자와 일반 관리자 통합"""
    user = User.query.get_or_404(user_id)
    
    # 슈퍼 관리자는 수정 불가
    if user.role == ROLE_SUPER_ADMIN:
        flash('슈퍼 관리자 계정은 수정할 수 없습니다.', 'danger')
        return redirect(request.referrer or url_for('manage_users_unified'))
    
    # 일반 관리자는 일반 사용자만 수정 가능
    if current_user.is_admin() and user.role != ROLE_USER:
        flash('권한이 없습니다.', 'danger')
        return redirect(request.referrer or url_for('manage_users_unified'))
    
    try:
        # 이름 수정
        name = request.form.get('name', '').strip()
        if name:
            user.name = name
        
        # 이메일 수정
        email = request.form.get('email', '').strip()
        user.email = email if email else None
        
        # 소속(부서) 수정 - 일반 사용자만 가능
        if user.role == ROLE_USER:
            department = request.form.get('department', '').strip()
            user.department = department if department else None
        
        db.session.commit()
        
        # 서비스 로그 생성
        create_service_log(
            user_id=current_user.id,
            log_type='정보',
            action='사용자 정보 수정',
            description=f'수정된 사용자: {user.name} ({user.username}), 역할: {user.role}'
        )
        
        flash(f'사용자 "{user.name}"의 정보가 수정되었습니다.', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'사용자 정보 수정 중 오류가 발생했습니다: {str(e)}', 'danger')
    
    return redirect(request.referrer or url_for('manage_users_unified'))

@app.route('/toggle-active/<int:user_id>', methods=['POST'])
@admin_required
def toggle_user_active_unified(user_id):
    """사용자 활성화/비활성화 - 슈퍼 관리자와 일반 관리자 통합"""
    if current_user.is_super_admin():
        return toggle_user_active(user_id)
    else:
        return admin_toggle_user_active(user_id)

def toggle_user_active(user_id):
    """슈퍼 관리자용 - 사용자 활성화/비활성화 토글"""
    user = User.query.get_or_404(user_id)

    # 슈퍼 관리자 자신은 비활성화할 수 없음
    if user.id == current_user.id:
        flash('자신의 계정은 비활성화할 수 없습니다.', 'danger')
        return redirect(request.referrer or url_for('dashboard'))

    user.is_active = not user.is_active
    status = '활성화' if user.is_active else '비활성화'
    db.session.commit()

    # 서비스 로그 생성
    role_text = '관리자' if user.role == ROLE_ADMIN else '사용자'
    create_service_log(
        user_id=current_user.id,
        log_type='정보',
        action=f'{role_text} {status}',
        description=f'{role_text}: {user.name} ({user.username})'
    )

    flash(f'{user.username} 계정이 {status}되었습니다.', 'success')
    return redirect(request.referrer or url_for('dashboard'))

@app.route('/settings', methods=['GET', 'POST'])
@super_admin_required
def system_settings():
    """시스템 설정 관리"""
    settings = SystemSettings.query.first()

    # 설정이 없으면 기본값으로 생성
    if not settings:
        settings = SystemSettings()
        db.session.add(settings)
        db.session.commit()

    if request.method == 'POST':
        # 변경 사항 추적
        changes = []
        
        # 기본 패스워드 설정
        old_password = settings.default_password
        new_password = request.form.get('default_password', 'Welcome1!')
        if old_password != new_password:
            changes.append(f'기본 패스워드 변경')
        settings.default_password = new_password

        # 패스워드 복잡성 설정
        old_min_length = settings.password_min_length
        new_min_length = int(request.form.get('password_min_length', 8))
        if old_min_length != new_min_length:
            changes.append(f'패스워드 최소 길이: {old_min_length} → {new_min_length}')
        settings.password_min_length = new_min_length
        
        settings.password_max_length = int(request.form.get('password_max_length', 20))
        settings.password_require_uppercase = request.form.get('password_require_uppercase') == 'on'
        settings.password_require_special = request.form.get('password_require_special') == 'on'
        settings.password_require_number = request.form.get('password_require_number') == 'on'

        # 중복 로그인 설정
        old_duplicate_login = settings.prevent_duplicate_login
        new_duplicate_login = request.form.get('prevent_duplicate_login') == 'on'
        if old_duplicate_login != new_duplicate_login:
            changes.append(f'중복 로그인 방지: {old_duplicate_login} → {new_duplicate_login}')
        settings.prevent_duplicate_login = new_duplicate_login

        # 세션 타임아웃 설정
        old_timeout_enabled = settings.session_timeout_enabled
        new_timeout_enabled = request.form.get('session_timeout_enabled') == 'on'
        if old_timeout_enabled != new_timeout_enabled:
            changes.append(f'세션 타임아웃 활성화: {old_timeout_enabled} → {new_timeout_enabled}')
        settings.session_timeout_enabled = new_timeout_enabled
        
        old_timeout_minutes = settings.session_timeout_minutes
        session_timeout = int(request.form.get('session_timeout_minutes', 30))
        new_timeout_minutes = max(3, min(60, session_timeout))
        if old_timeout_minutes != new_timeout_minutes:
            changes.append(f'세션 타임아웃: {old_timeout_minutes}분 → {new_timeout_minutes}분')
        settings.session_timeout_minutes = new_timeout_minutes

        # 로그인 실패 설정
        old_login_limit = settings.login_failure_limit
        login_limit = int(request.form.get('login_failure_limit', 5))
        new_login_limit = max(1, min(5, login_limit))
        if old_login_limit != new_login_limit:
            changes.append(f'로그인 실패 제한: {old_login_limit}회 → {new_login_limit}회')
        settings.login_failure_limit = new_login_limit

        old_lock_time = settings.account_lock_minutes
        lock_time = int(request.form.get('account_lock_minutes', 10))
        new_lock_time = max(5, min(30, lock_time))
        if old_lock_time != new_lock_time:
            changes.append(f'계정 잠금 시간: {old_lock_time}분 → {new_lock_time}분')
        settings.account_lock_minutes = new_lock_time

        # 패스워드 변경 주기 설정
        old_expiry_enabled = settings.password_expiry_enabled
        new_expiry_enabled = request.form.get('password_expiry_enabled') == 'on'
        if old_expiry_enabled != new_expiry_enabled:
            changes.append(f'패스워드 만료 활성화: {old_expiry_enabled} → {new_expiry_enabled}')
        settings.password_expiry_enabled = new_expiry_enabled
        
        old_expiry_days = settings.password_expiry_days
        expiry_days = int(request.form.get('password_expiry_days', 90))
        new_expiry_days = max(30, min(365, expiry_days))
        if old_expiry_days != new_expiry_days:
            changes.append(f'패스워드 만료 기간: {old_expiry_days}일 → {new_expiry_days}일')
        settings.password_expiry_days = new_expiry_days

        settings.updated_by = current_user.id
        db.session.commit()

        # 서비스 로그 생성 (변경사항이 있을 때만)
        if changes:
            create_service_log(
                user_id=current_user.id,
                log_type='정보',
                action='시스템 설정 변경',
                description=f'변경내역: {", ".join(changes)}'
            )

        flash('시스템 설정이 저장되었습니다.', 'success')
        return redirect(url_for('system_settings'))

    return render_template('super_admin/settings.html', settings=settings)

# ========== 일반 관리자 전용 페이지 ==========
def admin_dashboard():
    """일반 관리자 대시보드 - 일반 사용자 관리, 패스워드 초기화, 서비스 로그 확인"""
    total_users = User.query.filter_by(role=ROLE_USER).count()
    total_customers = Customer.query.count()
    total_documents = Document.query.count()
    active_users = User.query.filter_by(role=ROLE_USER, is_active=True).count()

    # 이번 달 점검 대상 및 완료 현황 계산
    monthly_inspection_targets = 0
    monthly_inspection_completed = 0

    all_customers = Customer.query.all()
    for customer in all_customers:
        # 이번 달 점검 대상인지 확인
        if customer.is_inspection_needed_this_month():
            monthly_inspection_targets += 1

            # 이번 달 점검 완료했는지 확인
            if customer.is_inspection_completed_this_month():
                monthly_inspection_completed += 1

    # 디스크 사용량 정보
    disk_usage = get_disk_usage()

    return render_template('admin/dashboard.html',
                         total_users=total_users,
                         total_customers=total_customers,
                         total_documents=total_documents,
                         active_users=active_users,
                         monthly_inspection_targets=monthly_inspection_targets,
                         monthly_inspection_completed=monthly_inspection_completed,
                         disk_usage=disk_usage)

@app.route('/logs')
@admin_required
def service_logs():
    """서비스 로그 확인"""
    # 필터 파라미터
    log_type = request.args.get('log_type', '')
    action = request.args.get('action', '')
    user_id = request.args.get('user_id', '')
    
    # 기본 쿼리
    query = ServiceLog.query
    
    # 필터 적용
    if log_type:
        query = query.filter_by(log_type=log_type)
    if action:
        query = query.filter_by(action=action)
    if user_id:
        query = query.filter_by(user_id=user_id)
    
    # 최신순으로 정렬하고 최대 500개만 표시
    logs = query.order_by(ServiceLog.created_at.desc()).limit(500).all()
    
    # 사용자 목록 (필터용)
    users = User.query.order_by(User.name).all()
    
    return render_template('admin/logs.html', logs=logs, users=users,
                         current_log_type=log_type, current_action=action, current_user_id=user_id)

@app.route('/logs/login')
@admin_required
def login_logs():
    """로그인 관련 로그 확인 (슈퍼 관리자 제외)"""
    # 필터 파라미터
    log_type = request.args.get('log_type', '')
    user_id = request.args.get('user_id', '')
    
    # 슈퍼 관리자가 아닌 사용자들의 ID 목록
    non_super_admin_ids = [u.id for u in User.query.filter(User.role != 'super_admin').all()]
    
    # 로그인 관련 액션들만 필터링 + 슈퍼 관리자 제외
    login_actions = ['로그인', '로그아웃', '로그인 실패', '계정 잠금', '계정 잠금 해제', '패스워드 변경']
    query = ServiceLog.query.filter(ServiceLog.action.in_(login_actions))\
                            .filter(ServiceLog.user_id.in_(non_super_admin_ids))
    
    # 추가 필터 적용
    if log_type:
        query = query.filter_by(log_type=log_type)
    if user_id:
        query = query.filter_by(user_id=user_id)
    
    # 최신순으로 정렬하고 최대 500개만 표시
    logs = query.order_by(ServiceLog.created_at.desc()).limit(500).all()
    
    # 사용자 목록 (필터용 - 슈퍼 관리자 제외)
    users = User.query.filter(User.role != 'super_admin').order_by(User.name).all()
    
    return render_template('admin/login_logs.html', logs=logs, users=users,
                         current_log_type=log_type, current_user_id=user_id)

@app.route('/logs/upload')
@admin_required
def upload_logs():
    """업로드 관련 로그 확인 (슈퍼 관리자 제외)"""
    # 필터 파라미터
    user_id = request.args.get('user_id', '')
    customer_id = request.args.get('customer_id', '')
    
    # 슈퍼 관리자가 아닌 사용자들의 ID 목록
    non_super_admin_ids = [u.id for u in User.query.filter(User.role != 'super_admin').all()]
    
    # 문서 업로드 이력 쿼리 (슈퍼 관리자 제외)
    query = Document.query.filter(Document.uploaded_by.in_(non_super_admin_ids))
    
    # 필터 적용
    if user_id:
        query = query.filter_by(uploaded_by=user_id)
    if customer_id:
        query = query.filter_by(customer_id=customer_id)
    
    # 최신순으로 정렬하고 최대 500개만 표시
    documents = query.order_by(Document.uploaded_at.desc()).limit(500).all()
    
    # 사용자 및 고객사 목록 (필터용 - 슈퍼 관리자 제외)
    users = User.query.filter(User.role != 'super_admin').order_by(User.name).all()
    customers = Customer.query.order_by(Customer.name).all()
    
    return render_template('admin/upload_logs.html', documents=documents, 
                         users=users, customers=customers,
                         current_user_id=user_id, current_customer_id=customer_id)

@app.route('/logs/system')
@super_admin_required
def system_logs():
    """시스템 전체 로그 확인 (슈퍼 관리자 전용)"""
    # 필터 파라미터
    log_type = request.args.get('log_type', '')
    action = request.args.get('action', '')
    user_id = request.args.get('user_id', '')
    
    # 기본 쿼리
    query = ServiceLog.query
    
    # 필터 적용
    if log_type:
        query = query.filter_by(log_type=log_type)
    if action:
        query = query.filter_by(action=action)
    if user_id:
        query = query.filter_by(user_id=user_id)
    
    # 최신순으로 정렬하고 최대 500개만 표시
    logs = query.order_by(ServiceLog.created_at.desc()).limit(500).all()
    
    # 사용자 목록 (필터용)
    users = User.query.order_by(User.name).all()
    
    return render_template('admin/system_logs.html', logs=logs, users=users,
                         current_log_type=log_type, current_action=action, current_user_id=user_id)

def admin_create_user():
    """일반 관리자용 - 일반 사용자 계정 생성"""
    username = request.form.get('username')
    name = request.form.get('name')
    email = request.form.get('email') if request.form.get('email') else None
    department = request.form.get('department')

    # 필수 필드 확인
    if not department:
        flash('소속을 선택해주세요.', 'danger')
        return redirect(url_for('manage_users_unified'))

    # 중복 체크
    if User.query.filter_by(username=username).first():
        flash('이미 존재하는 계정 ID입니다.', 'danger')
        return redirect(url_for('manage_users_unified'))

    if email and User.query.filter_by(email=email).first():
        flash('이미 사용 중인 이메일입니다.', 'danger')
        return redirect(url_for('manage_users_unified'))

    # 기본 패스워드 가져오기
    settings = get_system_settings()

    # 사용자 생성
    user = User(
        username=username,
        name=name,
        email=email,
        department=department,
        role=ROLE_USER,
        is_active=True,
        customer_id=None
    )
    # 기본 패스워드로 설정하되, is_first_login은 True로 유지
    user.password_hash = generate_password_hash(settings.default_password)
    user.password_changed_at = datetime.utcnow()
    user.is_first_login = True

    db.session.add(user)
    db.session.commit()

    # 서비스 로그 생성
    create_service_log(
        user_id=current_user.id,
        log_type='정보',
        action='사용자 생성',
        description=f'계정: {username}, 이름: {name}, 소속: {department}, 이메일: {email or "없음"}'
    )

    flash(f'사용자 계정 "{username}"이 생성되었습니다. 기본 패스워드: {settings.default_password}', 'success')
    return redirect(url_for('manage_users_unified'))

def admin_reset_password(user_id):
    """일반 관리자용 - 일반 사용자 패스워드 초기화"""
    user = User.query.get_or_404(user_id)

    # 일반 사용자만 초기화 가능
    if user.role != ROLE_USER:
        flash('일반 사용자만 패스워드를 초기화할 수 있습니다.', 'danger')
        return redirect(request.referrer or url_for('manage_users_unified'))

    # 기본 패스워드로 초기화
    settings = get_system_settings()
    user.password_hash = generate_password_hash(settings.default_password)
    user.password_changed_at = datetime.utcnow()
    user.is_first_login = True
    db.session.commit()

    flash(f'{user.username}의 패스워드가 기본 패스워드로 초기화되었습니다.', 'success')
    return redirect(request.referrer or url_for('manage_users_unified'))

def admin_toggle_user_active(user_id):
    """일반 관리자용 - 일반 사용자 활성화/비활성화 토글"""
    user = User.query.get_or_404(user_id)

    # 일반 사용자만 토글 가능
    if user.role != ROLE_USER:
        flash('일반 사용자만 활성화/비활성화할 수 있습니다.', 'danger')
        return redirect(request.referrer or url_for('manage_users_unified'))

    user.is_active = not user.is_active
    db.session.commit()

    status = '활성화' if user.is_active else '비활성화'
    flash(f'{user.username} 계정이 {status}되었습니다.', 'success')
    return redirect(request.referrer or url_for('manage_users_unified'))

def admin_delete_user(user_id):
    """일반 관리자용 - 일반 사용자 계정 삭제"""
    user = User.query.get_or_404(user_id)

    # 일반 사용자만 삭제 가능
    if user.role != ROLE_USER:
        flash('일반 사용자만 삭제할 수 있습니다.', 'danger')
        return redirect(request.referrer or url_for('manage_users_unified'))

    username = user.username

    # 외래 키 제약 조건을 위해 관련 레코드 먼저 삭제
    # 1. 로그인 시도 기록 삭제
    LoginAttempt.query.filter_by(user_id=user_id).delete()

    # 2. 사용자 세션 삭제
    UserSession.query.filter_by(user_id=user_id).delete()

    # 3. 사용자 삭제
    db.session.delete(user)
    db.session.commit()

    flash(f'사용자 계정 "{username}"이 삭제되었습니다.', 'success')
    return redirect(url_for('manage_users_unified'))

# ========== 일반 사용자 전용 페이지 ==========
def user_dashboard():
    """일반 사용자 대시보드 - 담당 고객사 정보 및 점검 현황"""
    # 담당 고객사 목록 가져오기
    assigned_customers = current_user.assigned_customers.all()

    # 담당 고객사 수
    total_assigned_customers = len(assigned_customers)

    # 이번 달 점검 대상 및 완료 현황 계산
    monthly_inspection_targets = 0
    monthly_inspection_completed = 0

    if assigned_customers:
        for customer in assigned_customers:
            # 이번 달 점검 대상인지 확인
            if customer.is_inspection_needed_this_month():
                monthly_inspection_targets += 1

                # 이번 달 점검 완료했는지 확인
                if customer.is_inspection_completed_this_month():
                    monthly_inspection_completed += 1

        # 모든 담당 고객사의 문서 가져오기
        customer_ids = [c.id for c in assigned_customers]
        recent_documents = Document.query.filter(
            Document.customer_id.in_(customer_ids)
        ).order_by(Document.uploaded_at.desc()).limit(10).all()
    else:
        recent_documents = []

    # 디스크 사용량 정보
    disk_usage = get_disk_usage()

    return render_template('user/dashboard.html',
                         assigned_customers=assigned_customers,
                         total_assigned_customers=total_assigned_customers,
                         monthly_inspection_targets=monthly_inspection_targets,
                         monthly_inspection_completed=monthly_inspection_completed,
                         recent_documents=recent_documents,
                         disk_usage=disk_usage)

@app.route('/customer/edit', methods=['GET', 'POST'])
@role_required(ROLE_USER)
def edit_customer_info():
    """본인 고객사 정보 수정"""
    if not current_user.customer_id:
        flash('고객사 정보가 연결되지 않았습니다. 관리자에게 문의하세요.', 'warning')
        return redirect(url_for('dashboard'))

    customer = Customer.query.get(current_user.customer_id)

    if request.method == 'POST':
        customer.name = request.form.get('name')
        customer.company = request.form.get('company')
        customer.contact = request.form.get('contact')
        customer.email = request.form.get('email')
        customer.address = request.form.get('address')
        db.session.commit()
        flash('고객사 정보가 수정되었습니다.', 'success')
        return redirect(url_for('dashboard'))

    return render_template('user/edit_customer.html', customer=customer)

@app.route('/documents/upload', methods=['GET', 'POST'])
@role_required(ROLE_USER)
def upload_document():
    """점검서 업로드 - 기술팀만 가능"""
    # 기술팀이 아닌 경우 접근 차단
    if current_user.department != '기술팀':
        flash('점검서 업로드는 기술팀만 가능합니다.', 'danger')
        return redirect(url_for('dashboard'))
    
    # 담당 고객사 목록 가져오기
    customers = current_user.assigned_customers.all()
    
    if not customers:
        flash('담당 고객사가 없습니다. 관리자에게 문의하세요.', 'warning')
        return redirect(url_for('dashboard'))

    if request.method == 'POST':
        customer_id = request.form.get('customer_id')
        inspection_type = request.form.get('inspection_type')
        file = request.files.get('file')
        
        if not customer_id or not inspection_type or not file:
            flash('모든 필드를 입력해주세요.', 'danger')
            return render_template('user/upload_document.html', customers=customers)
        
        # 고객사 확인
        customer = Customer.query.get_or_404(customer_id)
        
        # 담당 고객사인지 확인
        if customer not in current_user.assigned_customers:
            flash('담당 고객사가 아닙니다.', 'danger')
            return redirect(url_for('dashboard'))
        
        # PDF 파일인지 확인
        if not file.filename.endswith('.pdf'):
            flash('PDF 파일만 업로드 가능합니다.', 'danger')
            return render_template('user/upload_document.html', customers=customers)
        
        # 파일명 생성: 점검 주기에 따른 형식
        current_date = datetime.now()
        cycle_type = customer.inspection_cycle_type
        
        if cycle_type == '매월':
            title = f"{current_date.month}월_{customer.name}_점검내역서"
        elif cycle_type == '분기':
            quarter = (current_date.month - 1) // 3 + 1
            title = f"{quarter}분기({current_date.month}월)_{customer.name}_점검내역서"
        elif cycle_type == '반기':
            half = 1 if current_date.month <= 6 else 2
            title = f"{half}분기({current_date.month}월)_{customer.name}_점검내역서"
        elif cycle_type == '연1회':
            title = f"{current_date.year}년_{customer.name}_점검내역서"
        else:
            title = f"{current_date.strftime('%Y%m%d')}_{customer.name}_점검내역서"
        
        # 파일 저장
        filename = f"{uuid.uuid4().hex}_{file.filename}"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        
        try:
            file.save(filepath)
            file_size = os.path.getsize(filepath)
            
            # 문서 레코드 생성
            document = Document(
                customer_id=customer.id,
                title=title,
                description=f"{inspection_type} 점검",
                filename=filename,
                filepath=filepath,
                file_size=file_size,
                uploaded_by=current_user.id,
                inspection_date=current_date.date(),
                inspection_type=inspection_type
            )
            
            # 고객사의 마지막 점검일 업데이트
            customer.last_inspection_date = current_date.date()
            
            db.session.add(document)
            db.session.commit()
            
            # 서비스 로그 생성
            create_service_log(
                user_id=current_user.id,
                log_type='정상',
                action='점검서 업로드',
                description=f'고객사: {customer.name}, 파일: {title}.pdf, 점검 유형: {inspection_type}'
            )
            
            flash('점검서가 성공적으로 업로드되었습니다.', 'success')
            return redirect(url_for('dashboard'))
            
        except Exception as e:
            db.session.rollback()
            if os.path.exists(filepath):
                os.remove(filepath)
            flash(f'파일 업로드 중 오류가 발생했습니다: {str(e)}', 'danger')
            return render_template('user/upload_document.html', customers=customers)

    return render_template('user/upload_document.html', customers=customers)

@app.route('/api/password-requirements')
@login_required
def get_password_requirements():
    """패스워드 요구사항 반환 (API)"""
    settings = get_system_settings()
    return jsonify({
        'min_length': settings.password_min_length,
        'max_length': settings.password_max_length,
        'require_uppercase': settings.password_require_uppercase,
        'require_special': settings.password_require_special,
        'require_number': settings.password_require_number
    })

@app.route('/api/change-password', methods=['POST'])
@login_required
def api_change_password():
    """패스워드 변경 API - JSON 응답 (메뉴에서 접근 시 사용)"""
    current_password = request.form.get('current_password')
    new_password = request.form.get('new_password')
    confirm_password = request.form.get('confirm_password')

    # 메뉴에서 접근하는 경우 항상 현재 패스워드 확인 필요
    # 1. 현재 비밀번호 입력 확인
    if not current_password:
        return jsonify({
            'success': False,
            'message': '현재 패스워드를 입력해주세요.'
        })
    
    # 2. 현재 비밀번호 확인
    if not current_user.check_password(current_password):
        return jsonify({
            'success': False,
            'message': '현재 패스워드가 올바르지 않습니다.'
        })

    # 3. 새 비밀번호 확인
    if new_password != confirm_password:
        return jsonify({
            'success': False,
            'message': '새 패스워드가 일치하지 않습니다.'
        })

    # 4. 현재 비밀번호와 동일한지 확인
    if current_password == new_password:
        return jsonify({
            'success': False,
            'message': '새 패스워드는 현재 패스워드와 달라야 합니다.'
        })

    # 5. 패스워드 복잡성 검증
    is_valid, message = validate_password(new_password)
    if not is_valid:
        return jsonify({
            'success': False,
            'message': message
        })

    # 6. 패스워드 변경
    current_user.set_password(new_password)
    db.session.commit()

    return jsonify({
        'success': True,
        'message': '패스워드가 변경되었습니다. 다시 로그인해주세요.'
    })

@app.route('/health')
def health():
    return {'status': 'healthy'}, 200

# 데이터베이스 초기화 및 기본 사용자 생성
def init_db():
    with app.app_context():
        db.create_all()

        # 기본 admin 계정 생성 (존재하지 않을 경우)
        # 이 계정은 최초 설정용이며, 새 슈퍼관리자 생성 후 비활성화됨
        if not User.query.filter_by(username='admin').first():
            default_admin = User(
                username='admin',
                name='기본 관리자',
                email='admin@system.local',
                role=ROLE_SUPER_ADMIN,
                is_active=True,
                is_first_login=True  # 최초 로그인 시 새 슈퍼관리자 생성 유도
            )
            default_admin.set_password('password1!')
            db.session.add(default_admin)
            db.session.commit()
            print("="*50)
            print("기본 관리자 계정이 생성되었습니다!")
            print("Username: admin")
            print("Password: password1!")
            print("⚠️  최초 로그인 후 새로운 슈퍼관리자 계정을 생성해주세요!")
            print("="*50)

# 에러 핸들러
@app.errorhandler(400)
def bad_request(error):
    """잘못된 요청"""
    app.logger.error(f'Bad Request: {request.url} - {error}')
    return render_template('errors/400.html'), 400

@app.errorhandler(403)
def forbidden(error):
    """권한 없음"""
    app.logger.warning(f'Forbidden Access: {request.url} - User: {current_user.username if current_user.is_authenticated else "Anonymous"}')
    return render_template('errors/403.html'), 403

@app.errorhandler(404)
def page_not_found(error):
    """페이지를 찾을 수 없음"""
    app.logger.warning(f'Page Not Found: {request.url}')
    return render_template('errors/404.html'), 404

@app.errorhandler(500)
def internal_server_error(error):
    """서버 내부 오류"""
    db.session.rollback()
    app.logger.error(f'Internal Server Error: {request.url}', exc_info=True)
    return render_template('errors/500.html'), 500

@app.errorhandler(503)
def service_unavailable(error):
    """서비스 이용 불가"""
    app.logger.error(f'Service Unavailable: {request.url} - {error}')
    return render_template('errors/503.html'), 503

@app.errorhandler(Exception)
def handle_exception(error):
    """처리되지 않은 모든 예외"""
    db.session.rollback()
    app.logger.error(f'Unhandled Exception: {request.url}', exc_info=True)
    # 개발 환경에서는 실제 에러를 표시하고, 운영 환경에서는 500 페이지 표시
    if app.debug:
        raise error
    return render_template('errors/500.html'), 500

if __name__ == '__main__':
    init_db()
    # 환경변수로 DEBUG 모드 제어 (기본값: False)
    debug_mode = os.environ.get('FLASK_DEBUG', 'False').lower() in ['true', '1', 'yes']
    app.run(host='0.0.0.0', port=5000, debug=debug_mode)
