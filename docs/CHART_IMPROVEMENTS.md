# Chart Pages Improvements

## Summary

This document outlines the improvements made to the chart visualization system for gold prices.

## Backend Changes

### New API Endpoints

#### 1. Minutely History Endpoint
**Endpoint:** `GET /v1/prices/{source}/history/minute`

**Purpose:** Returns minute-by-minute price data with buy/sell separated for two-sided sources

**Response:**
```json
{
  "source": "milli",
  "interval": "minute",
  "has_sides": true,
  "points": [
    {
      "bucket": "2024-01-01T12:00:00Z",
      "buy_price": "10500.5",
      "sell_price": "10450.2"
    }
  ]
}
```

For one-sided sources:
```json
{
  "source": "tgju",
  "interval": "minute",
  "has_sides": false,
  "points": [
    {
      "bucket": "2024-01-01T12:00:00Z",
      "average_price": "10475.0"
    }
  ]
}
```

#### 2. Hourly Candlestick Endpoint
**Endpoint:** `GET /v1/prices/{source}/history/hour/candles`

**Purpose:** Returns OHLC (Open, High, Low, Close) candlestick data for hourly analysis

**Response for two-sided sources:**
```json
{
  "source": "milli",
  "interval": "hour",
  "has_sides": true,
  "buy_candles": [
    {
      "bucket": "2024-01-01T12:00:00Z",
      "open": "10500.5",
      "high": "10550.0",
      "low": "10480.0",
      "close": "10520.0"
    }
  ],
  "sell_candles": [
    {
      "bucket": "2024-01-01T12:00:00Z",
      "open": "10450.2",
      "high": "10500.0",
      "low": "10430.0",
      "close": "10470.0"
    }
  ]
}
```

### New Database Methods

#### `GoldPrice.get_minute_history_by_side()`
- Groups minutely data by bucket and side (buy/sell/default)
- Calculates average price per minute for each side

#### `GoldPrice.get_hour_candles_by_side()`
- Calculates OHLC data for each hour
- Separates data by side for two-sided sources
- Open: First price in the hour
- Close: Last price in the hour
- High: Maximum price in the hour
- Low: Minimum price in the hour

#### `GoldPrice.check_has_sides()`
- Determines if a source has buy/sell sides or is one-sided
- Used to determine which chart type to display

## Frontend Changes

### New Components

#### 1. MinuteChart Component
**File:** `frontend/components/MinuteChart.tsx`

**Features:**
- For **one-sided sources**: Shows single line chart (average price)
- For **two-sided sources**: Shows two lines (buy and sell prices)
- Professional styling with:
  - Blue line for buy prices
  - Amber line for sell prices
  - Green line for one-sided prices
  - Smooth animations
  - Interactive tooltips

#### 2. CandlestickChart Component
**File:** `frontend/components/CandlestickChart.tsx`

**Features:**
- Professional candlestick visualization like crypto charts
- For **two-sided sources**: Shows separate candlestick charts for buy and sell
- For **one-sided sources**: Shows single candlestick chart
- Color coding:
  - Green/Blue/Amber candles for price increases (close > open)
  - Red candles for price decreases (close < open)
- Shows:
  - Candle body (open to close)
  - Upper wick (close/open to high)
  - Lower wick (low to open/close)
- Rich tooltips showing OHLC values and percentage change

#### 3. Updated PriceHistoryChart Component
**File:** `frontend/components/PriceHistoryChart.tsx`

**Features:**
- Smart switching between minute and hourly views
- Fetches data using SWR for automatic caching and revalidation
- Minute data refreshes every 60 seconds
- Hourly data refreshes every 5 minutes
- Clean UI with interval toggle buttons
- Emoji indicators for better UX

### Updated TypeScript Types

Added new interfaces to support the new API responses:
- `MinuteHistoryPoint`
- `MinuteHistoryResponse`
- `HourCandlePoint`
- `HourCandleResponse`

Added new fetch functions:
- `fetchMinuteHistory(source)`
- `fetchHourCandles(source)`

## Visual Improvements

### Minutely Charts
- **One-sided sources**: Clean single line showing price trends
- **Two-sided sources**: Dual lines showing buy/sell spread

### Hourly Charts
- **Professional candlestick charts** like TradingView or crypto exchanges
- **Visual price action**: Instantly see bullish (green) vs bearish (red) periods
- **OHLC data**: Complete price information for each hour
- **Separate charts** for buy/sell on two-sided sources

### UI/UX Enhancements
- 📈 Minute button with chart emoji
- 🕯️ Hourly button with candle emoji
- 💰 Buy price indicator
- 💵 Sell price indicator
- Dynamic chart type indicator in header
- Smooth transitions between views
- Professional dark theme matching the rest of the application

## Technical Highlights

1. **Efficient Queries**: Uses SQL aggregations to calculate OHLC data at the database level
2. **Smart Caching**: SWR library ensures efficient data fetching with automatic revalidation
3. **Type Safety**: Full TypeScript support with proper interfaces
4. **Responsive Design**: Charts adapt to container size using Recharts' ResponsiveContainer
5. **Currency Conversion**: Automatic IRR to IRT conversion in API responses
6. **Error Handling**: Graceful error states with user-friendly messages
7. **Loading States**: Professional loading spinners during data fetch

## Usage

### Viewing Charts
1. Navigate to any source's chart page: `/chart/{source}`
2. Toggle between "Minute" and "Hourly (Candles)" views
3. For minute view:
   - One-sided sources show a single trend line
   - Two-sided sources show buy (blue) and sell (amber) lines
4. For hourly view:
   - See candlestick analysis with OHLC data
   - Two-sided sources show separate buy and sell candlestick charts

### API Integration
```typescript
// Fetch minute data
const minuteData = await fetchMinuteHistory("milli");

// Fetch hourly candles
const hourData = await fetchHourCandles("milli");
```

## Benefits

1. **Better Price Visibility**: Separate buy/sell visualization shows the spread
2. **Professional Analysis**: Candlestick charts provide deeper insights into price action
3. **Market Understanding**: Easily see bullish/bearish trends
4. **Informed Decisions**: OHLC data helps understand price volatility
5. **Modern UX**: Charts match industry standards from crypto/trading platforms

## Future Enhancements

Potential improvements for the future:
- Volume indicators
- Technical analysis overlays (MA, RSI, MACD)
- Zoom and pan functionality
- Export chart data
- Custom time ranges
- Compare multiple sources on one chart

