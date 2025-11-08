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


class PriceHistoryResponse(BaseModel):
    source: str
    interval: str
    start_time: datetime
    end_time: datetime
    points: list[PriceHistoryPoint]


class HealthResponse(BaseModel):
    status: str = "ok"
    uptime_seconds: float
    last_collection: Optional[datetime]

