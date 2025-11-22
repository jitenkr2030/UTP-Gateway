/**
 * Global Error Handling Middleware for UTP Gateway
 */

/**
 * Custom Error Classes
 */
class UTPError extends Error {
  constructor(message, code, statusCode = 500) {
    super(message);
    this.name = 'UTPError';
    this.code = code;
    this.statusCode = statusCode;
    this.timestamp = new Date().toISOString();
  }
}

class ValidationError extends UTPError {
  constructor(message, field = null) {
    super(message, 'UTP_VALIDATION_ERROR', 400);
    this.field = field;
  }
}

class AuthenticationError extends UTPError {
  constructor(message = 'Authentication failed') {
    super(message, 'UTP_AUTH_ERROR', 401);
  }
}

class AuthorizationError extends UTPError {
  constructor(message = 'Insufficient permissions') {
    super(message, 'UTP_AUTHZ_ERROR', 403);
  }
}

class NotFoundError extends UTPError {
  constructor(message = 'Resource not found') {
    super(message, 'UTP_NOT_FOUND', 404);
  }
}

class ConflictError extends UTPError {
  constructor(message = 'Resource conflict') {
    super(message, 'UTP_CONFLICT', 409);
  }
}

class RateLimitError extends UTPError {
  constructor(message = 'Rate limit exceeded') {
    super(message, 'UTP_RATE_LIMIT', 429);
  }
}

/**
 * Global error handler middleware
 */
const globalErrorHandler = (err, req, res, next) => {
  console.error('UTP Gateway Error:', {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    user_agent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Default error response
  let errorResponse = {
    success: false,
    error: 'Internal server error',
    error_code: 'UTP_500',
    timestamp: new Date().toISOString()
  };

  // Handle UTP errors
  if (err instanceof UTPError) {
    errorResponse = {
      success: false,
      error: err.message,
      error_code: err.code,
      timestamp: err.timestamp,
      statusCode: err.statusCode
    };

    // Add field information for validation errors
    if (err instanceof ValidationError && err.field) {
      errorResponse.field = err.field;
    }
  }

  // Handle JWT errors
  else if (err.name === 'JsonWebTokenError') {
    errorResponse = {
      success: false,
      error: 'Invalid authentication token',
      error_code: 'UTP_JWT_INVALID',
      timestamp: new Date().toISOString()
    };
  }

  // Handle JWT expired errors
  else if (err.name === 'TokenExpiredError') {
    errorResponse = {
      success: false,
      error: 'Authentication token has expired',
      error_code: 'UTP_JWT_EXPIRED',
      timestamp: new Date().toISOString()
    };
  }

  // Handle validation errors
  else if (err.name === 'ValidationError') {
    errorResponse = {
      success: false,
      error: 'Validation failed',
      error_code: 'UTP_VALIDATION_ERROR',
      details: err.errors || [err.message],
      timestamp: new Date().toISOString()
    };
  }

  // Handle database errors
  else if (err.name === 'MongoError' || err.name === 'MongooseError') {
    errorResponse = {
      success: false,
      error: 'Database operation failed',
      error_code: 'UTP_DB_ERROR',
      timestamp: new Date().toISOString()
    };
  }

  // Handle network/HTTP errors
  else if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    errorResponse = {
      success: false,
      error: 'Service temporarily unavailable',
      error_code: 'UTP_SERVICE_UNAVAILABLE',
      timestamp: new Date().toISOString()
    };
  }

  // Send error response
  const statusCode = errorResponse.statusCode || 500;
  res.status(statusCode).json(errorResponse);
};

/**
 * 404 Not Found handler
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    error_code: 'UTP_404',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
};

/**
 * Async error wrapper
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Validation error handler for express-validator
 */
const validationErrorHandler = (req, res, next) => {
  const { validationResult } = require('express-validator');
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const firstError = errors.array()[0];
    throw new ValidationError(firstError.msg, firstError.param);
  }
  
  next();
};

/**
 * Rate limit error handler
 */
const rateLimitHandler = (req, res) => {
  res.status(429).json({
    success: false,
    error: 'Rate limit exceeded. Please try again later.',
    error_code: 'UTP_RATE_LIMIT',
    retry_after: Math.round(req.rateLimit.resetTime / 1000) || 60,
    timestamp: new Date().toISOString()
  });
};

/**
 * Security headers middleware
 */
const securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  
  // Remove server header for security
  res.removeHeader('X-Powered-By');
  
  next();
};

/**
 * Request ID middleware for tracing
 */
const requestId = (req, res, next) => {
  const { v4: uuidv4 } = require('uuid');
  
  req.request_id = req.headers['x-request-id'] || uuidv4();
  res.setHeader('X-Request-ID', req.request_id);
  
  next();
};

/**
 * Logging middleware
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      user_agent: req.get('User-Agent'),
      request_id: req.request_id,
      timestamp: new Date().toISOString()
    };
    
    if (res.statusCode >= 400) {
      console.error('Request Error:', logData);
    } else {
      console.log('Request Success:', logData);
    }
  });
  
  next();
};

module.exports = {
  UTPError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  globalErrorHandler,
  notFoundHandler,
  asyncHandler,
  validationErrorHandler,
  rateLimitHandler,
  securityHeaders,
  requestId,
  requestLogger
};