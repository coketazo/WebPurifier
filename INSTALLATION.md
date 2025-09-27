# WebPurifier Installation Guide

## Prerequisites

- Python 3.8+
- Node.js 16+
- Chrome browser
- Git

## Quick Setup

### 1. Clone and Install Dependencies

```bash
git clone https://github.com/coketazo/WebPurifier.git
cd WebPurifier

# Install Node.js dependencies
npm install

# Install Python dependencies
npm run backend:install
```

### 2. Start the Backend API

```bash
# Option 1: Using npm script
npm run backend:dev

# Option 2: Manual start
cd backend
python run.py
```

The API will be available at `http://localhost:8000`

### 3. Install Chrome Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right corner)
3. Click "Load unpacked"
4. Select the `frontend` directory from the WebPurifier project
5. The WebPurifier extension should now appear in your extensions list

### 4. Using the Extension

1. **Click the extension icon** in your Chrome toolbar to open the popup
2. **Configure settings** using the toggle switches:
   - Block Ads: Remove advertisement elements
   - Block Trackers: Block tracking scripts
   - Block Popups: Remove popup overlays
3. **Analyze pages** by clicking the "Analyze" button
4. **Purify pages** by clicking the "Purify Page" button

## Development Mode

For development with automatic reloading:

```bash
# Start both backend and frontend in development mode
npm run dev
```

## Verification

### Test Backend API

```bash
# Check if backend is running
curl http://localhost:8000/health

# Test analysis endpoint
curl -X POST http://localhost:8000/api/v1/analyze \
  -H "Content-Type: application/json" \
  -d '{"html_content": "<div class=\"ad\">Ad</div>"}'
```

### Test Extension

1. Visit any website
2. Click the WebPurifier extension icon
3. You should see the popup interface with statistics
4. Try the "Analyze" and "Purify Page" buttons

## Troubleshooting

### Backend Issues

- **Port 8000 already in use**: Change the port in `backend/app/core/config.py`
- **Module not found errors**: Make sure Python dependencies are installed: `pip install -r backend/requirements.txt`

### Extension Issues

- **Extension not loading**: Make sure you selected the `frontend` directory, not the root project directory
- **API connection fails**: Ensure the backend is running on `http://localhost:8000`
- **Chrome storage errors**: These are expected when testing the popup outside of Chrome extension context

### CORS Issues

The backend is configured to allow Chrome extension requests. If you encounter CORS issues:

1. Check that the extension is properly loaded
2. Verify the backend CORS settings in `backend/app/main.py`

## Production Deployment

### Backend Deployment

For production deployment, consider:

1. Set environment variables:
   ```bash
   export DEBUG=false
   export HOST=0.0.0.0
   export PORT=8000
   ```

2. Use a production WSGI server:
   ```bash
   pip install gunicorn
   gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker
   ```

### Extension Distribution

To package the extension for distribution:

```bash
cd frontend
npm run package
```

This creates a `webpurifier-extension.zip` file ready for Chrome Web Store submission.

## Support

For issues or questions:

1. Check the [README.md](README.md) for detailed documentation
2. Open an issue on GitHub
3. Review the console logs in Chrome DevTools for debugging