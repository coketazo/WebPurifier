# WebPurifier

A powerful monorepo containing a FastAPI backend and Chrome extension frontend for purifying websites by removing ads, trackers, and unwanted content.

## 🏗️ Architecture

This is a monorepo with two main components:

- **Backend** (`/backend`): FastAPI application providing web purification services
- **Frontend** (`/frontend`): Chrome browser extension for client-side interaction

## 🚀 Quick Start

### Prerequisites

- Python 3.8+
- Node.js 16+
- Chrome browser (for extension development)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/coketazo/WebPurifier.git
cd WebPurifier
```

2. Install dependencies:
```bash
# Install Node.js dependencies
npm install

# Install Python dependencies
npm run backend:install
```

### Development

#### Backend (FastAPI)

```bash
# Start the backend server
npm run backend:dev

# Or manually:
cd backend
python run.py
```

The API will be available at `http://localhost:8000`

#### Frontend (Chrome Extension)

1. Build the extension:
```bash
npm run frontend:build
```

2. Load the extension in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `/frontend` directory

#### Development Mode

Run both backend and frontend in development mode:
```bash
npm run dev
```

## 📁 Project Structure

```
WebPurifier/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── api/            # API routes
│   │   ├── core/           # Core configuration
│   │   └── models/         # Data models
│   ├── requirements.txt    # Python dependencies
│   └── run.py             # Server startup script
├── frontend/               # Chrome extension
│   ├── js/                # JavaScript files
│   ├── css/               # Stylesheets
│   ├── icons/             # Extension icons
│   ├── manifest.json      # Extension manifest
│   └── popup.html         # Extension popup
├── package.json           # Root package.json
└── README.md             # This file
```

## 🔧 API Endpoints

### Backend API (`http://localhost:8000`)

- `GET /` - API status
- `GET /health` - Health check
- `GET /api/v1/status` - Purifier service status
- `POST /api/v1/purify` - Purify a website URL
- `POST /api/v1/analyze` - Analyze HTML content

### Example Usage

```bash
# Analyze a website
curl -X POST "http://localhost:8000/api/v1/analyze" \
  -H "Content-Type: application/json" \
  -d '{"html_content": "<html>...</html>"}'

# Purify a website
curl -X POST "http://localhost:8000/api/v1/purify" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "remove_ads": true,
    "remove_trackers": true,
    "remove_popups": true
  }'
```

## 🎯 Features

### Backend Features
- Web content analysis
- Ad removal algorithms
- Tracker detection and blocking
- Popup elimination
- RESTful API with FastAPI
- CORS support for Chrome extensions

### Frontend Features
- Real-time page analysis
- One-click purification
- Customizable filtering options
- Statistics tracking
- Auto-protection mode
- Modern popup interface

## 🧪 Testing

```bash
# Run all tests
npm test

# Backend tests only
npm run backend:test

# Frontend tests only
npm run frontend:test
```

## 🔍 Linting

```bash
# Lint all code
npm run lint

# Backend linting only
npm run backend:lint

# Frontend linting only
npm run frontend:lint
```

## 📦 Building

```bash
# Build everything
npm run build

# Build extension for distribution
cd frontend && npm run package
```

## 🤝 Chrome Extension Development

### Loading the Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" and select the `frontend` directory
4. The WebPurifier extension should now appear in your extensions list

### Extension Features

- **Popup Interface**: Click the extension icon to open the control panel
- **Content Filtering**: Automatically removes ads, trackers, and popups
- **Statistics**: View blocked elements count
- **Settings**: Customize filtering preferences
- **Auto-Protection**: Optional automatic protection for all pages

## 🔧 Configuration

### Backend Configuration

Create a `.env` file in the backend directory:

```env
APP_NAME=WebPurifier API
DEBUG=true
HOST=0.0.0.0
PORT=8000
```

### Extension Configuration

Settings are managed through the Chrome extension's popup interface and stored in Chrome's storage API.

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes and test
4. Submit a pull request

## 📞 Support

For issues and questions, please open an issue on GitHub.