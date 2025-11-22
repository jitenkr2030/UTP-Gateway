const express = require('express');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

const router = express.Router();

// Integration management class
class UTPIntegrationManager {
  constructor() {
    this.webhooks = new Map();
    this.integrations = new Map();
    this.api_keys = new Map();
    this.sdk_downloads = new Map();
  }

  // Create webhook endpoint
  createWebhook(webhook_data) {
    const {
      merchant_id,
      url,
      events,
      secret,
      headers = {}
    } = webhook_data;

    try {
      // Validate webhook data
      this.validateWebhookData(webhook_data);

      const webhook_id = uuidv4();
      const webhook = {
        webhook_id,
        merchant_id,
        url,
        events,
        secret,
        headers,
        status: 'active',
        created_at: new Date().toISOString(),
        last_triggered: null,
        success_count: 0,
        failure_count: 0,
        retry_attempts: 0
      };

      this.webhooks.set(webhook_id, webhook);

      return {
        webhook_id,
        url: `https://api.utp.gateway/webhook/${webhook_id}`,
        status: 'active',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      throw new Error(`Webhook creation failed: ${error.message}`);
    }
  }

  // Trigger webhook
  async triggerWebhook(webhook_id, event_data) {
    const webhook = this.webhooks.get(webhook_id);
    if (!webhook || webhook.status !== 'active') {
      throw new Error('Webhook not found or inactive');
    }

    try {
      const payload = {
        id: uuidv4(),
        webhook_id,
        event: event_data.event,
        timestamp: new Date().toISOString(),
        data: event_data
      };

      // Generate signature
      const signature = this.generateWebhookSignature(payload, webhook.secret);

      // Send webhook
      const response = await axios.post(webhook.url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-UTP-Signature': signature,
          'User-Agent': 'UTP-Webhook/1.0',
          ...webhook.headers
        },
        timeout: 10000
      });

      // Update webhook stats
      webhook.last_triggered = new Date().toISOString();
      webhook.success_count += 1;
      this.webhooks.set(webhook_id, webhook);

      return {
        success: true,
        response_status: response.status,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      // Update webhook stats
      webhook.failure_count += 1;
      webhook.retry_attempts += 1;
      this.webhooks.set(webhook_id, webhook);

      throw new Error(`Webhook trigger failed: ${error.message}`);
    }
  }

  // Generate webhook signature
  generateWebhookSignature(payload, secret) {
    const crypto = require('crypto');
    const payload_string = JSON.stringify(payload);
    const signature = crypto
      .createHmac('sha256', secret)
      .update(payload_string)
      .digest('hex');
    
    return `sha256=${signature}`;
  }

