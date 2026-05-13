from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal, InvalidOperation
from typing import Any, Dict, List, Optional, Tuple

import httpx
from sqlalchemy.orm import Session

from ..config import get_settings
from ..database import session_scope
from ..models import GoldPrice

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class PriceRecord:
    price: Decimal
    source: str
    side: Optional[str]
    currency: str


class GoldPriceCollector:
    """Collect gold prices from multiple upstream providers on a schedule."""

    _TRANSIENT_HTTP_ERRORS = (
        httpx.ConnectError,
        httpx.ConnectTimeout,
        httpx.ReadTimeout,
        httpx.WriteTimeout,
    )

    def __init__(self) -> None:
        self.settings = get_settings()
        self._running = False
        self._last_collection: Optional[datetime] = None
        self._task: Optional[asyncio.Task] = None

    @property
    def last_collection(self) -> Optional[datetime]:
        return self._last_collection

    async def start(self) -> None:
        if self._task and not self._task.done():
            return

        self._running = True
        self._task = asyncio.create_task(self._run_loop(), name="gold-price-collector")
        logger.info("Gold price collector task scheduled.")

    async def stop(self) -> None:
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                logger.info("Gold price collector task cancelled.")
            finally:
                self._task = None

    async def _run_loop(self) -> None:
        interval = self.settings.collector_interval_seconds
        async with httpx.AsyncClient(timeout=self.settings.http_timeout_seconds) as client:
            while self._running:
                started_at = datetime.utcnow()
                try:
                    await self.collect_once(client)
                except Exception:
                    logger.exception("Unhandled error during gold price collection cycle")
                finally:
                    self._last_collection = datetime.utcnow()
                elapsed = (datetime.utcnow() - started_at).total_seconds()
                sleep_for = max(1.0, interval - elapsed)
                await asyncio.sleep(sleep_for)

    async def collect_once(self, client: httpx.AsyncClient | None = None) -> bool:
        close_client = False
        if client is None:
            client = httpx.AsyncClient(timeout=self.settings.http_timeout_seconds)
            close_client = True

        all_records: List[PriceRecord] = []
        tasks: List[Tuple[str, asyncio.Task]] = []

        try:
            sources = self._source_fetchers(client)
            for source_name, fetcher, processor in sources:
                task = asyncio.create_task(self._fetch_and_process(fetcher, processor))
                tasks.append((source_name, task))

            for source_name, task in tasks:
                try:
                    records = await task
                    if records:
                        all_records.extend(records)
                        logger.debug("Collected %s records from %s", len(records), source_name)
                except Exception:
                    logger.exception("Failed collecting data from source %s", source_name)

            if all_records:
                self._persist_records(all_records)
                logger.info("Persisted %s gold price records", len(all_records))
                return True

            logger.warning("No gold price records collected during cycle")
            return False
        finally:
            if close_client:
                await client.aclose()

    async def _fetch_and_process(
        self,
        fetcher: callable,
        processor: callable,
    ) -> List[PriceRecord]:
        data = await fetcher()
        if not data:
            return []
        return processor(data)

    def _persist_records(self, records: List[PriceRecord]) -> None:
        with session_scope() as session:
            for record in records:
                session.add(
                    GoldPrice(
                        price=record.price,
                        source=record.source,
                        side=record.side,
                        currency=record.currency,
                    )
                )

    def _source_fetchers(self, client: httpx.AsyncClient):
        return [
            ("milli", lambda: self._fetch_json(client, self.settings.milli_api_url), self._process_milli),
            ("taline", lambda: self._fetch_json(client, self.settings.taline_api_url), self._process_taline),
            ("digikala", self._fetch_digikala(client), self._process_digikala),
            ("talasea", lambda: self._fetch_json(client, self.settings.talasea_api_url), self._process_talasea),
            ("tgju", self._fetch_tgju(client), self._process_tgju),
            ("wallgold", lambda: self._fetch_json(client, self.settings.wallgold_api_url), self._process_wallgold),
            ("technogold", lambda: self._fetch_json(client, self.settings.technogold_api_url), self._process_technogold),
            ("melligold", lambda: self._fetch_json(client, self.settings.melligold_api_url), self._process_melligold),
            ("daric", lambda: self._fetch_json(client, self.settings.daric_api_url), self._process_daric),
            ("goldika", lambda: self._fetch_json(client, self.settings.goldika_api_url), self._process_goldika),
            ("estjt", self._fetch_estjt(client), self._process_estjt),
            ("hamrahgold", lambda: self._fetch_text(client, self.settings.hamrahgold_api_url), self._process_hamrahgold),
        ]

    def _fetch_tgju(self, client: httpx.AsyncClient):
        async def _fetch():
            headers = {}
            if self.settings.tgju_api_token:
                headers["Authorization"] = f"Bearer {self.settings.tgju_api_token}"
            return await self._fetch_json(client, self.settings.tgju_api_url, headers=headers)

        return _fetch

    def _fetch_digikala(self, client: httpx.AsyncClient):
        """Digikala often returns 403 without a site Referer/Origin (WAF treats bare API clients as bots)."""

        url = str(self.settings.digikala_api_url)
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            ),
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "fa-IR,fa;q=0.9,en;q=0.8",
            "Referer": "https://www.digikala.com/",
            "Origin": "https://www.digikala.com",
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-site",
        }

        async def _fetch():
            return await self._fetch_json(client, url, headers=headers)

        return _fetch

    def _fetch_estjt(self, client: httpx.AsyncClient):
        url = str(self.settings.estjt_api_url)
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            ),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "fa-IR,fa;q=0.9,en;q=0.8",
        }

        async def _fetch():
            return await self._fetch_text(client, url, headers=headers)

        return _fetch

    async def _fetch_json(
        self,
        client: httpx.AsyncClient,
        url: str,
        headers: Optional[Dict[str, str]] = None,
    ) -> Optional[Dict[str, Any]]:
        max_attempts = 3
        for attempt in range(1, max_attempts + 1):
            try:
                response = await client.get(url, headers=headers)
                response.raise_for_status()
                return response.json()
            except self._TRANSIENT_HTTP_ERRORS as exc:
                if attempt == max_attempts:
                    logger.error(
                        "Failed to fetch JSON from %s after %s attempts: %s",
                        url,
                        max_attempts,
                        exc,
                    )
                    return None
                logger.warning(
                    "Transient HTTP error (attempt %s/%s) fetching JSON from %s: %s",
                    attempt,
                    max_attempts,
                    url,
                    exc,
                )
                await asyncio.sleep(0.5 * attempt)
            except Exception:
                logger.exception("Error fetching JSON from %s", url)
                return None
        return None

    async def _fetch_text(
        self,
        client: httpx.AsyncClient,
        url: str,
        headers: Optional[Dict[str, str]] = None,
    ) -> Optional[str]:
        max_attempts = 3
        for attempt in range(1, max_attempts + 1):
            try:
                response = await client.get(url, headers=headers)
                response.raise_for_status()
                return response.text
            except self._TRANSIENT_HTTP_ERRORS as exc:
                if attempt == max_attempts:
                    logger.error(
                        "Failed to fetch HTML from %s after %s attempts: %s",
                        url,
                        max_attempts,
                        exc,
                    )
                    return None
                logger.warning(
                    "Transient HTTP error (attempt %s/%s) fetching HTML from %s: %s",
                    attempt,
                    max_attempts,
                    url,
                    exc,
                )
                await asyncio.sleep(0.5 * attempt)
            except Exception:
                logger.exception("Error fetching HTML from %s", url)
                return None
        return None

    def _process_milli(self, data: Dict[str, Any]) -> List[PriceRecord]:
        price_info = data.get("data", data)
        value = price_info.get("price18") if isinstance(price_info, dict) else None
        return self._build_single(value, "milli", currency="IRR")

    def _process_taline(self, data: Dict[str, Any]) -> List[PriceRecord]:
        records: List[PriceRecord] = []
        for item in data.get("prices", []):
            if item.get("symbol") != "GOLD18":
                continue
            price = item.get("price", {})
            records.extend(
                self._build_dual(price.get("buy"), price.get("sell"), source="taline", currency="IRT")
            )
        return records

    def _process_digikala(self, data: Dict[str, Any]) -> List[PriceRecord]:
        if not isinstance(data, dict):
            logger.warning("Digikala: expected JSON object, got %s", type(data).__name__)
            return []
        root = data.get("data")
        if not isinstance(root, dict):
            root = data
        gold = root.get("gold18")
        if isinstance(gold, dict):
            price = gold.get("price")
        else:
            price = gold
        if price is None:
            logger.warning(
                "Digikala: missing gold18 price (top-level keys=%s, root keys=%s)",
                list(data.keys())[:15],
                list(root.keys())[:15] if isinstance(root, dict) else root,
            )
        return self._build_single(price, "digikala", currency="IRR")

    def _process_talasea(self, data: Dict[str, Any]) -> List[PriceRecord]:
        return self._build_single(data.get("price"), "talasea", currency="IRT")

    def _process_tgju(self, data: Dict[str, Any]) -> List[PriceRecord]:
        results = data.get("result", [])
        for item in results:
            if item.get("category") == "طلا" and "18" in item.get("title", "") and "price" in item:
                try:
                    raw = Decimal(str(item["price"]))
                    adjusted = raw / Decimal("1000")
                except (InvalidOperation, TypeError, ValueError):
                    logger.warning("Unable to parse TGJU price %s", item.get("price"))
                    return []
                return [PriceRecord(price=adjusted, source="tgju", side=None, currency="IRR")]
        return []

    def _process_wallgold(self, data: Dict[str, Any]) -> List[PriceRecord]:
        for item in data.get("result", []):
            if item.get("symbol") == "GLD_18C_750TMN":
                last_price = item.get("marketCap", {}).get("lastPrice")
                if last_price is not None:
                    return self._build_single(last_price, "wallgold", currency="IRT", divider=Decimal("1000"))
        return []

    def _process_technogold(self, data: Dict[str, Any]) -> List[PriceRecord]:
        price = data.get("results", {}).get("price")
        return self._build_single(price, "technogold", currency="IRT", divider=Decimal("1000"))

    def _process_melligold(self, data: Dict[str, Any]) -> List[PriceRecord]:
        price_data = data.get("data", {})
        return self._build_dual(
            price_data.get("price_buy"),
            price_data.get("price_sell"),
            source="melligold",
            currency="IRT",
            divider=Decimal("1000"),
        )

    def _process_daric(self, data: Dict[str, Any]) -> List[PriceRecord]:
        payload = data.get("Data", {})
        return self._build_dual(
            payload.get("BestBuyPrice"),
            payload.get("BestSellPrice"),
            source="daric",
            currency="IRT",
            divider=Decimal("1000"),
        )

    def _process_goldika(self, data: Dict[str, Any]) -> List[PriceRecord]:
        price_data = data.get("data", {}).get("price", {})
        return self._build_dual(
            price_data.get("buy"),
            price_data.get("sell"),
            source="goldika",
            currency="IRR",
            divider=Decimal("1000"),
        )

    _ESTJT_XPATH_PRIMARY = (
        '//*[@id="topsec"]/div/div/div[2]/div[3]/div[1]/div/div/table/tbody/tr[3]/td[2]'
    )
    _ESTJT_XPATH_NO_TBODY = (
        '//*[@id="topsec"]/div/div/div[2]/div[3]/div[1]/div/div/table/tr[3]/td[2]'
    )
    _ESTJT_XPATH_GOLD_TABLE = (
        '//*[@id="topsec"]//div[contains(@class,"instant-price-gold")]//table//tr[3]/td[2]'
    )

    def _estjt_normalize_price_text(self, raw: str) -> str:
        """Persian/Arabic digits and Iranian-style thousands separators → plain ASCII integer string."""
        trans = str.maketrans(
            "۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩",
            "01234567890123456789",
        )
        s = raw.translate(trans)
        for ch in ("\u00a0", " ", ",", "٫", "،", ".", "'", "\u200c"):
            s = s.replace(ch, "")
        return s.strip()

    def _process_estjt(self, html: str | None) -> List[PriceRecord]:
        if not html:
            return []
        try:
            from lxml import html as lhtml
        except ImportError:
            logger.warning("ESTJT parsing requires lxml (install lxml)")
            return []

        try:
            tree = lhtml.fromstring(html)
        except Exception:
            logger.exception("ESTJT: failed to parse HTML")
            return []

        candidates: List[str] = []
        for xp in (
            self._ESTJT_XPATH_PRIMARY,
            self._ESTJT_XPATH_NO_TBODY,
            self._ESTJT_XPATH_GOLD_TABLE,
        ):
            nodes = tree.xpath(xp)
            if not nodes:
                continue
            text = nodes[0].text_content() if hasattr(nodes[0], "text_content") else str(nodes[0])
            normalized = self._estjt_normalize_price_text(text)
            if normalized:
                candidates.append(normalized)
                break

        if not candidates:
            logger.warning("ESTJT: no price cell matched XPath (layout may have changed)")
            return []

        return self._build_single(candidates[0], "estjt", currency="IRT", divider=Decimal("1000"))

    def _process_hamrahgold(self, html: str | None) -> List[PriceRecord]:
        import json
        import re
        import html as html_module
        
        if not html:
            return []
        
        try:
            # Find wire:snapshot JSON in HTML - more flexible pattern
            pattern = r'wire:snapshot=["\']({[^"\']+})["\']'
            matches = re.findall(pattern, html, re.DOTALL)
            
            for match in matches:
                try:
                    # Decode HTML entities properly
                    json_str = html_module.unescape(match)
                    data = json.loads(json_str)
                    
                    # Look for prices in the data
                    if "data" in data and "prices" in data["data"]:
                        prices_array = data["data"]["prices"]
                        if isinstance(prices_array, list) and len(prices_array) > 0:
                            # Navigate through nested arrays to find pure gold
                            for level1 in prices_array:
                                if isinstance(level1, list):
                                    for level2 in level1:
                                        if isinstance(level2, list):
                                            for item in level2:
                                                if isinstance(item, dict) and item.get("key") == "pg":
                                                    # Found pure gold prices
                                                    buy = item.get("buy")
                                                    sell = item.get("sell")
                                                    if buy and sell:
                                                        logger.info("Found hamrahgold prices: buy=%s, sell=%s", buy, sell)
                                                        return self._build_dual(
                                                            buy,
                                                            sell,
                                                            source="hamrahgold",
                                                            currency="IRR",
                                                            divider=Decimal("1000"),
                                                        )
                except json.JSONDecodeError:
                    continue
            
            logger.warning("Failed to find hamrahgold price data in HTML")
            return []
        except Exception as e:
            logger.exception("Error parsing hamrahgold HTML: %s", e)
            return []

    def _build_single(
        self,
        value: Any,
        source: str,
        *,
        currency: str,
        divider: Decimal | None = None,
    ) -> List[PriceRecord]:
        if value is None:
            return []
        try:
            price = Decimal(str(value))
            if divider:
                price /= divider
        except (InvalidOperation, TypeError, ValueError):
            logger.warning("Invalid price '%s' from %s", value, source)
            return []
        return [PriceRecord(price=price, source=source, side=None, currency=currency)]

    def _build_dual(
        self,
        buy_value: Any,
        sell_value: Any,
        *,
        source: str,
        currency: str,
        divider: Decimal | None = None,
    ) -> List[PriceRecord]:
        records: List[PriceRecord] = []
        for side, raw in (("buy", buy_value), ("sell", sell_value)):
            if raw is None:
                continue
            try:
                price = Decimal(str(raw))
                if divider:
                    price /= divider
            except (InvalidOperation, TypeError, ValueError):
                logger.warning("Invalid %s price '%s' from %s", side, raw, source)
                continue
            records.append(PriceRecord(price=price, source=source, side=side, currency=currency))
        return records

