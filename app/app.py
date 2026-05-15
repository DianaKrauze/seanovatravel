from flask import Flask, render_template, redirect, url_for, request, flash, abort, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from flask_socketio import SocketIO, emit, join_room
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
import re
import os
from werkzeug.utils import secure_filename
from sqlalchemy import func
import pandas as pd
import io
from flask import send_file
import pdfkit
import platform

# Ініціалізація Flask додатка
app = Flask(__name__)

# Конфігурація бази даних PostgreSQL та секретний ключ для захисту сесій
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'postgresql://postgres:Diana260505@localhost:5432/seanova_db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'a32b57CO2H2OALL' 

# Ініціалізація інструментів для роботи з базою даних та веб-сокетами для чату
db = SQLAlchemy(app)
socketio = SocketIO(app)

# Налаштування менеджера авторизації користувачів
login_manager = LoginManager(app)
## Встановлення маршруту для перенаправлення неавторизованих відвідувачів
login_manager.login_view = 'register'
login_manager.login_message = "Будь ласка, зареєструйтеся або увійдіть, щоб отримати доступ до цієї сторінки."

# Визначення базового шляху проекту для коректної роботи з файловою системою
BASE_DIR = os.path.abspath(os.path.dirname(__file__))

# Налаштування папок та форматів для завантаження зображень турів та файлів у чаті
app.config['UPLOAD_FOLDER_TOURS'] = os.path.join(BASE_DIR, 'static', 'uploads', 'tours')
ALLOWED_EXTENSIONS_TOURS = {'png', 'jpg', 'jpeg', 'gif'}


app.config['UPLOAD_FOLDER_CHAT'] = os.path.join(BASE_DIR, 'static', 'uploads', 'chat')
ALLOWED_EXTENSIONS_CHAT = {'png', 'jpg', 'jpeg', 'gif', 'pdf', 'docx', 'txt'}

# Автоматичне створення необхідних директорій, якщо вони відсутні
os.makedirs(app.config['UPLOAD_FOLDER_TOURS'], exist_ok=True)
os.makedirs(app.config['UPLOAD_FOLDER_CHAT'], exist_ok=True)

# Конфігурація утиліти для генерації PDF-ваучерів
if platform.system() == 'Windows':
    path_to_wkhtmltopdf = r'C:\Program Files\wkhtmltopdf\bin\wkhtmltopdf.exe'
    config = pdfkit.configuration(wkhtmltopdf=path_to_wkhtmltopdf)
else:
    config = pdfkit.configuration(wkhtmltopdf='/usr/bin/wkhtmltopdf')

