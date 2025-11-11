from __future__ import annotations

from datetime import datetime, timedelta
from typing import Dict, Optional

from sqlalchemy import Column, DateTime, Integer, Numeric, String, func
from sqlalchemy.orm import Session

from .database import Base


class GoldPrice(Base):
    __tablename__ = "gold_price"

    id = Column(Integer, primary_key=True, index=True)
    price = Column(Numeric(20, 8), nullable=False)
    source = Column(String(64), nullable=False, index=True)
    side = Column(String(8), nullable=True, index=True)
    currency = Column(String(8), nullable=False, default="IRR")
    created_at = Column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), index=True
    )

    @classmethod
    def get_latest_price(
        cls, session: Session, source: str | None = None, side: str | None = None
    ) -> Optional["GoldPrice"]:
        query = session.query(cls)
        if source:
            query = query.filter(cls.source == source)
        if side is not None:
            query = query.filter(cls.side == side)
        else:
            query = query.filter(cls.side.is_(None))
        return query.order_by(cls.created_at.desc()).first()

    @classmethod
    def get_latest_prices_grouped(cls, session: Session) -> Dict[str, Dict[str | None, "GoldPrice"]]:
        sources: Dict[str, Dict[str | None, "GoldPrice"]] = {}

        subquery = (
            session.query(
                cls.source,
                cls.side,
                func.max(cls.created_at).label("max_created_at"),
            )
            .group_by(cls.source, cls.side)
            .subquery()
        )

        rows = (
            session.query(cls)
            .join(
                subquery,
                (cls.source == subquery.c.source)
                & (
                    (cls.side.is_(None) & subquery.c.side.is_(None))
                    | (cls.side == subquery.c.side)
                )
                & (cls.created_at == subquery.c.max_created_at),
            )
            .all()
        )

        for row in rows:
            sources.setdefault(row.source, {})[row.side] = row

        return sources

    @classmethod
    def get_price_history(
        cls,
        session: Session,
        source: str,
        start_time: datetime,
        end_time: datetime,
    ) -> list["GoldPrice"]:
        return (
            session.query(cls)
            .filter(cls.source == source)
            .filter(cls.created_at >= start_time)
            .filter(cls.created_at <= end_time)
            .order_by(cls.created_at.asc())
            .all()
        )

    @classmethod
    def get_price_history_grouped(
        cls,
        session: Session,
        source: str,
        start_time: datetime,
        end_time: datetime,
        interval: str,
    ):
        if interval not in {"minute", "hour"}:
            raise ValueError("interval must be 'minute' or 'hour'")

        trunc_unit = "minute" if interval == "minute" else "hour"
        truncated_dt = func.date_trunc(trunc_unit, cls.created_at).label("bucket")

        return (
            session.query(
                truncated_dt,
                func.avg(cls.price).label("average_price"),
                func.min(cls.price).label("min_price"),
                func.max(cls.price).label("max_price"),
            )
            .filter(cls.source == source)
            .filter(cls.created_at >= start_time)
            .filter(cls.created_at <= end_time)
            .group_by(truncated_dt)
            .order_by(truncated_dt.asc())
            .all()
        )

    @classmethod
    def get_7day_sparkline(cls, session: Session, source: str) -> list[float]:
        """Get 7-day hourly average prices for sparkline chart."""
        end_time = datetime.utcnow()
        start_time = end_time - timedelta(days=7)
        
        truncated_dt = func.date_trunc("hour", cls.created_at).label("bucket")
        
        rows = (
            session.query(
                func.avg(cls.price).label("average_price"),
            )
            .filter(cls.source == source)
            .filter(cls.created_at >= start_time)
            .filter(cls.created_at <= end_time)
            .group_by(truncated_dt)
            .order_by(truncated_dt.asc())
            .all()
        )
        
        return [float(row.average_price) for row in rows] if rows else []

    @classmethod
    def get_price_change_percentage(cls, session: Session, source: str, hours: int) -> Optional[float]:
        """Calculate percentage change for a given time period."""
        end_time = datetime.utcnow()
        start_time = end_time - timedelta(hours=hours)
        
        # Get current price (most recent)
        current_record = (
            session.query(cls.price)
            .filter(cls.source == source)
            .order_by(cls.created_at.desc())
            .limit(1)
            .scalar()
        )
        
        # Get price from X hours ago
        old_record = (
            session.query(cls.price)
            .filter(cls.source == source)
            .filter(cls.created_at <= start_time)
            .order_by(cls.created_at.desc())
            .limit(1)
            .scalar()
        )
        
        if current_record and old_record and old_record > 0:
            return float(((current_record - old_record) / old_record) * 100)
        
        return None

    @classmethod
    def get_analytics_stats(cls, session: Session) -> Dict:
        """Get analytics statistics for the last 24 hours."""
        end_time = datetime.utcnow()
        start_time = end_time - timedelta(hours=24)
        
        # Get most expensive and cheapest in last 24h
        most_expensive = (
            session.query(cls)
            .filter(cls.created_at >= start_time)
            .order_by(cls.price.desc())
            .first()
        )
        
        most_cheapest = (
            session.query(cls)
            .filter(cls.created_at >= start_time)
            .order_by(cls.price.asc())
            .first()
        )
        
        # Get all sources for average calculation
        sources_data = cls.get_latest_prices_grouped(session)
        
        # Calculate average price from latest prices (one price per source)
        source_prices = []
        for source_dict in sources_data.values():
            # Calculate average for this source (handle buy/sell or default)
            prices = []
            for side, price_record in source_dict.items():
                if price_record:
                    # Convert IRR to IRT (Rials to Tomans)
                    price_in_tomans = float(price_record.price) / 10 if price_record.currency == "IRR" else float(price_record.price)
                    prices.append(price_in_tomans)
            
            if prices:
                # Use average of buy/sell for this source
                source_prices.append(sum(prices) / len(prices))
        
        average_price = sum(source_prices) / len(source_prices) if source_prices else 0
        
        # Calculate average price 24h ago (one price per source, in Tomans)
        old_prices = []
        for source in sources_data.keys():
            old_record = (
                session.query(cls.price, cls.currency)
                .filter(cls.source == source)
                .filter(cls.created_at <= start_time)
                .order_by(cls.created_at.desc())
                .limit(1)
                .first()
            )
            if old_record:
                price, currency = old_record
                price_in_tomans = float(price) / 10 if currency == "IRR" else float(price)
                old_prices.append(price_in_tomans)
        
        average_price_24h_ago = sum(old_prices) / len(old_prices) if old_prices else None
        average_price_change_24h = None
        if average_price_24h_ago and average_price_24h_ago > 0:
            average_price_change_24h = ((average_price - average_price_24h_ago) / average_price_24h_ago) * 100
        
        # Find most and least changed sources
        changes = {}
        for source in sources_data.keys():
            change = cls.get_price_change_percentage(session, source, 24)
            if change is not None:
                changes[source] = change
        
        most_changed = max(changes.items(), key=lambda x: abs(x[1])) if changes else ("N/A", 0.0)
        least_changed = min(changes.items(), key=lambda x: abs(x[1])) if changes else ("N/A", 0.0)
        
        return {
            "most_expensive_24h": {
                "source": most_expensive.source if most_expensive else "N/A",
                "price": str(most_expensive.price) if most_expensive else "0",
                "timestamp": most_expensive.created_at if most_expensive else datetime.utcnow(),
            },
            "most_cheapest_24h": {
                "source": most_cheapest.source if most_cheapest else "N/A",
                "price": str(most_cheapest.price) if most_cheapest else "0",
                "timestamp": most_cheapest.created_at if most_cheapest else datetime.utcnow(),
            },
            "average_price": float(average_price),
            "average_price_change_24h": float(average_price_change_24h) if average_price_change_24h is not None else None,
            "most_changed_24h": {
                "source": most_changed[0],
                "change": float(most_changed[1]),
            },
            "least_changed_24h": {
                "source": least_changed[0],
                "change": float(least_changed[1]),
            },
        }

    def __repr__(self) -> str:
        return (
            f"<GoldPrice price={self.price} source={self.source} "
            f"side={self.side} created_at={self.created_at}>"
        )

