require('dotenv').config();
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const conn = require('./conn');
const ensureSchema = require('./ensure_schema');



const app = express();
const adminApp = express();
const session = require('express-session');

// Shared Session middleware configuration
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'rental-bike-secret-key-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  }
});

// Configure Shared Middlewares
[app, adminApp].forEach(server => {
  server.set('trust proxy', 1);
  server.use(helmet({
    contentSecurityPolicy: false,
  }));
  server.use(express.json());
  server.use(express.urlencoded({ extended: true }));
  server.set('view engine', 'ejs');
  server.set('views', path.join(__dirname, 'views'));
  server.use(sessionMiddleware);
  
  // Static files for both
  server.use('/assets', express.static(path.join(__dirname, 'assets')));
  server.use('/css', express.static(path.join(__dirname, 'assets/css')));
  server.use('/js', express.static(path.join(__dirname, 'assets/js')));
  server.use('/img', express.static(path.join(__dirname, 'assets/images')));
});

// User-specific global middleware
app.use(async (req, res, next) => {
  res.locals.query = req.query || {};
  if (req.session.userId) {
    try {
      const [[user]] = await conn.query('SELECT * FROM users WHERE id = ?', [req.session.userId]);
      if (user) {
        const [[partner]] = await conn.query('SELECT status FROM partner_applications WHERE user_id = ? AND status = "approved"', [user.id]);
        user.isPartner = !!partner;
      }
      res.locals.user = user || null;
    } catch (err) {
      console.error('Session error:', err);
      res.locals.user = null;
    }
  } else {
    res.locals.user = null;
  }
  next();
});

// Admin-specific global middleware (simplified or shared)
adminApp.use((req, res, next) => {
  res.locals.query = req.query || {};
  next();
});

// Load routes
const userRoutes = require('./Routes/user');
const adminRoutes = require('./Routes/admin');

// Mount routes
app.use('/', userRoutes);
adminApp.use('/admin', adminRoutes);

// Root redirect for admin server (port 1000)
adminApp.get('/', (req, res) => {
  res.redirect('/admin/dashboard');
});

// 404 Handler for Main App
app.use((req, res) => {
  res.status(404).render('user/index', { error: 'Page not found', vehicles: [] });
});

// 404 Handler for Admin App
adminApp.use((req, res) => {
  res.status(404).send('Admin Page Not Found');
});

// Global Error Handler
[app, adminApp].forEach(server => {
  server.use((err, req, res, next) => {
    console.error('SERVER ERROR:', err);
    res.status(500).send('Something went wrong on the server.');
  });
});

async function startServer() {
  try {
    await ensureSchema();
    
    const PORT = process.env.PORT || 3000;
    const ADMIN_PORT = process.env.ADMIN_PORT || 1000;

    app.listen(PORT, () => { 
      console.log(`User Server running at http://localhost:${PORT}`); 
    });

    adminApp.listen(ADMIN_PORT, () => {
      console.log(`Admin Server running at http://localhost:${ADMIN_PORT}`);
    });

  } catch (error) {
    console.error('Schema initialization failed:', error);
    process.exit(1);
  }
}

startServer();
