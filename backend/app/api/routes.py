from __future__ import annotations

from datetime import datetime, timedelta
from typing import Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import get_collector
from ..models import GoldPrice
from ..schemas import (
    DEFAULT_SIDE_KEY,
    AnalyticsStats,
    GoldPriceOut,
    HealthResponse,
    LatestPricesResponse,
    PriceHistoryPoint,
    PriceHistoryResponse,
)
from ..security import api_auth, telegram_auth
from ..services.collector import GoldPriceCollector
from ..services.price_tracker import PriceTracker

router = APIRouter(prefix="/v1", tags=["prices"])
price_tracker = PriceTracker()


def _build_latest_response(prices: Dict[str, Dict[str | None, GoldPrice | None]], db: Session = None) -> LatestPricesResponse:
    from decimal import Decimal
    
    # Calculate average prices for each source
    source_averages = {}
    for source, sides in prices.items():
        buy_price = None
        sell_price = None
        default_price = None
        
        for side, record in sides.items():
            if not record:
                continue
            price = Decimal(record.price)
            # Convert IRR to IRT
            if record.currency == "IRR":
                price = price / 10
            
            if side == "buy":
                buy_price = price
            elif side == "sell":
                sell_price = price
            else:  # default
                default_price = price
        
        # Calculate average
        if buy_price and sell_price:
            source_averages[source] = (buy_price + sell_price) / 2
        elif default_price:
            source_averages[source] = default_price
        elif buy_price:
            source_averages[source] = buy_price
        elif sell_price:
            source_averages[source] = sell_price
    
    # Sort by price (expensive first) and update tracker
    sorted_sources = dict(sorted(source_averages.items(), key=lambda x: x[1], reverse=True))
    price_tracker.update(sorted_sources)
    
    # Get sparkline data and percentage changes for all sources if db is provided
    sparklines = {}
    changes_1h = {}
    changes_24h = {}
    changes_7d = {}
    if db:
        for source in prices.keys():
            sparkline_data = GoldPrice.get_7day_sparkline(db, source)
            # Convert IRR to IRT for sparkline data
            if sparkline_data and prices[source]:
                first_record = next((r for r in prices[source].values() if r), None)
                if first_record and first_record.currency == "IRR":
                    sparkline_data = [price / 10 for price in sparkline_data]
            sparklines[source] = sparkline_data if sparkline_data else []
            
            # Get percentage changes
            changes_1h[source] = GoldPrice.get_price_change_percentage(db, source, 1)
            changes_24h[source] = GoldPrice.get_price_change_percentage(db, source, 24)
            changes_7d[source] = GoldPrice.get_price_change_percentage(db, source, 168)  # 7 days = 168 hours
    
    # Build response with tracking data
    payload: Dict[str, Dict[str, Optional[GoldPriceOut]]] = {}
    for source, sides in prices.items():
        payload[source] = {}
        for side, record in sides.items():
            key = side or DEFAULT_SIDE_KEY
            if record:
                price_out = GoldPriceOut.from_orm(record)
                price_out.price_direction = price_tracker.get_price_direction(source)
                price_out.rank_change = price_tracker.get_rank_change(source)
                price_out.sparkline_7d = sparklines.get(source, [])
                price_out.change_1h = changes_1h.get(source)
                price_out.change_24h = changes_24h.get(source)
                price_out.change_7d = changes_7d.get(source)
                payload[source][key] = price_out
            else:
                payload[source][key] = None

    return LatestPricesResponse(latest_prices=payload)


@router.get("/health", response_model=HealthResponse, tags=["system"], dependencies=[Depends(api_auth)])
def health_check(collector: GoldPriceCollector = Depends(get_collector)) -> HealthResponse:
    now = datetime.utcnow()
    last_collection = collector.last_collection
    uptime_seconds = 0.0
    if last_collection:
        uptime_seconds = (now - last_collection).total_seconds()

    return HealthResponse(status="ok", uptime_seconds=uptime_seconds, last_collection=last_collection)


@router.get(
    "/prices/latest",
    response_model=LatestPricesResponse,
    dependencies=[Depends(api_auth)],
)
def get_latest_prices(
    db: Session = Depends(get_db),
) -> LatestPricesResponse:
    aggregated = GoldPrice.get_latest_prices_grouped(db)
    return _build_latest_response(aggregated, db)


@router.get(
    "/analytics/stats",
    response_model=AnalyticsStats,
    dependencies=[Depends(api_auth)],
)
def get_analytics_stats(
    db: Session = Depends(get_db),
) -> AnalyticsStats:
    """Get analytics statistics including most expensive/cheapest sources in L24h, average price, and price changes."""
    stats = GoldPrice.get_analytics_stats(db)
    return AnalyticsStats(**stats)


@router.get(
    "/prices/{source}/latest",
    response_model=GoldPriceOut,
    dependencies=[Depends(api_auth)],
)
def get_latest_price_for_source(
    source: str,
    side: Optional[str] = Query(default=None, regex="^(buy|sell)$"),
    db: Session = Depends(get_db),
) -> GoldPriceOut:
    record = GoldPrice.get_latest_price(db, source=source, side=side)
    if not record:
        raise HTTPException(status_code=404, detail="Price not found for source")
    return GoldPriceOut.from_orm(record)


@router.get(
    "/prices/{source}/history",
    response_model=PriceHistoryResponse,
    dependencies=[Depends(api_auth)],
)
def get_price_history(
    source: str,
    start: Optional[datetime] = Query(default=None, description="Start timestamp (inclusive) in ISO format"),
    end: Optional[datetime] = Query(default=None, description="End timestamp (inclusive) in ISO format"),
    interval: str = Query(default="minute", regex="^(minute|hour)$"),
    db: Session = Depends(get_db),
) -> PriceHistoryResponse:
    if end is None:
        end = datetime.utcnow()
    if start is None:
        default_delta = timedelta(hours=24) if interval == "hour" else timedelta(hours=2)
        start = end - default_delta

    if start >= end:
        raise HTTPException(status_code=400, detail="Start must be before end")

    grouped = GoldPrice.get_price_history_grouped(db, source, start, end, interval)

    points = [
        PriceHistoryPoint(
            bucket=row.bucket,
            average_price=row.average_price,
            min_price=row.min_price,
            max_price=row.max_price,
        )
        for row in grouped
    ]

    return PriceHistoryResponse(
        source=source,
        interval=interval,
        start_time=start,
        end_time=end,
        points=points,
    )


telegram_router = APIRouter(prefix="/v1/telegram", tags=["telegram"])


@telegram_router.get(
    "/prices/latest",
    response_model=LatestPricesResponse,
    dependencies=[Depends(telegram_auth)],
)
def telegram_latest_prices(
    db: Session = Depends(get_db),
) -> LatestPricesResponse:
    aggregated = GoldPrice.get_latest_prices_grouped(db)
    return _build_latest_response(aggregated, db)


@telegram_router.get(
    "/prices/{source}/latest",
    response_model=GoldPriceOut,
    dependencies=[Depends(telegram_auth)],
)
def telegram_latest_price_for_source(
    source: str,
    side: Optional[str] = Query(default=None, regex="^(buy|sell)$"),
    db: Session = Depends(get_db),
) -> GoldPriceOut:
    record = GoldPrice.get_latest_price(db, source=source, side=side)
    if not record:
        raise HTTPException(status_code=404, detail="Price not found for source")
    return GoldPriceOut.from_orm(record)

