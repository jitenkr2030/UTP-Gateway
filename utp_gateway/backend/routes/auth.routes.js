const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window per IP
  message: 'Too many authentication attempts. Please try again later.'
});

router.use(authLimiter);

// User and merchant authentication class
class UTPAuthManager {
  constructor() {
    this.users = new Map();
    this.merchants = new Map();
    this.sessions = new Map();
    this.refresh_tokens = new Map();
    this.api_keys = new Map();
  }

  // Register new user (customer)
  async registerUser(userData) {
    const {
      email,
      password,
      phone,
      name,
      user_type = 'customer', // customer, merchant, admin
      kyc_data = {}
    } = userData;

    try {
      // Validate user data
      this.validateUserData(userData);

      // Check if user already exists
      if (this.users.has(email)) {
        throw new Error('User already registered with this email');
      }

      // Hash password
      const saltRounds = 12;
      const hashed_password = await bcrypt.hash(password, saltRounds);

      // Create user
      const user_id = uuidv4();
      const user = {
        user_id,
        email,
        phone,
        name,
        user_type,
        hashed_password,
        kyc_status: 'pending',
        verification_level: 1,
        account_status: 'active',
        last_login: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        kyc_data,
        preferences: {
          preferred_currency: 'inr',
          notification_settings: {
            email: true,
            sms: true,
            push: true
          }
        }
      };

      this.users.set(email, user);

      return {
        success: true,
        user_id,
        message: 'User registered successfully',
        verification_required: true,
        next_steps: [
          'Verify email address',
          'Complete phone verification',
          'Complete KYC verification'
        ],
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      throw new Error(`User registration failed: ${error.message}`);
    }
  }

  // Authenticate user
  async authenticateUser(email, password, ip_address = null) {
    try {
      const user = this.users.get(email);
      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Check account status
      if (user.account_status === 'suspended') {
        throw new Error('Account is suspended. Please contact support.');
      }

      // Verify password
      const password_valid = await bcrypt.compare(password, user.hashed_password);
      if (!password_valid) {
        throw new Error('Invalid email or password');
      }

      // Update last login
      user.last_login = new Date().toISOString();
      user.updated_at = new Date().toISOString();
      this.users.set(email, user);

      // Generate tokens
      const tokens = this.generateTokens(user);

      // Store session
      const session_id = uuidv4();
      this.sessions.set(session_id, {
        user_id: user.user_id,
        email: user.email,
        user_type: user.user_type,
        created_at: new Date().toISOString(),
        last_activity: new Date().toISOString(),
        ip_address,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      });

      return {
        success: true,
        user_id: user.user_id,
        email: user.email,
        name: user.name,
        user_type: user.user_type,
        kyc_status: user.kyc_status,
        verification_level: user.verification_level,
        session_id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_in: 86400, // 24 hours
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  // Generate JWT tokens
  generateTokens(user) {
    const payload = {
      user_id: user.user_id,
      email: user.email,
      user_type: user.user_type,
      verification_level: user.verification_level
    };

    const access_token = jwt.sign(
      payload,
      process.env.JWT_SECRET || 'utp-jwt-secret-key',
      { 
        expiresIn: '24h',
        issuer: 'UTP-Gateway',
        audience: 'utp-clients'
      }
    );

    const refresh_token = jwt.sign(
      { user_id: user.user_id, token_type: 'refresh' },
      process.env.JWT_REFRESH_SECRET || 'utp-refresh-secret-key',
      { 
        expiresIn: '30d',
        issuer: 'UTP-Gateway',
        audience: 'utp-clients'
      }
    );

    // Store refresh token
    this.refresh_tokens.set(refresh_token, {
      user_id: user.user_id,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    });

    return { access_token, refresh_token };
  }

  // Verify JWT token
  verifyToken(token) {
    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'utp-jwt-secret-key',
        { issuer: 'UTP-Gateway', audience: 'utp-clients' }
      );
      return { valid: true, decoded };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  // Refresh access token
  async refreshAccessToken(refresh_token) {
    try {
      const token_data = this.refresh_tokens.get(refresh_token);
      if (!token_data) {
        throw new Error('Invalid refresh token');
      }

      // Verify refresh token
      const decoded = jwt.verify(
        refresh_token,
        process.env.JWT_REFRESH_SECRET || 'utp-refresh-secret-key',
        { issuer: 'UTP-Gateway', audience: 'utp-clients' }
      );

      // Check expiration
      if (new Date() > new Date(token_data.expires_at)) {
        this.refresh_tokens.delete(refresh_token);
        throw new Error('Refresh token expired');
      }

      // Get user and generate new tokens
      const user = this.getUserById(decoded.user_id);
      if (!user) {
        throw new Error('User not found');
      }

      const new_tokens = this.generateTokens(user);

      // Remove old refresh token
      this.refresh_tokens.delete(refresh_token);

      return {
        success: true,
        access_token: new_tokens.access_token,
        refresh_token: new_tokens.refresh_token,
        expires_in: 86400,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }

  // Generate API key for merchants
  generateAPIKey(merchant_id, permissions = ['payments:read', 'payments:write']) {
    const api_key = `utp_${merchant_id}_${uuidv4().replace(/-/g, '')}`;
    const api_secret = uuidv4().replace(/-/g, '');

    this.api_keys.set(api_key, {
      merchant_id,
      api_secret: await bcrypt.hash(api_secret, 10),
      permissions,
      created_at: new Date().toISOString(),
      last_used: null,
      usage_count: 0
    });

    return {
      api_key,
      api_secret,
      permissions,
      created_at: new Date().toISOString()
    };
  }

  // Verify API key
  async verifyAPIKey(api_key, api_secret) {
    try {
      const key_data = this.api_keys.get(api_key);
      if (!key_data) {
        return { valid: false, error: 'Invalid API key' };
      }

      // Verify secret
      const secret_valid = await bcrypt.compare(api_secret, key_data.api_secret);
      if (!secret_valid) {
        return { valid: false, error: 'Invalid API secret' };
      }

      // Update usage
      key_data.last_used = new Date().toISOString();
      key_data.usage_count += 1;
      this.api_keys.set(api_key, key_data);

      return {
        valid: true,
        merchant_id: key_data.merchant_id,
        permissions: key_data.permissions
      };

    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  // Validate user data
  validateUserData(data) {
    const required_fields = ['email', 'password', 'phone', 'name'];
    
    for (const field of required_fields) {
      if (!data[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate email
    const email_regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email_regex.test(data.email)) {
      throw new Error('Invalid email format');
    }

    // Validate password strength
    if (data.password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    const password_regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/;
    if (!password_regex.test(data.password)) {
      throw new Error('Password must contain uppercase, lowercase, number, and special character');
    }

    // Validate phone
    const phone_regex = /^[+]?[\d\s-()]+$/;
    if (!phone_regex.test(data.phone)) {
      throw new Error('Invalid phone number format');
    }
  }

  // Get user by ID
  getUserById(user_id) {
    for (const [email, user] of this.users) {
      if (user.user_id === user_id) {
        return user;
      }
    }
    return null;
  }

  // Logout user
  logoutUser(session_id) {
    if (this.sessions.has(session_id)) {
      this.sessions.delete(session_id);
      return true;
    }
    return false;
  }

  // Get user profile
  getUserProfile(user_id) {
    const user = this.getUserById(user_id);
    if (!user) {
      throw new Error('User not found');
    }

    return {
      user_id: user.user_id,
      email: user.email,
      phone: user.phone,
      name: user.name,
      user_type: user.user_type,
      kyc_status: user.kyc_status,
      verification_level: user.verification_level,
      account_status: user.account_status,
      last_login: user.last_login,
      created_at: user.created_at,
      preferences: user.preferences
    };
  }

  // Update user profile
  updateUserProfile(user_id, updates) {
    const user = this.getUserById(user_id);
    if (!user) {
      throw new Error('User not found');
    }

    // Update allowed fields
    const allowed_updates = ['name', 'phone', 'preferences'];
    for (const field of allowed_updates) {
      if (updates[field] !== undefined) {
        user[field] = updates[field];
      }
    }

    user.updated_at = new Date().toISOString();
    
    // Update in storage
    this.users.set(user.email, user);

    return {
      success: true,
      updated_fields: Object.keys(updates),
      timestamp: new Date().toISOString()
    };
  }
}

// Initialize auth manager
const authManager = new UTPAuthManager();

// POST /api/auth/register - Register new user
router.post('/register', async (req, res) => {
  try {
    const result = await authManager.registerUser(req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      error_code: 'USER_REGISTRATION_FAILED',
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/auth/login - Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const ip_address = req.ip || req.connection.remoteAddress;
    const result = await authManager.authenticateUser(email, password, ip_address);
    res.json(result);
  } catch (error) {
    res.status(401).json({
      success: false,
      error: error.message,
      error_code: 'AUTHENTICATION_FAILED',
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/auth/refresh - Refresh access token
router.post('/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;
    const result = await authManager.refreshAccessToken(refresh_token);
    res.json(result);
  } catch (error) {
    res.status(401).json({
      success: false,
      error: error.message,
      error_code: 'TOKEN_REFRESH_FAILED',
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/auth/logout - Logout user
router.post('/logout', (req, res) => {
  try {
    const { session_id } = req.body;
    const success = authManager.logoutUser(session_id);
    
    if (success) {
      res.json({
        success: true,
        message: 'Logged out successfully',
        timestamp: new Date().toISOString()
      });
    } else {
      throw new Error('Invalid session');
    }
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      error_code: 'LOGOUT_FAILED',
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/auth/api-key/generate - Generate API key for merchant
router.post('/api-key/generate', (req, res) => {
  try {
    const { merchant_id, permissions } = req.body;
    const result = authManager.generateAPIKey(merchant_id, permissions);
    res.json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      error_code: 'API_KEY_GENERATION_FAILED',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/auth/profile - Get user profile
router.get('/profile', authenticateToken, (req, res) => {
  try {
    const user_id = req.user.user_id;
    const profile = authManager.getUserProfile(user_id);
    res.json({
      success: true,
      profile,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: error.message,
      error_code: 'PROFILE_NOT_FOUND',
      timestamp: new Date().toISOString()
    });
  }
});

// PUT /api/auth/profile - Update user profile
router.put('/profile', authenticateToken, (req, res) => {
  try {
    const user_id = req.user.user_id;
    const result = authManager.updateUserProfile(user_id, req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      error_code: 'PROFILE_UPDATE_FAILED',
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/auth/api-key/verify - Verify API key
router.post('/api-key/verify', async (req, res) => {
  try {
    const { api_key, api_secret } = req.body;
    const result = await authManager.verifyAPIKey(api_key, api_secret);
    res.json({
      valid: result.valid,
      merchant_id: result.merchant_id,
      permissions: result.permissions,
      error: result.error,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      error_code: 'API_KEY_VERIFICATION_FAILED',
      timestamp: new Date().toISOString()
    });
  }
});

// Middleware to authenticate JWT token
function authenticateToken(req, res, next) {
  const auth_header = req.headers['authorization'];
  const token = auth_header && auth_header.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token required',
      error_code: 'TOKEN_REQUIRED',
      timestamp: new Date().toISOString()
    });
  }

  const result = authManager.verifyToken(token);
  
  if (!result.valid) {
    return res.status(403).json({
      success: false,
      error: 'Invalid or expired token',
      error_code: 'TOKEN_INVALID',
      timestamp: new Date().toISOString()
    });
  }

  req.user = result.decoded;
  next();
}

module.exports = router;