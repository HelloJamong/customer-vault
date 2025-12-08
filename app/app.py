import os
import re
import uuid
from functools import wraps
from flask import Flask, render_template, redirect, url_for, flash, request, abort, session
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta

app = Flask(__name__)

# 설정
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key')
app.config['SQLALCHEMY_DATABASE_URI'] = f"mysql+pymysql://{os.environ.get('DB_USER')}:{os.environ.get('DB_PASSWORD')}@{os.environ.get('DB_HOST')}/{os.environ.get('DB_NAME')}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = '/app/uploads'
app.config['MAX_CONTENT_LENGTH'] = int(os.environ.get('MAX_UPLOAD_SIZE', 16777216))

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

# 데이터베이스 모델
class User(UserMixin, db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    role = db.Column(db.String(20), nullable=False, default=ROLE_USER)  # super_admin, admin, user
    is_active = db.Column(db.Boolean, default=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'), nullable=True)  # 일반 사용자만 연결

    # 계정 잠금 관련
    is_locked = db.Column(db.Boolean, default=False)
    locked_until = db.Column(db.DateTime, nullable=True)
    failed_login_attempts = db.Column(db.Integer, default=0)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    customer = db.relationship('Customer', backref='user', uselist=False)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

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

class Customer(db.Model):
    __tablename__ = 'customers'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    company = db.Column(db.String(200))
    contact = db.Column(db.String(100))
    email = db.Column(db.String(120))
    address = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    documents = db.relationship('Document', backref='customer', lazy=True, cascade='all, delete-orphan')

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

    uploader = db.relationship('User', backref='documents')

class SystemSettings(db.Model):
    __tablename__ = 'system_settings'
    id = db.Column(db.Integer, primary_key=True)

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
        return f'로그인 {settings.login_failure_limit}회 실패로 계정이 {settings.account_lock_minutes}분간 잠겼습니다.'

    db.session.commit()
    remaining = settings.login_failure_limit - user.failed_login_attempts
    return f'로그인 실패. {remaining}회 더 실패하면 계정이 잠깁니다.'

def reset_failed_login_attempts(user):
    """로그인 성공 시 실패 횟수 초기화"""
    user.failed_login_attempts = 0
    user.is_locked = False
    user.locked_until = None
    db.session.commit()

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
    if current_user.is_super_admin():
        return redirect(url_for('super_admin_dashboard'))
    elif current_user.is_admin():
        return redirect(url_for('admin_dashboard'))
    else:
        return redirect(url_for('user_dashboard'))

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

                # 세션 관리 (중복 로그인 방지 포함)
                manage_user_session(user.id)

                login_user(user)
                flash(f'환영합니다, {user.username}님!', 'success')

                # 권한별 리다이렉트
                next_page = request.args.get('next')
                if next_page:
                    return redirect(next_page)

                if user.is_super_admin():
                    return redirect(url_for('super_admin_dashboard'))
                elif user.is_admin():
                    return redirect(url_for('admin_dashboard'))
                else:  # 일반 사용자
                    return redirect(url_for('user_dashboard'))
            else:
                # 로그인 실패
                record_login_attempt(user.id, success=False)
                error_message = handle_failed_login(user)
                flash(error_message, 'danger')
        else:
            flash('아이디 또는 비밀번호가 올바르지 않습니다.', 'danger')

    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    # 세션 정리
    if 'session_id' in session:
        UserSession.query.filter_by(session_id=session['session_id']).delete()
        db.session.commit()

    logout_user()
    session.clear()
    flash('로그아웃되었습니다.', 'info')
    return redirect(url_for('login'))

# ========== 슈퍼 관리자 전용 페이지 ==========
@app.route('/super-admin/dashboard')
@super_admin_required
def super_admin_dashboard():
    """슈퍼 관리자 대시보드 - 모든 메뉴 접근 가능"""
    total_users = User.query.count()
    total_admins = User.query.filter_by(role=ROLE_ADMIN).count()
    total_normal_users = User.query.filter_by(role=ROLE_USER).count()
    total_customers = Customer.query.count()
    total_documents = Document.query.count()

    return render_template('super_admin/dashboard.html',
                         total_users=total_users,
                         total_admins=total_admins,
                         total_normal_users=total_normal_users,
                         total_customers=total_customers,
                         total_documents=total_documents)

@app.route('/super-admin/admins')
@super_admin_required
def manage_admins():
    """일반 관리자 목록 및 관리"""
    admins = User.query.filter_by(role=ROLE_ADMIN).all()
    return render_template('super_admin/admins.html', admins=admins)

@app.route('/super-admin/users')
@super_admin_required
def manage_users():
    """일반 사용자 목록 및 관리"""
    users = User.query.filter_by(role=ROLE_USER).all()
    return render_template('super_admin/users.html', users=users)

@app.route('/super-admin/customers')
@super_admin_required
def manage_customers():
    """고객사 목록 및 관리"""
    customers_list = Customer.query.all()
    return render_template('super_admin/customers.html', customers=customers_list)

@app.route('/super-admin/settings', methods=['GET', 'POST'])
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
        # 패스워드 복잡성 설정
        settings.password_min_length = int(request.form.get('password_min_length', 8))
        settings.password_max_length = int(request.form.get('password_max_length', 20))
        settings.password_require_uppercase = request.form.get('password_require_uppercase') == 'on'
        settings.password_require_special = request.form.get('password_require_special') == 'on'
        settings.password_require_number = request.form.get('password_require_number') == 'on'

        # 중복 로그인 설정
        settings.prevent_duplicate_login = request.form.get('prevent_duplicate_login') == 'on'

        # 세션 타임아웃 설정
        settings.session_timeout_enabled = request.form.get('session_timeout_enabled') == 'on'
        session_timeout = int(request.form.get('session_timeout_minutes', 30))
        settings.session_timeout_minutes = max(3, min(60, session_timeout))  # 3-60분 제한

        # 로그인 실패 설정
        login_limit = int(request.form.get('login_failure_limit', 5))
        settings.login_failure_limit = max(1, min(5, login_limit))  # 1-5회 제한

        lock_time = int(request.form.get('account_lock_minutes', 10))
        settings.account_lock_minutes = max(5, min(30, lock_time))  # 5-30분 제한

        settings.updated_by = current_user.id
        db.session.commit()

        flash('시스템 설정이 저장되었습니다.', 'success')
        return redirect(url_for('system_settings'))

    return render_template('super_admin/settings.html', settings=settings)

# ========== 일반 관리자 전용 페이지 ==========
@app.route('/admin/dashboard')
@admin_required
def admin_dashboard():
    """일반 관리자 대시보드 - 일반 사용자 관리, 패스워드 초기화, 서비스 로그 확인"""
    total_users = User.query.filter_by(role=ROLE_USER).count()
    total_customers = Customer.query.count()
    total_documents = Document.query.count()
    active_users = User.query.filter_by(role=ROLE_USER, is_active=True).count()

    return render_template('admin/dashboard.html',
                         total_users=total_users,
                         total_customers=total_customers,
                         total_documents=total_documents,
                         active_users=active_users)

@app.route('/admin/users')
@admin_required
def admin_manage_users():
    """일반 사용자 계정 생성 및 관리"""
    users = User.query.filter_by(role=ROLE_USER).all()
    return render_template('admin/users.html', users=users)

@app.route('/admin/logs')
@admin_required
def admin_service_logs():
    """서비스 로그 확인"""
    # TODO: 로그 시스템 구현
    return render_template('admin/logs.html')

# ========== 일반 사용자 전용 페이지 ==========
@app.route('/user/dashboard')
@role_required(ROLE_USER)
def user_dashboard():
    """일반 사용자 대시보드 - 본인 고객사 정보 및 점검서 관리"""
    if not current_user.customer_id:
        flash('고객사 정보가 연결되지 않았습니다. 관리자에게 문의하세요.', 'warning')
        return render_template('user/no_customer.html')

    customer = Customer.query.get(current_user.customer_id)
    documents = Document.query.filter_by(customer_id=current_user.customer_id).all()

    return render_template('user/dashboard.html',
                         customer=customer,
                         documents=documents)

@app.route('/user/customer/edit', methods=['GET', 'POST'])
@role_required(ROLE_USER)
def edit_customer_info():
    """본인 고객사 정보 수정"""
    if not current_user.customer_id:
        flash('고객사 정보가 연결되지 않았습니다. 관리자에게 문의하세요.', 'warning')
        return redirect(url_for('user_dashboard'))

    customer = Customer.query.get(current_user.customer_id)

    if request.method == 'POST':
        customer.name = request.form.get('name')
        customer.company = request.form.get('company')
        customer.contact = request.form.get('contact')
        customer.email = request.form.get('email')
        customer.address = request.form.get('address')
        db.session.commit()
        flash('고객사 정보가 수정되었습니다.', 'success')
        return redirect(url_for('user_dashboard'))

    return render_template('user/edit_customer.html', customer=customer)

@app.route('/user/documents/upload', methods=['GET', 'POST'])
@role_required(ROLE_USER)
def upload_document():
    """점검서 업로드"""
    if not current_user.customer_id:
        flash('고객사 정보가 연결되지 않았습니다. 관리자에게 문의하세요.', 'warning')
        return redirect(url_for('user_dashboard'))

    if request.method == 'POST':
        # TODO: 파일 업로드 로직 구현
        flash('점검서가 업로드되었습니다.', 'success')
        return redirect(url_for('user_dashboard'))

    return render_template('user/upload_document.html')

@app.route('/health')
def health():
    return {'status': 'healthy'}, 200

# 데이터베이스 초기화 및 기본 사용자 생성
def init_db():
    with app.app_context():
        db.create_all()

        # 슈퍼 관리자 계정 생성 (존재하지 않을 경우)
        if not User.query.filter_by(username='vmadm').first():
            super_admin = User(
                username='vmadm',
                email='vmadm@example.com',
                role=ROLE_SUPER_ADMIN,
                is_active=True
            )
            super_admin.set_password('vmadm!2024')  # 운영 환경에서는 반드시 변경 필요!
            db.session.add(super_admin)
            db.session.commit()
            print("="*50)
            print("슈퍼 관리자 계정이 생성되었습니다!")
            print("Username: vmadm")
            print("Password: vmadm!2024")
            print("⚠️  운영 환경에서는 반드시 비밀번호를 변경하세요!")
            print("="*50)

if __name__ == '__main__':
    init_db()
    app.run(host='0.0.0.0', port=5000, debug=True)
