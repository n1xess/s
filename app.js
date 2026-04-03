require('dotenv').config();
const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const path = require('path');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET || 'change-this-secret-2026',
  resave: false,
  saveUninitialized: false,
  store: new SQLiteStore({ db: 'sessions.db' }),
  cookie: { maxAge: 1000 * 60 * 60 * 24 * 30 }
}));

const db = new sqlite3.Database('tools.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT UNIQUE, password TEXT)`);
  db.run(`CREATE TABLE IF NOT EXISTS hypernet_lots (id INTEGER PRIMARY KEY, user_id INTEGER, data TEXT)`);
  db.run(`CREATE TABLE IF NOT EXISTS arbitrage_ops (id INTEGER PRIMARY KEY, user_id INTEGER, data TEXT)`);
});

// Routes
app.get('/', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  res.render('index', { user: req.session.user });
});

app.get('/login', (req, res) => res.render('login', { error: null }));
app.get('/register', (req, res) => res.render('register', { error: null }));

app.post('/register', (req, res) => {
  const { username, password } = req.body;
  const hashed = bcrypt.hashSync(password, 10);
  db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashed], (err) => {
    if (err) return res.render('register', { error: 'Користувач вже існує' });
    res.redirect('/login');
  });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.render('login', { error: 'Невірний логін або пароль' });
    }
    req.session.user = { id: user.id, username: user.username };
    res.redirect('/');
  });
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

// Інструменти (поки що заглушки — вставиш свої HTML пізніше)
app.get('/hypernet', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  res.render('hypernet', { user: req.session.user });
});

app.get('/arbitrage', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  res.render('arbitrage', { user: req.session.user });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