# Функції-фільтри для перевірки розширень завантажуваних файлів
def allowed_file_tour(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS_TOURS

def allowed_file_chat(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS_CHAT

# Користувачі системи (клієнти та менеджери)
class User(db.Model, UserMixin):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    nickname = db.Column(db.String(50))
    role = db.Column(db.String(20), default='user')
    is_online = db.Column(db.Boolean, default=False)
    # Зв'язки для доступу до повідомлень користувача
    sent_messages = db.relationship('Message', foreign_keys='Message.sender_id', back_populates='sender', cascade="all, delete-orphan")
    received_messages = db.relationship('Message', foreign_keys='Message.receiver_id', back_populates='receiver', cascade="all, delete-orphan")
    bookings = db.relationship('Booking', back_populates='user', cascade="all, delete-orphan")
    reviews = db.relationship('Review', back_populates='user', cascade="all, delete-orphan")
    wishlist_items = db.relationship('Wishlist', backref='user', cascade="all, delete-orphan")

# Повідомлення внутрішнього чату підтримки
class Message(db.Model):
    __tablename__ = 'messages'
    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    receiver_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    text = db.Column(db.Text, nullable=True)
    file_path = db.Column(db.String(255), nullable=True)
    timestamp = db.Column(db.DateTime, default=datetime.now)

    # Зв'язки для зручного доступу 
    sender = db.relationship('User', foreign_keys=[sender_id], back_populates='sent_messages', overlaps="sent_messages")
    receiver = db.relationship('User', foreign_keys=[receiver_id], back_populates='received_messages', overlaps="received_messages")

# Інформація про туристичні пропозиції
class Tour(db.Model):
    __tablename__ = 'tours'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    country = db.Column(db.String(100), nullable=False)
    city = db.Column(db.String(100)) 
    departure_date = db.Column(db.Date, nullable=False)
    duration = db.Column(db.Integer, nullable=False) 
    stars = db.Column(db.Integer, default=3)
    meal_type = db.Column(db.String(50)) 
    transport_type = db.Column(db.String(50), default='none')
    price = db.Column(db.Float, nullable=False)
    description = db.Column(db.Text)
    image_filename = db.Column(db.String(255)) 
    room_type = db.Column(db.String(100), default='Standard')
    has_insurance = db.Column(db.Boolean, default=True)
    has_transfer = db.Column(db.Boolean, default=True)
    has_visa = db.Column(db.Boolean, default=False)

# Список бажаних турів 
class Wishlist(db.Model):
    __tablename__ = 'wishlist'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    tour_id = db.Column(db.Integer, db.ForeignKey('tours.id'), nullable=False)
    tour = db.relationship('Tour', backref='wishlisted_by')

# Бронювання турів користувачами
class Booking(db.Model):
    __tablename__ = 'bookings'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    tour_id = db.Column(db.Integer, db.ForeignKey('tours.id'), nullable=False)
    full_name = db.Column(db.String(255), nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    people_count = db.Column(db.Integer, default=1)
    comment = db.Column(db.Text)
    total_price = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(50), default='Очікує підтвердження')
    timestamp = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = db.relationship('User', back_populates='bookings')
    tour = db.relationship('Tour', backref='bookings')

# Відгуки клієнтів про поїздки
class Review(db.Model):
    __tablename__ = 'reviews' 
    id = db.Column(db.Integer, primary_key=True)
    rating = db.Column(db.Integer, nullable=False)
    text = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    tour_id = db.Column(db.Integer, db.ForeignKey('tours.id'), nullable=False)
    
    user = db.relationship('User', back_populates='reviews')
    tour = db.relationship('Tour', backref=db.backref('reviews', lazy=True))

    def __repr__(self):
        return f'<Review {self.id} by User {self.user_id}>'

# Допоміжні функції для форматування даних у шаблонах
@login_manager.user_loader
def load_user(user_id):
    return db.session.get(User, int(user_id)) 

def format_ua_date(date_obj):
    # Локалізація дат для українського інтерфейсу
    if not date_obj:
        return "Дата уточнюється"
    
    months_ua = {
        1: "січня", 2: "лютого", 3: "березня", 4: "квітня",
        5: "травня", 6: "червня", 7: "липня", 8: "серпня",
        9: "вересня", 10: "жовтня", 11: "листопада", 12: "грудня"
    }
    day = date_obj.day
    month = months_ua.get(date_obj.month)
    return f"{day} {month}"

def format_nights(n):
    # Відмінювання слова "ніч" залежно від числа
    try:
        n = int(n)
    except:
        return f"{n} ночей"
        
    if 11 <= n % 100 <= 14:
        return f"{n} ночей"
    if n % 10 == 1:
        return f"{n} ніч"
    if 2 <= n % 10 <= 4:
        return f"{n} ночі"
    return f"{n} ночей"

# Реєстрація функцій у глобальному просторі шаблонізатора Jinja2
app.jinja_env.globals.update(format_ua_date=format_ua_date, format_nights=format_nights)

# Головна сторінка
@app.route('/')
def home():
    return render_template('index.html')

# Маршрутизатор для реєстрації нових користувачів
@app.route('/register', methods=['GET', 'POST'])
def register():
    # Реєстрація з валідацією пошти, пароля та перевіркою на дублікати
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password') 
        
       # Перевірка формату електронної пошти за допомогою регулярного виразу
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, email):
            flash('Некоректна пошта!', 'danger')
            return render_template('register.html', email=email) 
        
        # Валідація довжини пароля
        if len(password) < 8:
            flash('Пароль повинен містити від 8 символів!', 'danger')
            return render_template('register.html', email=email) 
            
        # Перевірка ідентичності паролів
        if password != confirm_password:
            flash('Паролі не збігаються!', 'danger')
            return render_template('register.html', email=email)

        # Перевірка наявності користувача в базі
        user_exists = User.query.filter_by(email=email).first()
        if user_exists:
            flash('Ця пошта вже зареєстрована!', 'warning')
            return render_template('register.html', email=email)

        # Хешування пароля та збереження нового запису в БД
        hashed_pw = generate_password_hash(password, method='pbkdf2:sha256')
        new_user = User(email=email, password=hashed_pw, nickname=email)
        db.session.add(new_user)
        db.session.commit()
        
        # Автоматичний вхід після успішної реєстрації
        login_user(new_user)
        return redirect(url_for('home'))
        
    return render_template('register.html')

# Маршрутизатор для авторизації користувачів
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        
        user = User.query.filter_by(email=email).first()
        
        # Перевірка існування користувача та коректності пароля
        if not user:
            flash('Користувача з такою поштою не знайдено!', 'danger')
            return render_template('login.html', email=email) 
        
        if len(password) < 8:
            flash('Пароль повинен містити від 8 символів!', 'danger')
            return render_template('login.html', email=email) 

        if check_password_hash(user.password, password):
            login_user(user)
            # Якщо заходить адмін(менеджер) — направляємо в панель керування
            if user.role == 'admin':
                return redirect(url_for('admin_panel'))
            # Якщо звичайний користувач — на головну
            return redirect(url_for('home'))
        else:
            flash('Невірний пароль!', 'danger')
            return render_template('login.html', email=email) 
            
    return render_template('login.html')

# Маршрутизатор для завершення сеансу (вихід)
@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('home'))

