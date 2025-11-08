from fastapi import Request

from .services.collector import GoldPriceCollector


def get_collector(request: Request) -> GoldPriceCollector:
    collector = request.app.state.collector
    if not isinstance(collector, GoldPriceCollector):
        raise RuntimeError("Collector not initialized")
    return collector

