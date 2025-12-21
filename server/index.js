require('dotenv').config();
var express = require('express');
var bodyParser = require('body-parser')
var cors = require('cors');
var rateLimit = require('express-rate-limit');
var AuthController = require('./auth/AuthController');
const controller = require("./file/controller");
const GifController = require("./gif/Controller");
const SatsangController = require("./satsang/Controller");
const ServeyController = require("./servey/controller");
var VerifyToken = require('./auth/VerifyToken');
var roleBasedRateLimit = require('./middleware/roleBasedRateLimit');
var db = require('./db');
var mongoose = require('mongoose');
var path = require('path');


var dir = path.join(__dirname, 'resources/static/assets/uploads');

global.__basedir = __dirname;


global.__root   = __dirname + '/'; 





// import {machineId, machineIdSync} from 'node-machine-id';
var machine = require('node-machine-id');



var app = express();

// Rate limiting configurations
// IP-based rate limiter for unauthenticated requests (public endpoints)
const publicApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 500 requests per 15 minutes for public endpoints
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiter for auth endpoints (login only)
// Uses IP + User-Agent for better tracking
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP+UserAgent to 10 login attempts per 15 minutes
  message: 'Too many login attempts, please try again later.',
  skipSuccessfulRequests: true, // Don't count successful logins
  keyGenerator: function(req) {
    // Use IP + User-Agent to better distinguish users behind same IP
    const userAgent = req.get('user-agent') || 'unknown';
    return req.ip + ':' + userAgent.substring(0, 50);
  }
});

// Rate limiter for voting (public endpoint - unauthenticated users)
// Uses IP + User-Agent for better tracking
const voteLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Limit each IP+UserAgent to 30 votes per minute (increased for 100k users)
  message: 'Too many votes, please try again later.',
  keyGenerator: function(req) {
    // Use IP + User-Agent to better distinguish users behind same IP
    const userAgent = req.get('user-agent') || 'unknown';
    return req.ip + ':' + userAgent.substring(0, 50);
  }
});

// Apply public rate limiting to public routes
app.use('/api/auth/login', loginLimiter);
app.use('/servey/Listings', voteLimiter); // Voting endpoint

// Configure CORS with environment variable
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests) in development
    if (!origin && process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    const allowedOrigins = process.env.FRONTEND_URL 
      ? process.env.FRONTEND_URL.split(',') 
      : (process.env.NODE_ENV === 'production' ? [] : ['*']);
    
    // In production, require specific origin
    if (process.env.NODE_ENV === 'production' && allowedOrigins.length === 0) {
      return callback(new Error('FRONTEND_URL must be set in production'), false);
    }
    
    // Allow all origins in development if FRONTEND_URL is not set
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-access-token']
};
app.use(cors(corsOptions));

app.use('/resources/static/assets/uploads', express.static(dir));


// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

// Health check endpoint for Render
app.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: dbStatus,
    uptime: process.uptime()
  });
});

//for testing porpose
app.get('/', (req, res)=>{
   res.status(200).send('this is our home page')
})

// Apply rate limiting to specific routes
app.use('/api/auth/setup-superadmin', loginLimiter);

app.use('/api/auth', AuthController);

// Apply role-based rate limiting to authenticated endpoints
// File upload - role-based (admin/superadmin only can upload)
app.post("/upload", roleBasedRateLimit.uploadLimiter, VerifyToken, controller.upload);

// File management - role-based read limiter
app.get("/files", roleBasedRateLimit.readLimiter, VerifyToken, controller.getListFiles);
app.get("/files/:name", roleBasedRateLimit.readLimiter, VerifyToken, controller.download);

// Apply role-based rate limiting to other routes
app.use('/gif', GifController);
app.use('/satsang', SatsangController);
app.use('/servey', ServeyController);


const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});