# Маршрутизатор для переходу в особистий кабінет
@app.route('/profile')
@login_required
def profile():
    return render_template('profile.html')

# Маршрутизатор для скасування замовлення користувачем
@app.route('/cancel_booking/<int:booking_id>', methods=['POST'])
@login_required
def cancel_booking(booking_id):
    booking = Booking.query.get_or_404(booking_id)
    
    if booking.user_id != current_user.id:
        flash('Доступ заборонено!', 'danger')
        return redirect(url_for('profile'))
    
    # Змінення статусу на "Скасовано"
    booking.status = 'Скасовано'
    db.session.commit()
    
    flash(f'Замовлення №{booking_id} скасовано.', 'success')
    return redirect(url_for('profile'))

#Маршрутизатор для повного видалення скасованих замовлень з історії профілю
@app.route('/delete_booking/<int:booking_id>', methods=['POST'])
@login_required
def delete_booking(booking_id):
    booking = Booking.query.get_or_404(booking_id)
    
    if booking.user_id != current_user.id:
        flash('Доступ заборонено!', 'danger')
        return redirect(url_for('profile'))

    # Дозволення видалення лише тих, що вже мають статус скасування
    if booking.status in ['Скасовано', 'Скасовано менеджером']:
        db.session.delete(booking)
        db.session.commit()
        flash(f'Замовлення №{booking_id} видалено з історії.', 'success')
    else:
        flash('Неможливо видалити активне замовлення.', 'warning')
        
    return redirect(url_for('profile'))

# Маршрутизатор для оновлення статусу замовлення
@app.route('/booking/update_to_pay/<int:booking_id>', methods=['POST'])
@login_required
def update_to_pay(booking_id):
    booking = Booking.query.get_or_404(booking_id)
    
    if booking.user_id == current_user.id and booking.status == 'Підтверджено':
        booking.status = 'Очікує оплати'
        db.session.commit()
        return {'status': 'success'}, 200
    
    return {'status': 'error'}, 403

# Маршрутизатор для зміни статусу замовлення на "Оплачено"
@app.route('/pay_booking/<int:booking_id>', methods=['GET', 'POST']) 
@login_required
def pay_booking(booking_id):
    booking = Booking.query.get_or_404(booking_id)
    
    if booking.user_id != current_user.id:
        if request.headers.get('Content-Type') == 'application/json':
            return {'status': 'error', 'message': 'Forbidden'}, 403
        flash('Доступ заборонено!', 'danger')
        return redirect(url_for('profile'))
    
    # Змінення статусу
    booking.status = 'Оплачено'
    db.session.commit()
    
    # Якщо запит прийшов від JavaScript (fetch)
    if request.method == 'POST':
        return {'status': 'success'}, 200
        
    # Якщо запит прийшов через звичайне посилання 
    flash('Тур успішно оплачено! Тепер ви можете завантажити ваучер.', 'success')
    return redirect(url_for('profile'))

# Генерація PDF-ваучера на основі HTML-шаблону для оплачених турів
@app.route('/download_voucher/<int:booking_id>')
@login_required
def download_voucher(booking_id):
    booking = Booking.query.get_or_404(booking_id)
    
    css_path = os.path.join(app.root_path, 'static', 'css', 'voucher_pdf.css')

    html = render_template('voucher_pdf.html', booking=booking, timedelta=timedelta)
    
    options = {
        'encoding': "UTF-8",
        'page-size': 'A4',
        'margin-top': '10mm',
        'margin-right': '10mm',
        'margin-bottom': '10mm',
        'margin-left': '10mm',
    }
    
    try:
        
        pdf = pdfkit.from_string(html, False, configuration=config, options=options, css=css_path)
        
        return send_file(
            io.BytesIO(pdf),
            mimetype='application/pdf',
            as_attachment=True,
            download_name=f'Voucher_SeaNova_{booking.id}.pdf'
        )
    except Exception as e:
        return f"Помилка: {str(e)}", 500

# Зміна публічного імені користувача в профілі
@app.route('/update_nickname', methods=['POST'])
@login_required
def update_nickname():
    new_nickname = request.form.get('new_nickname')
    if new_nickname:
        current_user.nickname = new_nickname
        db.session.commit()
        flash('Нікнейм успішно оновлено!', 'success')
    return redirect(url_for('profile'))

# Зміна публічного імені менеджера в хедері
@app.route('/update_nickname_admin', methods=['POST'])
@login_required
def update_nickname_admin():
    new_nickname = request.form.get('new_nickname')
    if new_nickname and current_user.role == 'admin':
        current_user.nickname = new_nickname
        db.session.commit()
        flash('Нікнейм успішно оновлено!', 'success')
    
    # Якщо попередню сторінку не знайдено, повернення на дашборд за замовчуванням
    return redirect(request.referrer or url_for('admin_panel'))

