class GoldPrice(Base):
    __tablename__ = "gold_price"

    id = Column(Integer, primary_key=True, index=True)
    price = Column(DECIMAL(20, 8), nullable=False)  # Gold price
    source = Column(String(50), nullable=False, index=True)  # Source: milli, taline, digikala, talasea
    side = Column(String(10), nullable=True)  # Side: buy, sell, or NULL
    currency = Column(String(10), nullable=True)  # Currency: IRR (Rials) or IRT (Tomans)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    @classmethod
    def get_latest_price(cls, session, source: str = None, side: str = None) -> Optional["GoldPrice"]:
        """Get the latest gold price for a specific source and side"""
        query = session.query(cls)
        if source:
            query = query.filter(cls.source == source)
        if side:
            query = query.filter(cls.side == side)
        return query.order_by(cls.created_at.desc()).first()

    @classmethod
    def get_price_history(cls, session, source: str = None, side: str = None, hours: int = 24) -> List["GoldPrice"]:
        """Get gold price history for a specific source and side"""
        cutoff_time = datetime.now() - timedelta(hours=hours)
        query = session.query(cls).filter(cls.created_at >= cutoff_time)
        if source:
            query = query.filter(cls.source == source)
        if side:
            query = query.filter(cls.side == side)
        return query.order_by(cls.created_at.asc()).all()

    @classmethod
    def get_all_latest_prices(cls, session) -> Dict[str, Dict[str, Optional["GoldPrice"]]]:
        """Get latest prices for all sources and sides"""
        latest_prices = {}
        sources = ['milli', 'taline', 'digikala', 'talasea', 'tgju', 'wallgold', 'technogold', 'melligold', 'daric', 'goldika', 'estjt']

        for source in sources:
            latest_prices[source] = {}
            if source in ['taline', 'melligold', 'daric', 'goldika']: # Sources with buy and sell sides
                for side in ['buy', 'sell']:
                    latest_prices[source][side] = cls.get_latest_price(session, source, side)
            else: # Other sources have no side (NULL)
                latest_prices[source][None] = cls.get_latest_price(session, source, None)

        return latest_prices

    def __repr__(self):
        return f"<GoldPrice(price={self.price}, source={self.source}, side={self.side}, created={self.created_at})>"