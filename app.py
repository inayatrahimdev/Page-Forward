from flask import Flask, render_template, request, redirect, url_for, flash, jsonify
import sqlite3
import os
from werkzeug.utils import secure_filename
from datetime import datetime
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "e63e2e84e1524cf81ae38ec402f92716a9b2c7966b7fb5ea615a247cb9589bac")  # Use environment variable for secret key
app.config['UPLOAD_FOLDER'] = 'static/uploads'
app.config['ALLOWED_EXTENSIONS'] = {'pdf', 'doc', 'docx'}

# Ensure upload directory exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Database initialization
def init_db():
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()

    # Book Donations Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS book_donations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        book_title TEXT NOT NULL,
        description TEXT,
        date_added TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')

    # Volunteer Applications Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS volunteer_applications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name TEXT NOT NULL,
        email TEXT NOT NULL,
        area_of_interest TEXT NOT NULL,
        bio TEXT,
        resume_path TEXT,
        date_added TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')

    # Contact Messages Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS contact_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        message TEXT NOT NULL,
        date_added TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')

    # Admin Users Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS admin_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
    )
    ''')

    # Insert default admin if not exists
    cursor.execute("SELECT COUNT(*) FROM admin_users WHERE username = 'admin'")
    if cursor.fetchone()[0] == 0:
        cursor.execute("INSERT INTO admin_users (username, password) VALUES (?, ?)", 
                      ('admin', 'pageforward2025'))

    conn.commit()
    conn.close()

# Initialize database on startup
init_db()

# Flask-Login initialization
login_manager = LoginManager()
login_manager.init_app(app)

# Login manager user loader
class AdminUser(UserMixin):
    def __init__(self, id):
        self.id = id

@login_manager.user_loader
def load_user(user_id):
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM admin_users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    conn.close()
    if user:
        return AdminUser(user[0])
    return None

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/donate_book', methods=['POST'])
def donate_book():
    if request.method == 'POST':
        name = request.form.get('name')
        email = request.form.get('email')
        book_title = request.form.get('book_title')
        description = request.form.get('description')

        # Basic validation
        if not name or not email or not book_title:
            return jsonify({"status": "error", "message": "Please fill in all required fields."})

        conn = sqlite3.connect('database.db')
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO book_donations (name, email, book_title, description) VALUES (?, ?, ?, ?)",
            (name, email, book_title, description)
        )
        conn.commit()
        conn.close()

        return jsonify({"status": "success", "message": "Book donation recorded successfully!"})

@app.route('/apply_volunteer', methods=['POST'])
def apply_volunteer():
    if request.method == 'POST':
        full_name = request.form.get('full_name')
        email = request.form.get('email')
        area_of_interest = request.form.get('area_of_interest')
        bio = request.form.get('bio')

        # Validate required fields
        if not full_name or not email or not area_of_interest:
            return jsonify({"status": "error", "message": "Please fill in all required fields."})

        resume_path = None
        if 'resume' in request.files:
            resume = request.files['resume']
            if resume and allowed_file(resume.filename):
                filename = secure_filename(f"{full_name}_{datetime.now().strftime('%Y%m%d%H%M%S')}_{resume.filename}")
                file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                resume.save(file_path)
                resume_path = file_path

        conn = sqlite3.connect('database.db')
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO volunteer_applications (full_name, email, area_of_interest, bio, resume_path) VALUES (?, ?, ?, ?, ?)",
            (full_name, email, area_of_interest, bio, resume_path)
        )
        conn.commit()
        conn.close()

        return jsonify({"status": "success", "message": "Application submitted successfully!"})

@app.route('/contact', methods=['POST'])
def contact():
    if request.method == 'POST':
        name = request.form.get('name')
        email = request.form.get('email')
        message = request.form.get('message')

        # Validate required fields
        if not name or not email or not message:
            return jsonify({"status": "error", "message": "Please fill in all required fields."})

        conn = sqlite3.connect('database.db')
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO contact_messages (name, email, message) VALUES (?, ?, ?)",
            (name, email, message)
        )
        conn.commit()
        conn.close()

        return jsonify({"status": "success", "message": "Message sent successfully!"})

@app.route('/admin', methods=['GET', 'POST'])
def admin_login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')

        conn = sqlite3.connect('database.db')
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM admin_users WHERE username = ? AND password = ?", 
                      (username, password))
        user = cursor.fetchone()
        conn.close()

        if user:
            login_user(AdminUser(user[0]))
            return redirect(url_for('admin_dashboard'))
        else:
            flash('Invalid credentials')
            return render_template('admin_login.html')

    return render_template('admin_login.html')

@app.route('/admin/dashboard')
@login_required
def admin_dashboard():
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Fetch all submissions
    cursor.execute("SELECT * FROM book_donations ORDER BY date_added DESC")
    book_donations = cursor.fetchall()

    cursor.execute("SELECT * FROM volunteer_applications ORDER BY date_added DESC")
    volunteer_applications = cursor.fetchall()

    cursor.execute("SELECT * FROM contact_messages ORDER BY date_added DESC")
    contact_messages = cursor.fetchall()

    conn.close()

    return render_template('admin_dashboard.html', 
                           book_donations=book_donations,
                           volunteer_applications=volunteer_applications,
                           contact_messages=contact_messages)

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('index'))

if __name__ == '__main__':
    with app.app_context():
        init_db()  # Initialize the database
    # Use Gunicorn for production
    from gunicorn.app.base import BaseApplication

    class StandaloneApplication(BaseApplication):
        def __init__(self, app, options=None):
            self.options = options or {}
            self.application = app
            super().__init__()

        def load_config(self):
            config = {key: value for key, value in self.options.items()
                      if key in self.cfg.settings and value is not None}
            for key, value in config.items():
                self.cfg.set(key.lower(), value)

        def load(self):
            return self.application

    options = {
        'bind': f"0.0.0.0:{os.getenv('PORT', 10000)}",
        'workers': 2,
    }
    StandaloneApplication(app, options).run()