# Відображення списку турів, які користувач додав у "Обране"
@app.route('/wishlist')
@login_required
def wishlist():
    # Отримання всіх записів з таблиці wishlist для цього користувача
    user_wishlist = Wishlist.query.filter_by(user_id=current_user.id).all()
    # Витягнення самих об'єктів турів
    tours = [item.tour for item in user_wishlist]
    return render_template('wishlist.html', tours=tours)

# Додавання або видалення туру з обраного 
@app.route('/toggle_wishlist/<int:tour_id>', methods=['POST'])
@login_required
def toggle_wishlist(tour_id):
    # Пошук, чи вже є цей тур в обраному у поточного користувача
    wish_item = Wishlist.query.filter_by(user_id=current_user.id, tour_id=tour_id).first()
    
    if wish_item:
        # Якщо є — видаляється тур
        db.session.delete(wish_item)
        db.session.commit()
        return jsonify({'status': 'removed'})
    else:
        # Якщо немає - додається 
        new_wish = Wishlist(user_id=current_user.id, tour_id=tour_id)
        db.session.add(new_wish)
        db.session.commit()
        return jsonify({'status': 'added'})

# Маршрутизатор для чату з менеджерами
@app.route('/chat')
@login_required
def chat():
    # Отримання всіх менеджерів для списку зліва
    managers = User.query.filter_by(role='admin').all()
    return render_template('chat.html', managers=managers)

# Відображення відгуків користувача та списку турів, доступних для оцінювання
@app.route('/reviews')
@login_required
def reviews():
    user_reviews = Review.query.filter_by(user_id=current_user.id).all()
    # Отримання ID турів, на яких вже є відгуки
    reviewed_tour_ids = [r.tour_id for r in user_reviews]
    
    paid_bookings = Booking.query.filter_by(user_id=current_user.id, status='Оплачено').all()
    
    paid_tours = []
    seen_ids = set()
    for booking in paid_bookings:
        # Додавання туру у список для вибору тільки якщо на нього ще немає відгуку
        if booking.tour_id not in seen_ids and booking.tour_id not in reviewed_tour_ids:
            paid_tours.append(booking.tour)
            seen_ids.add(booking.tour_id)
            
    return render_template('reviews.html', reviews=user_reviews, tours=paid_tours)

# Редагування та збереження нового відгуку про тур
@app.route('/edit_review/<int:review_id>', methods=['POST'])
@login_required
def edit_review(review_id):
    review = Review.query.get_or_404(review_id)
    if review.user_id != current_user.id:
        return "Access denied", 403
        
    review.rating = int(request.form.get('rating'))
    review.text = request.form.get('review_text')
    db.session.commit()
    flash('Відгук оновлено!', 'success')
    return redirect(url_for('reviews'))

# Маршрутизатор для відправки відгуку
@app.route('/submit_review', methods=['POST'])
@login_required
def submit_review():
    tour_id = request.form.get('tour_id')
    rating = request.form.get('rating') 
    review_text = request.form.get('review_text')
    
    if not tour_id or not rating or not review_text:
        flash('Будь ласка, заповніть всі поля!', 'warning')
        return redirect(url_for('reviews'))
        
    new_review = Review(
        rating=int(rating),
        text=review_text,
        user_id=current_user.id,
        tour_id=int(tour_id)
    )
    
    db.session.add(new_review)
    db.session.commit()
    
    flash('Дякуємо! Ваш відгук опубліковано.', 'success')
    return redirect(url_for('reviews'))

# Політика конфіденційності
@app.route('/privacy')
def privacy_policy():
    return render_template('privacy.html')

# Правила та умови використання
@app.route('/terms')
def terms():
    return render_template('terms.html')

# Про компанію
@app.route('/about')
def about():
    return render_template('about.html')

# Контактна інформація
@app.route('/contacts')
def contacts():
    return render_template('contacts.html')

# Каталог турів
@app.route('/tours')
def tours():
    return render_template('tours.html')

# Детальна сторінка туру з перевіркою статусу в списку бажань
@app.route('/tour/<int:tour_id>')
def tour_details(tour_id):
    # Пошук туру в базі
    tour = Tour.query.get_or_404(tour_id)
    is_wishlisted = False
    
    # Якщо користувач залогінений, система перевіряє його список бажань
    if current_user.is_authenticated:
        # Пошук запису саме для цього користувача і саме для цього туру
        wish_item = Wishlist.query.filter_by(user_id=current_user.id, tour_id=tour.id).first()
        if wish_item:
            is_wishlisted = True
    
    return render_template('tour_details.html', tour=tour, is_wishlisted=is_wishlisted)