  // Validate webhook data
  validateWebhookData(data) {
    const required_fields = ['merchant_id', 'url', 'events', 'secret'];
    
    for (const field of required_fields) {
      if (!data[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate URL
    try {
      new URL(data.url);
    } catch {
      throw new Error('Invalid URL format');
    }

    // Validate events
    const supported_events = [
      'payment.completed',
      'payment.failed',
      'payment.pending',
      'settlement.completed',
      'settlement.failed',
      'account.updated',
      'kyc.completed',
      'merchant.suspended'
    ];

    data.events.forEach(event => {
      if (!supported_events.includes(event)) {
        throw new Error(`Unsupported event: ${event}`);
      }
    });
  }

  // Get webhook details
  getWebhookDetails(webhook_id) {
    const webhook = this.webhooks.get(webhook_id);
    if (!webhook) {
      throw new Error('Webhook not found');
    }

    return webhook;
  }

  // Create integration
  createIntegration(integration_data) {
    const {
      merchant_id,
      integration_type, // 'api', 'sdk', 'plugin'
      platform, // 'web', 'mobile', 'shopify', 'woocommerce', 'magento'
      configuration = {}
    } = integration_data;

    try {
      // Validate integration data
      this.validateIntegrationData(integration_data);

      const integration_id = uuidv4();
      const integration = {
        integration_id,
        merchant_id,
        integration_type,
        platform,
        configuration,
        status: 'active',
        created_at: new Date().toISOString(),
        last_used: null,
        usage_stats: {
          api_calls: 0,
          success_rate: 0,
          average_response_time: 0
        }
      };

      this.integrations.set(integration_id, integration);

      // Generate integration-specific assets
      const assets = this.generateIntegrationAssets(integration);

      return {
        integration_id,
        integration_type,
        platform,
        assets,
        status: 'active',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      throw new Error(`Integration creation failed: ${error.message}`);
    }
  }

  // Generate integration assets
  generateIntegrationAssets(integration) {
    const { integration_type, platform, integration_id } = integration;

    const assets = {};

    if (integration_type === 'api') {
      assets.base_url = 'https://api.utp.gateway/v1';
      assets.api_version = 'v1';
      assets.endpoints = {
        payments: '/api/payments',
        settlement: '/api/settlement',
        conversion: '/api/conversion',
        merchant: '/api/merchant'
      };
      assets.documentation_url = 'https://docs.utp.gateway/api/v1';
    } else if (integration_type === 'sdk') {
      if (platform === 'web') {
        assets.javascript_sdk = 'https://cdn.utp.gateway/js/utp-sdk.js';
        assets.cdn_url = 'https://cdn.utp.gateway';
        assets.example_code = this.getWebSDKExample();
      } else if (platform === 'mobile') {
        assets.ios_sdk = 'https://cocoapods.org/pods/UTPSDK';
        assets.android_sdk = 'https://jitpack.io/github/utp-gateway/mobile-sdk';
        assets.example_code = this.getMobileSDKExample();
      }
    } else if (integration_type === 'plugin') {
      assets.download_url = `https://plugins.utp.gateway/${platform}/utp-${platform}-plugin.zip`;
      assets.installation_guide = `https://docs.utp.gateway/plugins/${platform}`;
      assets.configuration_needed = true;
    }

    // Track SDK download
    if (integration_type === 'sdk') {
      this.sdk_downloads.set(integration_id, {
        downloads: 0,
        platforms: [platform],
        created_at: new Date().toISOString()
      });
    }

    return assets;
  }

  // Get web SDK example
  getWebSDKExample() {
    return `
<!-- Include UTP SDK -->
<script src="https://cdn.utp.gateway/js/utp-sdk.js"></script>

<!-- Initialize UTP -->
<script>
  const utp = new UTPGateway({
    apiKey: 'your-api-key',
    environment: 'production'
  });

  // Create payment
  async function createPayment() {
    const payment = await utp.payments.create({
      amount: 1000,
      currency: 'bgt',
      settlement_type: 'inr',
      callback_url: 'https://your-site.com/payment-callback'
    });
    
    // Redirect to payment
    utp.redirectToPayment(payment.payment_id);
  }
</script>
    `.trim();
  }

  // Get mobile SDK example
  getMobileSDKExample() {
    return `
# iOS (Swift)
import UTPSDK

class PaymentViewController: UIViewController {
    let utpSDK = UTPSDK(apiKey: "your-api-key")
    
    func createPayment() {
        utpSDK.createPayment(
            amount: 1000,
            currency: .bgt,
            settlementType: .inr
        ) { result in
            switch result {
            case .success(let payment):
                // Handle successful payment creation
                self.redirectToPayment(payment.paymentId)
            case .failure(let error):
                // Handle error
                print("Error: \\(error)")
            }
        }
    }
}

# Android (Kotlin)
class MainActivity : AppCompatActivity() {
    private lateinit var utpSDK: UTPSDK
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        utpSDK = UTPSDK.Builder()
            .apiKey("your-api-key")
            .build()
    }
    
    private fun createPayment() {
        utpSDK.createPayment(
            amount = 1000,
            currency = Currency.BGT,
            settlementType = SettlementType.INR
        ) { result ->
            when (result) {
                is Result.Success -> redirectToPayment(result.data.paymentId)
                is Result.Error -> showError(result.exception)
            }
        }
    }
}
    `.trim();
  }

  // Validate integration data
  validateIntegrationData(data) {
    const required_fields = ['merchant_id', 'integration_type', 'platform'];
    
    for (const field of required_fields) {
      if (!data[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    const supported_integration_types = ['api', 'sdk', 'plugin'];
    if (!supported_integration_types.includes(data.integration_type)) {
      throw new Error(`Unsupported integration type: ${data.integration_type}`);
    }

    const supported_platforms = ['web', 'mobile', 'ios', 'android', 'shopify', 'woocommerce', 'magento'];
    if (!supported_platforms.includes(data.platform)) {
      throw new Error(`Unsupported platform: ${data.platform}`);
    }
  }

  // Get integration details
  getIntegrationDetails(integration_id) {
    const integration = this.integrations.get(integration_id);
    if (!integration) {
      throw new Error('Integration not found');
    }

    return integration;
  }

  // Get available integrations
  getAvailableIntegrations() {
    return {
      api: {
        name: 'REST API',
        description: 'Full API access for custom integrations',
        platforms: ['web', 'mobile', 'server'],
        documentation_url: 'https://docs.utp.gateway/api',
        setup_time: '30 minutes'
      },
      sdk: {
        name: 'SDK Libraries',
        description: 'Pre-built SDKs for popular platforms',
        platforms: [
          { name: 'JavaScript SDK', platform: 'web', complexity: 'Easy' },
          { name: 'iOS SDK', platform: 'ios', complexity: 'Easy' },
          { name: 'Android SDK', platform: 'android', complexity: 'Easy' }
        ],
        documentation_url: 'https://docs.utp.gateway/sdk',
        setup_time: '10 minutes'
      },
      plugin: {
        name: 'E-commerce Plugins',
        description: 'Pre-built plugins for e-commerce platforms',
        platforms: [
          { name: 'Shopify Plugin', platform: 'shopify', complexity: 'Easy' },
          { name: 'WooCommerce Plugin', platform: 'woocommerce', complexity: 'Medium' },
          { name: 'Magento Extension', platform: 'magento', complexity: 'Hard' }
        ],
        documentation_url: 'https://docs.utp.gateway/plugins',
        setup_time: '5 minutes'
      }
    };
  }

  // Get SDK downloads stats
  getSDKDownloadsStats() {
    const stats = Array.from(this.sdk_downloads.entries())
      .map(([integration_id, data]) => ({
        integration_id,
        downloads: data.downloads,
        platforms: data.platforms,
        created_at: data.created_at
      }));

    return {
      total_integrations: stats.length,
      total_downloads: stats.reduce((sum, s) => sum + s.downloads, 0),
      platform_breakdown: this.calculatePlatformBreakdown(stats),
      timestamp: new Date().toISOString()
    };
  }

  // Calculate platform breakdown
  calculatePlatformBreakdown(stats) {
    const breakdown = {};
    
    stats.forEach(stat => {
      stat.platforms.forEach(platform => {
        if (!breakdown[platform]) {
          breakdown[platform] = { count: 0, downloads: 0 };
        }
        breakdown[platform].count += 1;
        breakdown[platform].downloads += stat.downloads;
      });
    });

    return breakdown;
  }
}

// Initialize integration manager
const integrationManager = new UTPIntegrationManager();

// GET /api/integration/available - Get available integrations
router.get('/available', (req, res) => {
  try {
    const integrations = integrationManager.getAvailableIntegrations();
    res.json({
      success: true,
      integrations,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      error_code: 'INTEGRATIONS_FETCH_FAILED',
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/integration/create - Create new integration
router.post('/create', (req, res) => {
  try {
    const result = integrationManager.createIntegration(req.body);
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      error_code: 'INTEGRATION_CREATION_FAILED',
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/integration/webhook/create - Create webhook
router.post('/webhook/create', (req, res) => {
  try {
    const result = integrationManager.createWebhook(req.body);
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      error_code: 'WEBHOOK_CREATION_FAILED',
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/integration/webhook/trigger - Trigger webhook
router.post('/webhook/trigger', async (req, res) => {
  try {
    const { webhook_id, event_data } = req.body;
    const result = await integrationManager.triggerWebhook(webhook_id, event_data);
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      error_code: 'WEBHOOK_TRIGGER_FAILED',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/integration/webhook/:webhook_id - Get webhook details
router.get('/webhook/:webhook_id', (req, res) => {
  try {
    const result = integrationManager.getWebhookDetails(req.params.webhook_id);
    res.json({
      success: true,
      webhook: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: error.message,
      error_code: 'WEBHOOK_NOT_FOUND',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/integration/:integration_id - Get integration details
router.get('/:integration_id', (req, res) => {
  try {
    const result = integrationManager.getIntegrationDetails(req.params.integration_id);
    res.json({
      success: true,
      integration: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: error.message,
      error_code: 'INTEGRATION_NOT_FOUND',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/integration/sdk/stats - Get SDK download statistics
router.get('/sdk/stats', (req, res) => {
  try {
    const result = integrationManager.getSDKDownloadsStats();
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      error_code: 'SDK_STATS_FETCH_FAILED',
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/integration/sdk/download - Track SDK download
router.post('/sdk/download', (req, res) => {
  try {
    const { integration_id } = req.body;
    const stats = integrationManager.sdk_downloads.get(integration_id);
    
    if (stats) {
      stats.downloads += 1;
      integrationManager.sdk_downloads.set(integration_id, stats);
    }

    res.json({
      success: true,
      download_tracked: true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      error_code: 'DOWNLOAD_TRACKING_FAILED',
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;