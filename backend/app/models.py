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

    def __repr__(self) -> str:
        return (
            f"<GoldPrice price={self.price} source={self.source} "
            f"side={self.side} created_at={self.created_at}>"
        )