# маршрут для пошуку та фільтрації турів
@app.route('/search')
def search_tours():
    selected_country = request.args.get('country', '')
    selected_cities = request.args.getlist('city')
    selected_stars = request.args.getlist('stars')
    selected_meals = request.args.getlist('meal')
    selected_trans = request.args.getlist('transport')
    date_from = request.args.get('date_from')
    date_to = request.args.get('date_to')
    duration = request.args.get('duration')
    price_min = request.args.get('price_min')
    price_max = request.args.get('price_max')

    # отримання унікальних країн та міст для фільтрів
    all_countries = [t.country for t in Tour.query.with_entities(Tour.country).distinct().all()]
    available_cities = []
    if selected_country:
        available_cities = [t.city for t in Tour.query.with_entities(Tour.city).filter_by(country=selected_country).distinct().all()]

    # фільтрація запиту до бази даних
    query = Tour.query
    if selected_country:
        query = query.filter(Tour.country == selected_country)
    if selected_cities and 'all' not in selected_cities:
        query = query.filter(Tour.city.in_(selected_cities))
    if selected_stars:
        query = query.filter(Tour.stars.in_([int(s) for s in selected_stars]))
    if selected_meals:
        query = query.filter(Tour.meal_type.in_(selected_meals))
    if selected_trans:
        query = query.filter(Tour.transport_type.in_(selected_trans))
    if date_from:
        query = query.filter(Tour.departure_date >= date_from)
    if date_to:
        query = query.filter(Tour.departure_date <= date_to)
    if duration and duration.strip() != "":
        query = query.filter(Tour.duration == int(duration))
    if price_min:
        query = query.filter(Tour.price >= float(price_min))
    if price_max:
        query = query.filter(Tour.price <= float(price_max))

    tours = query.all()

    # список id турів в обраному для поточного користувача
    user_wish_ids = []
    if current_user.is_authenticated:
        user_wish_ids = [w.tour_id for w in Wishlist.query.filter_by(user_id=current_user.id).all()]
    

    return render_template(
        'search_results.html', 
        tours=tours, 
        all_countries=all_countries,
        available_cities=available_cities,
        selected_country=selected_country,
        selected_cities=selected_cities,
        selected_stars=selected_stars,
        selected_meals=selected_meals,
        selected_trans=selected_trans,
        user_wish_ids=user_wish_ids  
    )

# маршрут для бронювання туру
@app.route('/book_tour/<int:tour_id>', methods=['GET', 'POST'])
@login_required
def book_tour(tour_id):
    # Отримання туру з бази даних
    tour = db.session.get(Tour, tour_id)
    if not tour:
        abort(404)
    
    if request.method == 'POST':
        #Збирання даних з форми
        full_name = request.form.get('full_name')
        phone = request.form.get('phone')
        try:
            people_count = int(request.form.get('people_count', 1))
        except ValueError:
            people_count = 1
        
        comment = request.form.get('comment')
        
        # Розрахунок ціни 
        final_price = tour.price * people_count
        
        # створення запису бронювання
        new_booking = Booking(
            user_id=current_user.id,
            tour_id=tour.id,
            full_name=full_name,
            phone=phone,
            people_count=people_count,
            comment=comment,
            total_price=final_price
        )
        
        try:
            db.session.add(new_booking)
            db.session.commit()
            flash('Бронювання успішно створено! Менеджер скоро напише вам.', 'success')
            return redirect(url_for('profile')) 
        except Exception as e:
            db.session.rollback()
            print(f"Помилка при збереженні бронювання: {e}")
            flash('Сталася помилка. Спробуйте ще раз.', 'danger')
            
    return render_template('booking.html', tour=tour)

# Маршрут для перегляду всіх відгуків
@app.route('/all_reviews')
def all_reviews():
    # Отримання ID туру з параметрів запиту (якщо користувач щось обрав)
    selected_tour_id = request.args.get('tour_id', type=int)

    # Формування основного запиту до бази
    query = Review.query

    # Якщо обрано фільтр - система фільтрує, інакше — береться все
    if selected_tour_id:
        reviews = query.filter_by(tour_id=selected_tour_id).order_by(Review.timestamp.desc()).all()
    else:
        reviews = query.order_by(Review.timestamp.desc()).all()

    # Отримання списку унікальних турів, на які вже є відгуки (для випадаючого списку)
    reviewed_tours = db.session.query(Tour).join(Review).distinct().all()

    return render_template('all_reviews.html', reviews=reviews, reviewed_tours=reviewed_tours, selected_tour_id=selected_tour_id)

# Головна сторінка панелі керування
@app.route('/admin') 
@login_required
def admin_panel():
    if current_user.role != 'admin':
        abort(403) 
    
    new_bookings_count = Booking.query.filter_by(status='Очікує підтвердження').count()
    pending_orders_count = Booking.query.filter_by(status='Очікує оплати').count()
    total_clients_count = User.query.filter_by(role='user').count()

    # Статистика для діаграми
    destination_stats = db.session.query(
        Tour.country, func.count(Booking.id)
    ).join(Booking).group_by(Tour.country).all()

    # Перетворення в формат, зручний для JavaScript
    labels = [row[0] for row in destination_stats]
    data = [row[1] for row in destination_stats]

    return render_template('admin.html', new_bookings=new_bookings_count,pending_orders=pending_orders_count,total_clients=total_clients_count,labels=labels,data=data)

