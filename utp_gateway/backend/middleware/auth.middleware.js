const jwt = require('jsonwebtoken');

/**
 * Authentication middleware for JWT token validation
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token required',
      error_code: 'UTP_AUTH_001'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'default-secret', (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        error: 'Invalid or expired token',
        error_code: 'UTP_AUTH_002'
      });
    }

    req.user = user;
    next();
  });
};

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  jwt.verify(token, process.env.JWT_SECRET || 'default-secret', (err, user) => {
    if (err) {
      req.user = null;
    } else {
      req.user = user;
    }
    next();
  });
};

/**
 * Merchant authentication middleware
 */
const authenticateMerchant = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Merchant access token required',
      error_code: 'UTP_MERCHANT_AUTH_001'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'default-secret', (err, user) => {
    if (err || user.user_type !== 'merchant') {
      return res.status(403).json({
        success: false,
        error: 'Invalid merchant token',
        error_code: 'UTP_MERCHANT_AUTH_002'
      });
    }

    req.merchant = user;
    next();
  });
};

/**
 * Admin authentication middleware
 */
const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Admin access token required',
      error_code: 'UTP_ADMIN_AUTH_001'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'default-secret', (err, user) => {
    if (err || user.user_type !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Invalid admin token',
        error_code: 'UTP_ADMIN_AUTH_002'
      });
    }

    req.admin = user;
    next();
  });
};

/**
 * API Key authentication middleware
 */
const authenticateAPIKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'API key required',
      error_code: 'UTP_API_KEY_001'
    });
  }

  // Validate API key (implement your API key validation logic)
  const validAPIKeys = new Set([
    'utp_demo_key_12345',
    'utp_merchant_key_67890'
  ]);

  if (!validAPIKeys.has(apiKey)) {
    return res.status(403).json({
      success: false,
      error: 'Invalid API key',
      error_code: 'UTP_API_KEY_002'
    });
  }

  req.apiKey = apiKey;
  next();
};

/**
 * Rate limiting middleware for specific routes
 */
const createRateLimiter = (windowMs, max, message) => {
  const rateLimit = require('express-rate-limit');
  
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      error: message,
      error_code: 'UTP_RATE_LIMIT'
    },
    standardHeaders: true,
    legacyHeaders: false
  });
};

// Predefined rate limiters
const authRateLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  10, // 10 attempts
  'Too many authentication attempts. Please try again later.'
);

const paymentRateLimiter = createRateLimiter(
  1 * 60 * 1000, // 1 minute
  100, // 100 requests
  'Too many payment requests. Please slow down.'
);

const conversionRateLimiter = createRateLimiter(
  1 * 60 * 1000, // 1 minute
  1000, // 1000 requests
  'Too many conversion requests. Please try again later.'
);

module.exports = {
  authenticateToken,
  optionalAuth,
  authenticateMerchant,
  authenticateAdmin,
  authenticateAPIKey,
  authRateLimiter,
  paymentRateLimiter,
  conversionRateLimiter
};