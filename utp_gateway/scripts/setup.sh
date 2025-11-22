#!/bin/bash

# UTP Gateway Setup Script
echo "🏆 Setting up UTP Gateway..."
echo "================================"

# Check Node.js version
echo "📋 Checking Node.js version..."
node_version=$(node --version 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "✅ Node.js version: $node_version"
else
    echo "❌ Node.js not found. Please install Node.js 16+ from https://nodejs.org/"
    exit 1
fi

# Check npm
echo "📋 Checking npm..."
npm_version=$(npm --version 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "✅ npm version: $npm_version"
else
    echo "❌ npm not found. Please install npm."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Create environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "🔧 Creating environment file..."
    cp .env.example .env
    echo "✅ Environment file created (.env)"
    echo "⚠️  Please edit .env file with your configuration"
else
    echo "✅ Environment file already exists"
fi

# Create directories if they don't exist
echo "📁 Creating directories..."
mkdir -p logs
mkdir -p data
mkdir -p config
echo "✅ Directories created"

# Check if all files are in place
echo "🔍 Verifying file structure..."

required_files=(
    "backend/server.js"
    "backend/config/index.js"
    "backend/middleware/auth.middleware.js"
    "backend/middleware/validation.middleware.js"
    "backend/middleware/error.middleware.js"
    "backend/routes/auth.routes.js"
    "backend/routes/payments.routes.js"
    "backend/routes/merchant.routes.js"
    "backend/routes/settlement.routes.js"
    "backend/services/conversion.js"
    "backend/services/settlement.js"
    "frontend/pages/index.html"
    "frontend/pages/dashboard.html"
    "frontend/assets/css/main.css"
    "frontend/assets/js/main.js"
    "package.json"
    "README.md"
)

missing_files=()
for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        missing_files+=("$file")
    fi
done

if [ ${#missing_files[@]} -eq 0 ]; then
    echo "✅ All required files are present"
else
    echo "❌ Missing files:"
    for file in "${missing_files[@]}"; do
        echo "   - $file"
    done
    exit 1
fi

# Test basic syntax
echo "🧪 Testing code syntax..."
node -c backend/server.js
if [ $? -eq 0 ]; then
    echo "✅ server.js syntax is valid"
else
    echo "❌ server.js has syntax errors"
    exit 1
fi

# Run a quick health check
echo "🏥 Starting health check..."
timeout 5s npm start > /tmp/utp_health.log 2>&1 &
health_pid=$!
sleep 3

if curl -s http://localhost:3002/health > /dev/null 2>&1; then
    echo "✅ Health check passed - server is running"
else
    echo "⚠️  Health check failed - but setup is complete"
fi

# Kill the test server
kill $health_pid 2>/dev/null

echo ""
echo "🎉 UTP Gateway setup completed successfully!"
echo "================================"
echo ""
echo "🚀 Quick Start Commands:"
echo "   npm start          - Start production server"
echo "   npm run dev        - Start development server with nodemon"
echo "   npm test           - Run tests"
echo "   npm run health     - Check server health"
echo ""
echo "🌐 Access Points:"
echo "   Frontend:  http://localhost:3002"
echo "   Dashboard: http://localhost:3002/dashboard"
echo "   API:       http://localhost:3002/api"
echo "   Health:    http://localhost:3002/health"
echo "   Status:    http://localhost:3002/status"
echo ""
echo "📚 Next Steps:"
echo "   1. Edit .env file with your configuration"
echo "   2. Run 'npm run dev' to start development server"
echo "   3. Visit http://localhost:3002 to see your UTP Gateway"
echo ""
echo "💡 Need help? Check README.md or contact support@utpgateway.com"
echo "================================"