# Управління списком турів в панелі
@app.route('/admin/tours')
@login_required
def admin_tours():
    if current_user.role != 'admin': abort(403)
    all_tours = Tour.query.order_by(Tour.id.desc()).all()
    return render_template('admin_tours.html', tours=all_tours)

# Додавання або редагування туру
@app.route('/admin/add_tour', methods=['POST'])
@login_required
def add_tour():
    if current_user.role != 'admin': abort(403)
    
    tour_id = request.form.get('tour_id')
    
    if tour_id:
        tour = db.session.get(Tour, tour_id) 
        message = 'Тур успішно оновлено!'
    else:
        tour = Tour() 
        message = 'Тур успішно додано!'

    # Обробка фото
    file = request.files.get('tour_image')
    if file and allowed_file_tour(file.filename):
        # Створюємо унікальне ім'я файлу (додаємо час завантаження)
        ext = file.filename.rsplit('.', 1)[1].lower()
        new_filename = f"{int(datetime.now().timestamp())}_{secure_filename(file.filename)}"
        
        file_path = os.path.join(app.config['UPLOAD_FOLDER_TOURS'], new_filename)
        file.save(file_path)
        
        # Видалення старого файлу туру, тільки якщо він існував
        if tour.image_filename:
            old_path = os.path.join(app.config['UPLOAD_FOLDER_TOURS'], tour.image_filename)
            if os.path.exists(old_path):
                try:
                    os.remove(old_path)
                except:
                    pass
        
        tour.image_filename = new_filename
    
    # Заповнення даних
    tour.title = request.form.get('title')
    tour.country = request.form.get('country')
    tour.city = request.form.get('city')
    tour.departure_date = datetime.strptime(request.form.get('departure_date'), '%Y-%m-%d').date()
    tour.duration = int(request.form.get('duration'))
    tour.stars = int(request.form.get('stars'))
    tour.meal_type = request.form.get('meal_type')
    tour.transport_type = request.form.get('transport_type')
    tour.price = float(request.form.get('price'))
    tour.description = request.form.get('description')
    tour.room_type = request.form.get('room_type', 'Standard')
    tour.has_insurance = 'has_insurance' in request.form
    tour.has_transfer = 'has_transfer' in request.form
    tour.has_visa = 'has_visa' in request.form

    if not tour_id:
        db.session.add(tour)
    
    db.session.commit()
    flash(message, 'success')
    return redirect(url_for('admin_tours'))

# Видалення туру
@app.route('/admin/delete_tour/<int:tour_id>', methods=['POST'])
@login_required
def delete_tour(tour_id):
    if current_user.role != 'admin': 
        abort(403)
    
    tour = db.session.get(Tour, tour_id)
    if not tour:
        abort(404)
    
    if tour.image_filename:
        file_path = os.path.join(app.config['UPLOAD_FOLDER_TOURS'], tour.image_filename)
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception as e:
                print(f"Error deleting file: {e}")
            
    db.session.delete(tour)
    db.session.commit()
    flash('Тур видалено!', 'success')
    return redirect(url_for('admin_tours'))

# Отримання даних туру в json
@app.route('/admin/get_tour/<int:tour_id>')
@login_required
def get_tour(tour_id):
    if current_user.role != 'admin': 
        abort(403)
    
    tour = db.session.get(Tour, tour_id)
    if not tour:
        return jsonify({'error': 'Tour not found'}), 404

    return jsonify({
        'id': tour.id,
        'title': tour.title,
        'country': tour.country,
        'city': tour.city,
        'price': tour.price,
        'stars': tour.stars,
        'meal_type': tour.meal_type,
        'transport_type': tour.transport_type,
        'duration': tour.duration,
        'description': tour.description,
        'departure_date': tour.departure_date.strftime('%Y-%m-%d'),
        'room_type': tour.room_type,
        'has_insurance': tour.has_insurance,
        'has_transfer': tour.has_transfer,
        'has_visa': tour.has_visa,
        'image_url': url_for('static', filename='uploads/tours/' + tour.image_filename) if tour.image_filename else None
    })

# Перегляд списку бронювань для менеджера
@app.route('/admin/bookings')
@login_required
def admin_bookings():
    if current_user.role != 'admin':
        abort(403)
    # Отримання всі бронювань, сортування від нових до старих
    all_bookings = Booking.query.order_by(Booking.timestamp.desc()).all()
    return render_template('admin_bookings.html', bookings=all_bookings)

