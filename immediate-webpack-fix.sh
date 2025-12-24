#!/bin/bash

# Immediate Webpack Flag Fix for MSP Checklist
# Run this on your EC2 instance to fix the --webpack flag issue

echo "🔧 Immediate Webpack Flag Fix"
echo "============================="

# Navigate to the project directory
cd /opt/msp-checklist-system/msp-checklist || {
    echo "❌ Could not find project directory"
    exit 1
}

echo "📍 Current directory: $(pwd)"

# Backup current package.json
cp package.json package.json.backup.$(date +%Y%m%d_%H%M%S)
echo "✅ Backed up package.json"

# Create fixed package.json without --webpack flag and updated Next.js version
echo "📝 Creating fixed package.json..."
cat > package.json << 'EOF'
{
  "name": "msp-checklist",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "bcryptjs": "^2.4.3",
    "better-sqlite3": "^9.2.2",
    "eslint": "^9.0.0",
    "eslint-config-next": "15.1.3",
    "lucide-react": "^0.263.1",
    "next": "15.1.3",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "typescript": "^5"
  }
}
EOF

echo "✅ Updated package.json (removed --webpack flag, updated Next.js)"

# Clean npm cache
echo "🧹 Cleaning npm cache..."
npm cache clean --force

# Remove node_modules and lock files
echo "🗑️ Removing old dependencies..."
rm -rf node_modules package-lock.json

# Install with legacy peer deps
echo "📦 Installing updated dependencies..."
npm install --legacy-peer-deps --no-fund --no-audit

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully!"
    
    # Try to build without --webpack flag
    echo "🔨 Attempting to build (without --webpack flag)..."
    npm run build
    
    if [ $? -eq 0 ]; then
        echo "🎉 Build successful!"
        echo ""
        echo "✅ The --webpack flag issue has been resolved!"
        echo ""
        echo "Next steps:"
        echo "1. Continue with PM2 startup: pm2 start ecosystem.config.js"
        echo "2. Or run the deployment script again"
    else
        echo "⚠️ Build still failed, but --webpack issue is fixed"
        echo "There may be other issues to resolve"
    fi
else
    echo "❌ Dependency installation failed"
    echo "Restoring backup..."
    cp package.json.backup.* package.json
    exit 1
fi

echo ""
echo "🏁 Webpack flag fix completed!"