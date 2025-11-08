"""Track price changes and rank changes for sources."""
from typing import Dict, Optional, Tuple
from decimal import Decimal


class PriceTracker:
    """Singleton service to track price and rank changes."""
    
    _instance: Optional["PriceTracker"] = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialize()
        return cls._instance
    
    def _initialize(self):
        # Store previous prices: {source: average_price}
        self.previous_prices: Dict[str, Decimal] = {}
        # Store previous ranks: {source: rank}
        self.previous_ranks: Dict[str, int] = {}
        # Store price directions: {source: "up" | "down" | "none"}
        self.price_directions: Dict[str, str] = {}
        # Store rank changes: {source: change_value}
        self.rank_changes: Dict[str, int] = {}
    
    def update(self, current_sources: Dict[str, Decimal]) -> None:
        """
        Update tracking with current prices and calculate changes.
        
        Args:
            current_sources: Dict of {source: average_price} sorted by price (expensive first)
        """
        # Calculate price directions
        new_directions = {}
        for source, current_price in current_sources.items():
            if source in self.previous_prices:
                prev_price = self.previous_prices[source]
                if current_price > prev_price:
                    new_directions[source] = "up"
                elif current_price < prev_price:
                    new_directions[source] = "down"
                else:
                    # Keep previous direction if price unchanged
                    new_directions[source] = self.price_directions.get(source, "none")
            else:
                new_directions[source] = "none"
        
        self.price_directions = new_directions
        
        # Calculate rank changes
        new_rank_changes = {}
        current_ranked = list(current_sources.keys())  # Already sorted by price
        
        for new_rank, source in enumerate(current_ranked):
            if source in self.previous_ranks:
                old_rank = self.previous_ranks[source]
                rank_change = old_rank - new_rank  # Positive = moved up
                new_rank_changes[source] = rank_change
            else:
                new_rank_changes[source] = 0
        
        self.rank_changes = new_rank_changes
        
        # Update previous values for next comparison
        self.previous_prices = current_sources.copy()
        self.previous_ranks = {source: rank for rank, source in enumerate(current_ranked)}
    
    def get_price_direction(self, source: str) -> str:
        """Get price direction for a source."""
        return self.price_directions.get(source, "none")
    
    def get_rank_change(self, source: str) -> int:
        """Get rank change for a source."""
        return self.rank_changes.get(source, 0)