# Оновлення статусу замовлення
@app.route('/admin/update_booking_status/<int:booking_id>', methods=['POST'])
@login_required
def update_booking_status(booking_id):
    if current_user.role != 'admin':
        abort(403)
    
    booking = Booking.query.get_or_404(booking_id)
    
    # Додаткова перевірка на бекенді для безпеки
    if booking.status == 'Оплачено':
        flash(f'Помилка: статус оплаченого замовлення №{booking_id} не можна змінювати.', 'error')
        return redirect(url_for('admin_bookings'))

    new_status = request.form.get('status')
    
    if new_status:
        booking.status = new_status
        db.session.commit()
        flash(f'Статус замовлення №{booking_id} оновлено на "{new_status}"', 'success')
    
    return redirect(url_for('admin_bookings'))

# Видалення бронювання
@app.route('/admin/delete_booking/<int:booking_id>', methods=['POST'])
@login_required
def admin_delete_booking(booking_id):
    if current_user.role != 'admin':
        abort(403)
    
    booking = Booking.query.get_or_404(booking_id)
    
    try:
        db.session.delete(booking)
        db.session.commit()
        flash(f'Замовлення №{booking_id} успішно видалено з системи.', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'Помилка при видаленні: {str(e)}', 'error')
        
    return redirect(url_for('admin_bookings'))

# Список користувачів для менеджера
@app.route('/admin/users')
@login_required
def admin_users():
    if current_user.role != 'admin':
        abort(403)
    # Отримання всіх користувачів з БД
    users_list = User.query.all() 
    return render_template('admin_users.html', users=users_list)

# Додавання нового користувача
@app.route('/admin/add_user', methods=['POST'])
@login_required
def add_user():
    if current_user.role != 'admin':
        abort(403)
    
    email = request.form.get('email')
    password = request.form.get('password')
    nickname = request.form.get('nickname')
    role = request.form.get('role')

    # Перевірка чи не зайнята пошта
    if User.query.filter_by(email=email).first():
        flash('Ця пошта вже зареєстрована!', 'danger')
        return redirect(url_for('admin_users'))

    hashed_pw = generate_password_hash(password, method='pbkdf2:sha256')
    new_user = User(email=email, password=hashed_pw, nickname=nickname, role=role)
    
    db.session.add(new_user)
    db.session.commit()
    flash('Користувача успішно додано!', 'success')
    return redirect(url_for('admin_users'))

# Редагування ролі користувача
@app.route('/admin/edit_user/<int:user_id>', methods=['POST'])
@login_required
def edit_user(user_id):
    if current_user.role != 'admin':
        abort(403)
        
    user = User.query.get_or_404(user_id)
    
    new_role = request.form.get('role')
    if new_role in ['user', 'admin']: 
        user.role = new_role
    
    try:
        db.session.commit()
        flash(f'Роль користувача {user.email} успішно змінено!', 'success')
    except Exception as e:
        db.session.rollback()
        flash('Виникла помилка при оновленні бази даних.', 'danger')

    return redirect(url_for('admin_users'))

# Видалення користувача
@app.route('/admin/delete_user/<int:user_id>', methods=['POST'])
@login_required
def delete_user(user_id):
    if current_user.role != 'admin':
        abort(403)
        
    user = User.query.get_or_404(user_id)
    
    # Захист від видалення самого себе
    if user.id == current_user.id:
        flash('Ви не можете видалити власний акаунт!', 'danger')
    else:
        db.session.delete(user)
        db.session.commit()
        flash('Користувача видалено!', 'success')
        
    return redirect(url_for('admin_users'))

# Відгуки в панелі керування
@app.route('/admin/reviews')
@login_required
def admin_reviews():
    if current_user.role != 'admin':
        abort(403)
    
    # Додавання отримання всіх відгуків з бази даних
    reviews = Review.query.order_by(Review.timestamp.desc()).all()
    
    # Передача списку reviews у шаблон
    return render_template('admin_reviews.html', reviews=reviews)

# Сторінка звітів
@app.route('/admin/reports')
@login_required
def admin_reports():
    if current_user.role != 'admin':
        abort(403)
    return render_template('admin_reports.html')

