var rateLimit = require('express-rate-limit');
var User = require('../user/User');

// Create role-based rate limiter
function createRoleBasedRateLimit(options) {
  // Create different limiters for each role
  const userLimiter = rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000,
    max: options.user || 1000,
    message: options.message || 'Too many requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: function(req) {
      return req.userId ? req.userId.toString() : req.ip;
    }
  });

  const adminLimiter = rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000,
    max: options.admin || 5000,
    message: options.message || 'Too many requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: function(req) {
      return req.userId ? req.userId.toString() : req.ip;
    }
  });

  const superadminLimiter = rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000,
    max: options.superadmin || 10000,
    message: options.message || 'Too many requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: function(req) {
      return req.userId ? req.userId.toString() : req.ip;
    }
  });

  // Default limiter for unauthenticated requests
  // Uses IP + User-Agent for better tracking (helps distinguish users behind same IP)
  const defaultLimiter = rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000,
    max: options.default || 100,
    message: options.message || 'Too many requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: function(req) {
      // For unauthenticated users, use IP + User-Agent for better tracking
      // This helps distinguish different users/browsers behind the same IP
      const userAgent = req.get('user-agent') || 'unknown';
      return req.ip + ':' + userAgent.substring(0, 50); // Limit user-agent length
    }
  });

  // Return middleware that checks role and applies appropriate limiter
  return function(req, res, next) {
    // If user is not authenticated, use default limiter
    if (!req.userId) {
      return defaultLimiter(req, res, next);
    }

    // Get user role
    User.findById(req.userId, function(err, user) {
      if (err || !user) {
        // If error, use default limiter
        return defaultLimiter(req, res, next);
      }

      // Apply limiter based on role
      if (user.role === 'superadmin') {
        superadminLimiter(req, res, next);
      } else if (user.role === 'admin') {
        adminLimiter(req, res, next);
      } else {
        userLimiter(req, res, next);
      }
    });
  };
}

// Rate limiters for different operations
const readLimiter = createRoleBasedRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  default: 500,     // Unauthenticated: 500 requests per 15 min
  user: 1000,       // Regular users: 1000 read requests per 15 min
  admin: 5000,      // Admin: 5000 read requests per 15 min
  superadmin: 10000, // Superadmin: 10000 read requests per 15 min
  message: 'Too many read requests, please try again later.'
});

const writeLimiter = createRoleBasedRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  default: 10,      // Unauthenticated: 10 write requests per 15 min
  user: 0,          // Regular users: 0 write requests (they can't write)
  admin: 1000,      // Admin: 1000 write requests per 15 min
  superadmin: 5000, // Superadmin: 5000 write requests per 15 min
  message: 'Too many write requests, please try again later.'
});

const uploadLimiter = createRoleBasedRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  default: 5,        // Unauthenticated: 5 uploads per hour
  user: 0,          // Regular users: 0 uploads (they can't upload)
  admin: 200,        // Admin: 200 uploads per hour
  superadmin: 500,  // Superadmin: 500 uploads per hour
  message: 'Too many file uploads, please try again later.'
});

const createUserLimiter = createRoleBasedRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  default: 0,        // Unauthenticated: Cannot create users
  user: 0,           // Regular users: Cannot create users
  admin: 50,         // Admin: 50 user creations per hour
  superadmin: 200,   // Superadmin: 200 user creations per hour
  message: 'Too many user creation attempts, please try again later.'
});

module.exports = {
  readLimiter,
  writeLimiter,
  uploadLimiter,
  createUserLimiter
};

