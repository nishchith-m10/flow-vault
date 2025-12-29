#!/bin/bash
# Start the n8n Deploy Dashboard
# Opens a local server and launches the browser

PORT=3333
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🚀 Starting n8n Deploy Dashboard..."
echo "   Open: http://localhost:$PORT"
echo "   Press Ctrl+C to stop"
echo ""

# Open browser after a short delay
(sleep 1 && open "http://localhost:$PORT/n8n_deploy_ui.html") &

# Start simple Python server
cd "$DIR"
python3 -m http.server $PORT
