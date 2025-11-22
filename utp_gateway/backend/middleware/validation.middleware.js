const { body, validationResult } = require('express-validator');

/**
 * Validation middleware for UTP Gateway
 */

/**
 * Handle validation results
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      error_code: 'UTP_VALIDATION_001',
      details: errors.array(),
      timestamp: new Date().toISOString()
    });
  }
  
  next();
};

/**
 * User Registration Validation
 */
const validateUserRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain uppercase, lowercase, number and special character'),
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('phone')
    .isMobilePhone('en-IN')
    .withMessage('Valid Indian mobile number is required'),
  body('user_type')
    .optional()
    .isIn(['customer', 'merchant', 'admin'])
    .withMessage('User type must be customer, merchant, or admin'),
  handleValidationErrors
];

/**
 * User Login Validation
 */
const validateUserLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

/**
 * Payment Validation
 */
const validatePayment = [
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number'),
  body('currency')
    .isIn(['BGT', 'BST', 'BPT', 'BINR', 'RWA'])
    .withMessage('Invalid currency type'),
  body('merchant_id')
    .notEmpty()
    .withMessage('Merchant ID is required'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  handleValidationErrors
];

/**
 * Settlement Validation
 */
const validateSettlement = [
  body('payment_id')
    .notEmpty()
    .withMessage('Payment ID is required'),
  body('merchant_id')
    .notEmpty()
    .withMessage('Merchant ID is required'),
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number'),
  body('currency')
    .isIn(['INR', 'BGT', 'BST', 'BPT', 'BINR'])
    .withMessage('Invalid settlement currency'),
  body('settlement_method')
    .isIn(['inr_upi', 'inr_neft', 'binr_transfer', 'bgt_transfer', 'mixed_settlement'])
    .withMessage('Invalid settlement method'),
  body('merchant_account_details')
    .isObject()
    .withMessage('Merchant account details are required'),
  handleValidationErrors
];

/**
 * Conversion Validation
 */
const validateConversion = [
  body('from_asset')
    .isIn(['BGT', 'BST', 'BPT', 'BINR', 'RWA'])
    .withMessage('Invalid source asset'),
  body('to_asset')
    .isIn(['BGT', 'BST', 'BPT', 'BINR', 'RWA', 'INR'])
    .withMessage('Invalid target asset'),
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number'),
  handleValidationErrors
];

/**
 * Merchant Registration Validation
 */
const validateMerchantRegistration = [
  body('business_name')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Business name must be between 2 and 200 characters'),
  body('business_type')
    .isIn(['retail', 'wholesale', 'service', 'ecommerce', 'other'])
    .withMessage('Invalid business type'),
  body('business_address')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Business address must be between 10 and 500 characters'),
  body('bank_details')
    .isObject()
    .withMessage('Bank details are required'),
  body('bank_details.account_number')
    .isLength({ min: 8, max: 20 })
    .withMessage('Valid account number is required'),
  body('bank_details.ifsc_code')
    .matches(/^[A-Z]{4}0[A-Z0-9]{6}$/)
    .withMessage('Valid IFSC code is required'),
  body('bank_details.account_holder_name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Account holder name is required'),
  body('settlement_preference')
    .isIn(['inr', 'binr', 'bgt', 'mixed'])
    .withMessage('Invalid settlement preference'),
  handleValidationErrors
];

/**
 * API Key Validation
 */
const validateAPIKey = [
  body('merchant_id')
    .notEmpty()
    .withMessage('Merchant ID is required'),
  body('key_name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Key name must be between 2 and 100 characters'),
  body('permissions')
    .isArray()
    .withMessage('Permissions must be an array'),
  handleValidationErrors
];

/**
 * Webhook Validation
 */
const validateWebhook = [
  body('event_type')
    .isIn(['payment_completed', 'payment_failed', 'settlement_completed', 'settlement_failed'])
    .withMessage('Invalid webhook event type'),
  body('merchant_id')
    .notEmpty()
    .withMessage('Merchant ID is required'),
  body('data')
    .isObject()
    .withMessage('Webhook data must be an object'),
  handleValidationErrors
];

/**
 * General ID Validation
 */
const validateID = [
  body('id')
    .notEmpty()
    .withMessage('ID is required')
    .isUUID()
    .withMessage('Valid UUID is required'),
  handleValidationErrors
];

/**
 * Pagination Validation
 */
const validatePagination = [
  body('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  body('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateUserRegistration,
  validateUserLogin,
  validatePayment,
  validateSettlement,
  validateConversion,
  validateMerchantRegistration,
  validateAPIKey,
  validateWebhook,
  validateID,
  validatePagination
};