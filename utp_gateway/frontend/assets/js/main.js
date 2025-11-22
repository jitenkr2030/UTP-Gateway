// UTP Gateway - Main JavaScript File

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// Initialize the application
function initializeApp() {
    console.log('🚀 Initializing UTP Gateway...');
    
    // Initialize components
    initializeNavigation();
    initializeHeroAnimations();
    initializeTokenSelection();
    initializeScrollAnimations();
    initializeMobileMenu();
    
    // Initialize API connections
    initializeAPIConnections();
    
    console.log('✅ UTP Gateway initialized successfully!');
}

// Navigation functionality
function initializeNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                const offsetTop = targetSection.offsetTop - 80; // Account for fixed navbar
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Mobile menu functionality
function initializeMobileMenu() {
    const navToggle = document.getElementById('nav-toggle');
    const navMenu = document.getElementById('nav-menu');
    
    if (navToggle && navMenu) {
        navToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            navToggle.classList.toggle('active');
        });
        
        // Close menu when clicking on links
        const navLinks = navMenu.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
                navToggle.classList.remove('active');
            });
        });
    }
}

// Hero animations and interactions
function initializeHeroAnimations() {
    // Animate stats counter
    animateCounters();
    
    // Add hover effects to demo elements
    const tokenOptions = document.querySelectorAll('.token-option');
    tokenOptions.forEach(option => {
        option.addEventListener('click', function() {
            // Remove active class from all options
            tokenOptions.forEach(opt => opt.classList.remove('active'));
            
            // Add active class to clicked option
            this.classList.add('active');
            
            // Update conversion display
            updateConversionDisplay(this);
        });
    });
}

// Animate counter numbers
function animateCounters() {
    const counters = document.querySelectorAll('.stat-number');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const counter = entry.target;
                const target = parseInt(counter.textContent.replace(/[^\d]/g, ''));
                const duration = 2000; // 2 seconds
                const step = target / (duration / 16); // 60fps
                let current = 0;
                
                const timer = setInterval(() => {
                    current += step;
                    if (current >= target) {
                        current = target;
                        clearInterval(timer);
                    }
                    
                    // Format number based on original content
                    const originalText = counter.getAttribute('data-original') || counter.textContent;
                    if (originalText.includes('K+')) {
                        counter.textContent = Math.floor(current / 1000) + 'K+';
                    } else if (originalText.includes('₹') && originalText.includes('Cr+')) {
                        counter.textContent = '₹' + (current / 10000000).toFixed(0) + 'Cr+';
                    } else if (originalText.includes('<') && originalText.includes('s')) {
                        counter.textContent = '<' + Math.ceil(current) + 's';
                    } else if (originalText.includes('%')) {
                        counter.textContent = current.toFixed(2) + '%';
                    } else {
                        counter.textContent = Math.floor(current);
                    }
                }, 16);
                
                observer.unobserve(counter);
            }
        });
    });
    
    counters.forEach(counter => {
        counter.setAttribute('data-original', counter.textContent);
        observer.observe(counter);
    });
}

// Update conversion display
function updateConversionDisplay(selectedOption) {
    const tokenData = {
        'bgt': { name: 'Gold (BGT)', amount: '1.77g', price: 5650 },
        'binr': { name: 'BINR Stablecoin', amount: '1,000 BINR', price: 1 },
        'bst': { name: 'Silver (BST)', amount: '13.79g', price: 72.50 }
    };
    
    const selectedToken = selectedOption.dataset.token;
    const token = tokenData[selectedToken];
    
    if (token) {
        const payBtn = document.querySelector('.demo-pay-btn');
        if (payBtn) {
            payBtn.innerHTML = `<i class="fas fa-check"></i> Pay with ${token.name}`;
        }
        
        // Update conversion flow visualization
        updateConversionFlow(selectedToken);
    }
}

