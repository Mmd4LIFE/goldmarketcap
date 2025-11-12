from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Dict, Optional

from pydantic import BaseModel, Field

DEFAULT_SIDE_KEY = "default"


class GoldPriceBase(BaseModel):
    source: str = Field(..., example="milli")
    side: Optional[str] = Field(None, example="buy")
    currency: str = Field(..., example="IRR")


class GoldPriceOut(GoldPriceBase):
    price: Decimal = Field(..., example="21540000.00000000")
    created_at: datetime
    price_direction: Optional[str] = Field(None, example="up")  # up, down, none
    rank_change: Optional[int] = Field(None, example=1)  # +1, -1, 0
    sparkline_7d: Optional[list[float]] = Field(None, example=[10440.5, 10442.3, 10445.1])  # 7-day hourly averages
    change_1h: Optional[float] = Field(None, example=0.5)  # 1-hour percentage change
    change_24h: Optional[float] = Field(None, example=1.2)  # 24-hour percentage change
    change_7d: Optional[float] = Field(None, example=-2.5)  # 7-day percentage change

    class Config:
        orm_mode = True

    @classmethod
    def from_orm(cls, obj):
        # Convert IRR to IRT (Toman) by dividing by 10
        price = obj.price
        currency = obj.currency
        if currency == "IRR":
            price = obj.price / 10
            currency = "IRT"
        
        return cls(
            source=obj.source,
            side=obj.side,
            currency=currency,
            price=price,
            created_at=obj.created_at,
        )


class LatestPricesResponse(BaseModel):
    latest_prices: Dict[str, Dict[str, Optional[GoldPriceOut]]]


class PriceHistoryPoint(BaseModel):
    bucket: datetime
    average_price: Decimal
    min_price: Decimal
    max_price: Decimal


class MinuteHistoryPoint(BaseModel):
    """Point for minutely chart - supports separate buy/sell or single average"""
    bucket: datetime
    average_price: Optional[Decimal] = None  # For one-sided sources
    buy_price: Optional[Decimal] = None  # For two-sided sources
    sell_price: Optional[Decimal] = None  # For two-sided sources


class HourCandlePoint(BaseModel):
    """Candlestick data point for hourly chart"""
    bucket: datetime
    open: Decimal  # First price in the hour
    close: Decimal  # Last price in the hour
    high: Decimal  # Maximum price in the hour
    low: Decimal  # Minimum price in the hour


class PriceHistoryResponse(BaseModel):
    source: str
    interval: str
    start_time: datetime
    end_time: datetime
    points: list[PriceHistoryPoint]


class MinuteHistoryResponse(BaseModel):
    source: str
    interval: str
    start_time: datetime
    end_time: datetime
    has_sides: bool  # True if source has buy/sell, False if one-sided
    points: list[MinuteHistoryPoint]


class HourCandleResponse(BaseModel):
    source: str
    interval: str
    start_time: datetime
    end_time: datetime
    has_sides: bool  # True if source has buy/sell
    buy_candles: Optional[list[HourCandlePoint]] = None  # For two-sided sources
    sell_candles: Optional[list[HourCandlePoint]] = None  # For two-sided sources
    candles: Optional[list[HourCandlePoint]] = None  # For one-sided sources


class HealthResponse(BaseModel):
    status: str = "ok"
    uptime_seconds: float
    last_collection: Optional[datetime]


class SourceWithTime(BaseModel):
    source: str
    price: Decimal
    timestamp: datetime


class SourceWithChange(BaseModel):
    source: str
    change: float


class AnalyticsStats(BaseModel):
    most_expensive_24h: SourceWithTime
    most_cheapest_24h: SourceWithTime
    average_price: float
    average_price_change_24h: Optional[float]
    most_changed_24h: SourceWithChange
    least_changed_24h: SourceWithChange

