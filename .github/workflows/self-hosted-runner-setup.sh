#!/bin/bash
# Setup script for GitHub Actions self-hosted runner
# Run this on your self-hosted runner machine once

set -e

echo "=== AI Test Manager - Self-Hosted Runner Setup ==="

# Install Node.js 20
echo "Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Playwright dependencies
echo "Installing Playwright system dependencies..."
sudo apt-get install -y \
  libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 \
  libdrm2 libdbus-1-3 libxkbcommon0 libxcomposite1 libxdamage1 \
  libxfixes3 libxrandr2 libgbm1 libasound2

# Install Playwright browsers
echo "Installing Playwright browsers..."
npx playwright install chromium

# Download and configure GitHub Actions runner
echo ""
echo "Next steps - register your self-hosted runner:"
echo "1. Go to your GitHub repo → Settings → Actions → Runners"
echo "2. Click 'New self-hosted runner' and follow the instructions"
echo "3. After registration, set the runner label to 'self-hosted'"
echo ""
echo "4. To enable self-hosted runner in the workflow, set this repo variable:"
echo "   Settings → Actions → Variables → New: USE_SELF_HOSTED = true"
echo ""
echo "5. Set these repository secrets:"
echo "   ANTHROPIC_API_KEY = your Anthropic API key"
echo "   SLACK_WEBHOOK_URL = your Slack incoming webhook URL"
echo "   TEST_MANAGER_URL = http://your-server:3001"
echo ""
echo "Done! Run the GitHub Actions runner service to start listening for jobs."