// Update conversion flow visualization
function updateConversionFlow(tokenType) {
    const flowSteps = document.querySelectorAll('.flow-step');
    
    // Simulate the conversion process
    setTimeout(() => {
        flowSteps.forEach((step, index) => {
            setTimeout(() => {
                step.classList.add('processing');
                
                setTimeout(() => {
                    step.classList.remove('processing');
                }, 1000);
            }, index * 500);
        });
    }, 500);
}

// Token selection functionality
function initializeTokenSelection() {
    const tokenOptions = document.querySelectorAll('.token-option');
    
    tokenOptions.forEach(option => {
        option.addEventListener('click', function() {
            // Remove active class from siblings
            const siblings = this.parentElement.querySelectorAll('.token-option');
            siblings.forEach(sibling => sibling.classList.remove('active'));
            
            // Add active class to this option
            this.classList.add('active');
            
            // Add visual feedback
            this.style.transform = 'scale(0.98)';
            setTimeout(() => {
                this.style.transform = 'scale(1)';
            }, 150);
        });
    });
}

// Scroll animations
function initializeScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);
    
    // Observe elements for animation
    const animateElements = document.querySelectorAll('.feature-card, .token-card, .workflow-step, .pricing-card');
    animateElements.forEach(el => observer.observe(el));
}

// Initialize API connections
async function initializeAPIConnections() {
    try {
        // Check UTP Gateway API health
        const response = await fetch('http://localhost:3002/health');
        const health = await response.json();
        
        if (health.status === 'healthy') {
            console.log('✅ UTP Gateway API is healthy');
            updateSystemStatus('online');
        }
    } catch (error) {
        console.warn('⚠️ UTP Gateway API not available:', error);
        updateSystemStatus('offline');
    }
}

// Update system status indicator
function updateSystemStatus(status) {
    const statusIndicators = document.querySelectorAll('.dashboard-status');
    statusIndicators.forEach(indicator => {
        if (status === 'online') {
            indicator.className = 'dashboard-status online';
            indicator.innerHTML = '<i class="fas fa-circle"></i> Online';
        } else {
            indicator.className = 'dashboard-status offline';
            indicator.innerHTML = '<i class="fas fa-circle"></i> Offline';
        }
    });
}

// Payment Demo Functions
function startPaymentDemo() {
    showPaymentModal();
}

