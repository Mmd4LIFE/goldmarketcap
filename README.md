# Gold Market Cap

Real-time gold price tracking dashboard with professional UI and analytics.

## Features

- 🔄 **Real-time Price Tracking** - Collects gold prices from 9+ Iranian sources every 60 seconds
- 📊 **Professional Dashboard** - Beautiful Next.js frontend with live updates and price change animations
- 📈 **Historical Charts** - Interactive charts with minute and hour intervals using Recharts
- 🏆 **Dynamic Rankings** - Automatic source ranking by price with change indicators
- 🔐 **Secure API** - Bearer token authentication for API and Telegram bot access
- 🐳 **Fully Dockerized** - Easy deployment with Docker Compose
- 💾 **PostgreSQL Database** - Reliable storage for price history

## Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **SQLAlchemy** - ORM for database operations
- **PostgreSQL** - Database for price storage
- **httpx** - Async HTTP client for data collection

### Frontend
- **Next.js 14** - React framework with SSR
- **Tailwind CSS** - Utility-first styling
- **SWR** - Data fetching with caching
- **Recharts** - Interactive charting library

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Git

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Mmd4LIFE/goldmarketcap.git
cd goldmarketcap
```

2. Create `.env` file in the project root:
```env
# Database
DATABASE_URL=postgresql+psycopg://gold_user:gold_password@postgres:5432/gold_price

# Collector Settings
COLLECTOR_INTERVAL_SECONDS=60
HTTP_TIMEOUT_SECONDS=30

# API Authentication
API_BEARER_TOKEN=your-secure-token-here
TELEGRAM_BEARER_TOKEN=your-telegram-token-here

# External API Keys (optional)
TGJU_API_TOKEN=

# CORS
ALLOWED_ORIGINS=http://localhost:3000

# Logging
LOG_LEVEL=INFO

# Frontend
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_API_TOKEN=your-secure-token-here
```

3. Build and start the services:
```bash
docker compose up -d --build
```

4. Access the dashboard:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/docs
- PostgreSQL: localhost:5433

## Architecture

```
┌─────────────────┐
│   Next.js UI    │ :3000
│   (Frontend)    │
└────────┬────────┘
         │
         │ HTTP/REST
         ▼
┌─────────────────┐
│   FastAPI       │ :8000
│   (Backend)     │
└────────┬────────┘
         │
         ├─► Price Collector (60s interval)
         │   ├─ Milli
         │   ├─ Taline
         │   ├─ Daric
         │   ├─ Goldika
         │   ├─ Talasea
         │   ├─ Wallgold
         │   ├─ Technogold
         │   ├─ Digikala
         │   └─ TGJU
         │
         ▼
┌─────────────────┐
│   PostgreSQL    │ :5432
│   (Database)    │
└─────────────────┘
```

## API Endpoints

### Price Endpoints

- `GET /api/v1/prices/latest` - Get latest prices from all sources
- `GET /api/v1/prices/{source}/latest` - Get latest price for specific source
- `GET /api/v1/prices/{source}/history` - Get price history (minute/hour intervals)

### Telegram Bot Endpoints

- `GET /api/v1/telegram/prices/latest` - Special endpoint for Telegram bot

### System

- `GET /api/v1/health` - Health check

All endpoints require Bearer token authentication via `Authorization: Bearer <token>` header.

## Data Sources

The system collects gold prices from multiple Iranian sources:

1. **Milli** - milli.gold
2. **Taline** - taline.com
3. **Daric** - daric.ir
4. **Goldika** - goldika.com
5. **Talasea** - talasea.com
6. **Wallgold** - wallgold.ir
7. **Technogold** - technogold.ir
8. **Digikala** - digikala.com
9. **ESTJT** - estjt.com

## Development

### Backend Development

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend Development

```bash
cd frontend
npm install
npm run dev
```

## Environment Variables

### Backend (.env)
- `DATABASE_URL` - PostgreSQL connection string
- `API_BEARER_TOKEN` - Token for API authentication
- `TELEGRAM_BEARER_TOKEN` - Token for Telegram bot
- `COLLECTOR_INTERVAL_SECONDS` - Collection interval (default: 60)
- `ALLOWED_ORIGINS` - CORS allowed origins

### Frontend
- `NEXT_PUBLIC_API_BASE_URL` - Backend API URL
- `NEXT_PUBLIC_API_TOKEN` - API authentication token

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