# Експорт звітів в excel
@app.route('/admin/export/<report_type>')
@login_required
def export_report(report_type):
    if current_user.role != 'admin':
        abort(403)

    output = io.BytesIO()
    
    if report_type == 'bookings':
        # Звіт про бронювання
        data = db.session.query(
            Booking.id, Booking.full_name, Booking.phone, 
            Tour.title, Booking.total_price, Booking.status, Booking.timestamp
        ).join(Tour).all()
        df = pd.DataFrame(data, columns=['ID', 'Клієнт', 'Телефон', 'Тур', 'Ціна', 'Статус', 'Дата'])
        filename = "bookings_report.xlsx"

    elif report_type == 'destinations':
        # Популярність напрямків
        data = db.session.query(
            Tour.country, 
            func.count(Booking.id), 
            func.sum(Booking.total_price)
        ).join(Booking).group_by(Tour.country).all()
        df = pd.DataFrame(data, columns=['Країна', 'Кількість замовлень', 'Загальна сума'])
        filename = "destinations_report.xlsx"

    elif report_type == 'clients':
        # Активність клієнтів (тільки оплачені тури)
        data = db.session.query(
            User.email, 
            func.count(Booking.id), 
            func.sum(Booking.total_price)
        ).join(Booking, Booking.user_id == User.id)\
         .filter(Booking.status == 'Оплачено')\
         .group_by(User.email).all()
        
        df = pd.DataFrame(data, columns=['Email клієнта', 'Кількість оплачених турів', 'Сума прибутку'])
        filename = "clients_activity_report.xlsx"
    else:
        return "Невідомий тип звіту", 400

    # Запис в Excel
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Звіт')
    
    output.seek(0)
    return send_file(output, mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', as_attachment=True, download_name=filename)

# Чат для менеджера
@app.route('/admin/chat')
@login_required
def admin_chat():
    if current_user.role != 'admin':
        abort(403)
    # Отримання всіх користувачів (крім поточного адміна), щоб менеджер міг з ними спілкуватися
    users_list = User.query.filter_by(role='user').all()
    return render_template('admin_chat.html', users=users_list)

# Завантаження файлів у чат
@app.route('/upload_chat_file', methods=['POST'])
@login_required
def upload_chat_file():
    if 'file' not in request.files:
        return jsonify({'success': False, 'error': 'Файл не знайдено'}), 400
    
    file = request.files['file']
    receiver_id = request.form.get('receiver_id')
    
    if not receiver_id:
        return jsonify({'success': False, 'error': 'Не вказано отримувача'}), 400

    if file and allowed_file_chat(file.filename):
        # Отримання розширення файлу
        ext = file.filename.rsplit('.', 1)[1].lower()
        # Створення безпечного імені: дата + оригінальна назва (якщо вона не порожня)
        original_name = secure_filename(file.filename) or "file"
        unique_name = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{original_name}"
        
        try:
            full_path = os.path.join(app.config['UPLOAD_FOLDER_CHAT'], unique_name)
            file.save(full_path)
            
            # Створення запису у базі
            new_msg = Message(
                sender_id=current_user.id,
                receiver_id=int(receiver_id),
                text=file.filename, 
                file_path=unique_name
            )
            db.session.add(new_msg)
            db.session.commit()
            
            emit_data = {
                'text': file.filename,
                'file_path': unique_name,
                'sender_id': current_user.id,
                'receiver_id': int(receiver_id),
                'time': datetime.now().strftime('%H:%M')
            }
            
            # Відправлення через сокети всім 
            socketio.emit('new_message', emit_data)
            
            return jsonify({'success': True, 'file_path': unique_name})
            
        except Exception as e:
            db.session.rollback()
            print(f"Помилка при збереженні файлу: {e}")
            return jsonify({'success': False, 'error': 'Помилка сервера при збереженні'}), 500
    
    return jsonify({'success': False, 'error': 'Недозволений тип файлу'}), 400

# Статус онлайн
@socketio.on('connect')
def handle_connect():
    if current_user.is_authenticated:
        current_user.is_online = True
        db.session.commit()
        emit('status_change', {'user_id': current_user.id, 'status': 'online'}, broadcast=True)

# Статус офлайн
@socketio.on('disconnect')
def handle_disconnect():
    if current_user.is_authenticated:
        current_user.is_online = False
        db.session.commit()
        emit('status_change', {'user_id': current_user.id, 'status': 'offline'}, broadcast=True)

# Відправка повідомлення
@socketio.on('send_message')
def handle_send_message(data):
    text = data.get('text')
    receiver_id = data.get('receiver_id')
    
    if text and receiver_id:
        try:
            new_msg = Message(
                sender_id=current_user.id,
                receiver_id=int(receiver_id),
                text=text,
                file_path=None 
            )
            db.session.add(new_msg)
            db.session.commit()

            emit('new_message', {
                'text': text,
                'file_path': None, 
                'sender_id': current_user.id,
                'receiver_id': int(receiver_id),
                'time': datetime.now().strftime('%H:%M')
            }, broadcast=True)
        except Exception as e:
            db.session.rollback() 
            print(f"Error saving message: {e}")
        
# API для завантаження історії повідомлень
@app.route('/get_messages/<int:user_id>')
@login_required
def get_messages(user_id):
    messages = Message.query.filter(
        ((Message.sender_id == current_user.id) & (Message.receiver_id == user_id)) |
        ((Message.sender_id == user_id) & (Message.receiver_id == current_user.id))
    ).order_by(Message.timestamp.asc()).all()

    return jsonify([{
        'text': m.text,
        'sender_id': m.sender_id,
        'receiver_id': m.receiver_id, 
        'file_path': m.file_path, 
        'time': m.timestamp.strftime('%H:%M')
    } for m in messages])

if __name__ == '__main__':
    import os
    with app.app_context():
        import pandas 
        db.create_all() 
    
    port = int(os.environ.get('PORT', 5000))
    socketio.run(app, host='0.0.0.0', port=port)