function showPaymentModal() {
    const modal = createPaymentModal();
    document.body.appendChild(modal);
    
    // Add animation
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

function createPaymentModal() {
    const modal = document.createElement('div');
    modal.className = 'payment-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Payment Demo</h3>
                <button class="modal-close" onclick="closeModal(this)">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="demo-payment-form">
                    <div class="form-group">
                        <label>Amount (INR)</label>
                        <input type="number" id="demoAmount" value="1000" min="10" max="100000">
                    </div>
                    
                    <div class="form-group">
                        <label>Payment Token</label>
                        <select id="demoToken">
                            <option value="bgt">Gold (BGT) - ₹5,650/g</option>
                            <option value="binr">BINR Stablecoin - ₹1</option>
                            <option value="bst">Silver (BST) - ₹72.50/g</option>
                            <option value="bpt">Platinum (BPT) - ₹3,200/g</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Settlement Type</label>
                        <select id="demoSettlement">
                            <option value="inr">Instant INR</option>
                            <option value="binr">BINR Tokens</option>
                            <option value="bgt">Gold Tokens</option>
                            <option value="mixed">Mixed Settlement</option>
                        </select>
                    </div>
                    
                    <div class="demo-conversion">
                        <div class="conversion-result">
                            <div class="conversion-label">You will pay:</div>
                            <div class="conversion-amount" id="conversionAmount">1.77g Gold</div>
                        </div>
                    </div>
                    
                    <div class="demo-actions">
                        <button class="btn btn-primary" onclick="processDemoPayment()">
                            <i class="fas fa-coins"></i>
                            Process Payment
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add event listeners
    const amountInput = modal.querySelector('#demoAmount');
    const tokenSelect = modal.querySelector('#demoToken');
    
    amountInput.addEventListener('input', updateDemoConversion);
    tokenSelect.addEventListener('change', updateDemoConversion);
    
    return modal;
}

function updateDemoConversion() {
    const amount = parseFloat(document.getElementById('demoAmount').value) || 0;
    const token = document.getElementById('demoToken').value;
    const conversionElement = document.getElementById('conversionAmount');
    
    const conversions = {
        'bgt': { rate: 5650, unit: 'g', symbol: 'Gold' },
        'binr': { rate: 1, unit: 'BINR', symbol: 'BINR' },
        'bst': { rate: 72.50, unit: 'g', symbol: 'Silver' },
        'bpt': { rate: 3200, unit: 'g', symbol: 'Platinum' }
    };
    
    const conversion = conversions[token];
    if (conversion) {
        const convertedAmount = (amount / conversion.rate).toFixed(2);
        conversionElement.textContent = `${convertedAmount} ${conversion.symbol}`;
    }
}

async function processDemoPayment() {
    const button = event.target;
    const originalText = button.innerHTML;
    
    // Show loading state
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    button.disabled = true;
    
    try {
        // Simulate payment processing
        await simulatePayment();
        
        // Show success
        button.innerHTML = '<i class="fas fa-check"></i> Payment Successful!';
        button.className = 'btn btn-success';
        
        // Close modal after delay
        setTimeout(() => {
            closeModal(button);
            showSuccessToast('Payment processed successfully!');
        }, 2000);
        
    } catch (error) {
        // Show error
        button.innerHTML = '<i class="fas fa-times"></i> Payment Failed';
        button.className = 'btn btn-error';
        
        setTimeout(() => {
            button.innerHTML = originalText;
            button.disabled = false;
            button.className = 'btn btn-primary';
        }, 2000);
    }
}

function simulatePayment() {
    return new Promise((resolve) => {
        setTimeout(resolve, 2000 + Math.random() * 2000);
    });
}

// Modal functions
function closeModal(element) {
    const modal = element.closest('.payment-modal');
    modal.classList.remove('show');
    setTimeout(() => {
        document.body.removeChild(modal);
    }, 300);
}

// Success toast
function showSuccessToast(message) {
    const toast = document.createElement('div');
    toast.className = 'success-toast';
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas fa-check-circle"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
}

// Other utility functions
function openDocumentation() {
    window.open('https://docs.utp.gateway', '_blank');
}

function openMerchantDemo() {
    showPaymentModal();
}

function startMerchantOnboarding() {
    // Redirect to dashboard or onboarding flow
    window.location.href = 'dashboard.html';
}

function scheduleDemo() {
    // In a real implementation, this would open a calendar booking modal
    showSuccessToast('Demo booking feature coming soon!');
}

// Event listeners for CTAs
document.addEventListener('click', function(e) {
    if (e.target.closest('[data-cta]')) {
        const ctaType = e.target.closest('[data-cta]').dataset.cta;
        
        switch (ctaType) {
            case 'get-started':
                startMerchantOnboarding();
                break;
            case 'demo':
                openMerchantDemo();
                break;
            case 'docs':
                openDocumentation();
                break;
        }
    }
});

// Performance monitoring
function trackPerformance() {
    if ('performance' in window) {
        window.addEventListener('load', () => {
            setTimeout(() => {
                const perfData = performance.getEntriesByType('navigation')[0];
                console.log('📊 Page Load Performance:', {
                    domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
                    loadComplete: perfData.loadEventEnd - perfData.loadEventStart,
                    totalTime: perfData.loadEventEnd - perfData.navigationStart
                });
            }, 1000);
        });
    }
}

trackPerformance();

// Error handling
window.addEventListener('error', function(e) {
    console.error('🚨 Application Error:', {
        message: e.message,
        filename: e.filename,
        line: e.lineno,
        column: e.colno,
        error: e.error
    });
});

// Service Worker registration (for PWA capabilities)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('🔧 Service Worker registered:', registration);
            })
            .catch(error => {
                console.log('Service Worker registration failed:', error);
            });
    });
}