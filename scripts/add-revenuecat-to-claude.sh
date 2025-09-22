#!/bin/bash

# Script to add RevenueCat MCP to Claude Desktop configuration
# This adds the RevenueCat HTTP transport MCP server

CONFIG_FILE="$HOME/Library/Application Support/Claude/claude_desktop_config.json"

# Your RevenueCat API Key (IMPORTANT: Keep this secret!)
REVENUECAT_API_KEY="sk_NwaebOrtgTNIWxHRYqbMFkxYNmXlf"

echo "🚀 Adding RevenueCat MCP to Claude Desktop..."

# Check if config file exists
if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ Claude Desktop config not found. Creating new configuration..."
    mkdir -p "$HOME/Library/Application Support/Claude"
    echo '{"mcpServers": {}}' > "$CONFIG_FILE"
fi

# Create backup
cp "$CONFIG_FILE" "$CONFIG_FILE.backup.$(date +%Y%m%d_%H%M%S)"
echo "✅ Backup created"

# Add RevenueCat MCP using jq (or Python if jq not available)
if command -v jq &> /dev/null; then
    # Use jq to update the JSON
    jq --arg key "$REVENUECAT_API_KEY" '.mcpServers.revenuecat = {
        "transport": "http",
        "url": "https://mcp.revenuecat.ai/mcp",
        "headers": {
            "Authorization": "Bearer " + $key
        }
    }' "$CONFIG_FILE" > "$CONFIG_FILE.tmp" && mv "$CONFIG_FILE.tmp" "$CONFIG_FILE"
else
    # Use Python as fallback
    python3 << EOF
import json
import sys

config_file = "$CONFIG_FILE"
api_key = "$REVENUECAT_API_KEY"

try:
    with open(config_file, 'r') as f:
        config = json.load(f)
except:
    config = {"mcpServers": {}}

# Add RevenueCat configuration
config.setdefault("mcpServers", {})
config["mcpServers"]["revenuecat"] = {
    "transport": "http",
    "url": "https://mcp.revenuecat.ai/mcp",
    "headers": {
        "Authorization": f"Bearer {api_key}"
    }
}

# Write back to file with proper formatting
with open(config_file, 'w') as f:
    json.dump(config, f, indent= 2)

print("✅ RevenueCat MCP added successfully")
EOF
fi

echo ""
echo "✅ RevenueCat MCP has been added to Claude Desktop!"
echo ""
echo "📋 Configuration added:"
echo "   Server: revenuecat"
echo "   Type: HTTP Transport"
echo "   URL: https://mcp.revenuecat.ai/mcp"
echo "   API Key: sk_****" 
echo ""
echo "🔄 Please restart Claude Desktop for changes to take effect"
echo ""
echo "📚 Available commands in Claude:"
echo "   - List all products"
echo "   - Check subscription status"
echo "   - Create new products"
echo "   - Manage entitlements"
echo "   - View revenue metrics"
echo ""
echo "⚠️  Security Note: Your API key is stored in the config file."
echo "   Location: $CONFIG_FILE"
echo "   Keep this file secure!"