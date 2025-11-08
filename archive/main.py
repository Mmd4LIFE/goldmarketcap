import asyncio
import logging
import requests
import time
from datetime import datetime, timedelta
from typing import Dict, Optional, List
from decimal import Decimal
import decimal

from models.database import get_db_session
from models.portfolio import GoldPrice
from config import settings

logger = logging.getLogger(__name__)


class GoldPriceCollectorService:
    # API configurations
    APIS = {
        'milli': {
            'url': 'https://milli.gold/api/v1/public/milli-price/detail',
            'has_sides': False
        },
        'taline': {
            'url': 'https://price.tlyn.ir/api/v1/price',
            'has_sides': True
        },
        'digikala': {
            'url': 'https://api.digikala.com/non-inventory/v1/prices/',
            'has_sides': False
        },
        'talasea': {
            'url': 'https://api.talasea.ir/api/market/getGoldPrice',
            'has_sides': False
        },
        'tgju': {
            'url': 'https://studio.persianapi.com/index.php/web-service/common/gold-currency-coin?format=json&limit=30&page=1',
            'has_sides': False
        },
        'wallgold': {
            'url': 'https://api.wallgold.ir/api/v1/markets',
            'has_sides': False
        },
        'technogold': {
            'url': 'https://api2.technogold.gold/customer/tradeables/only-price/1',
            'has_sides': False
        },
        'melligold': {
            'url': 'https://melligold.com/api/v1/exchange/buy-sell-price/',
            'has_sides': True
        },
        'daric': {
            'url': 'https://apisc.daric.gold/loan/api/v1/User/Collateral/GetGoldlPrice',
            'has_sides': True
        },
        'goldika': {
            'url': 'https://goldika.ir/api/public/price',
            'has_sides': True
        },
        'estjt': {
            'url': 'https://www.estjt.ir/tv/',
            'has_sides': False
        }
    }
    def __init__(self):
        self.session = None
        self.running = False
        self.last_fetch_time = None
        
    def get_session(self):
        """Get database session"""
        if not self.session:
            self.session = get_db_session()
        return self.session
        
    def close_session(self):
        """Close database session"""
        if self.session:
            self.session.close()
            self.session = None

    def fetch_milli_gold_price(self) -> Optional[Dict]:
        """Fetch gold price from Milli Gold API"""
        try:
            response = requests.get(
                self.APIS['milli']['url'], 
                timeout=30,
                headers={'User-Agent': 'MyBalance/1.0'}
            )
            response.raise_for_status()
            
            data = response.json()
            logger.info(f"Successfully fetched Milli gold price: {data}")
            return data
            
        except Exception as e:
            logger.error(f"Failed to fetch Milli gold price: {e}")
            return None

    def fetch_taline_gold_price(self) -> Optional[Dict]:
        """Fetch gold price from Taline API"""
        try:
            response = requests.get(
                self.APIS['taline']['url'], 
                timeout=30,
                headers={'User-Agent': 'MyBalance/1.0'}
            )
            response.raise_for_status()
            
            data = response.json()
            logger.info(f"Successfully fetched Taline gold price data")
            return data
            
        except Exception as e:
            logger.error(f"Failed to fetch Taline gold price: {e}")
            return None

    def fetch_digikala_gold_price(self) -> Optional[Dict]:
        """Fetch gold price from Digikala API"""
        try:
            response = requests.get(
                self.APIS['digikala']['url'], 
                timeout=30,
                headers={'User-Agent': 'MyBalance/1.0'}
            )
            response.raise_for_status()
            
            data = response.json()
            logger.info(f"Successfully fetched Digikala gold price: {data}")
            return data
            
        except Exception as e:
            logger.error(f"Failed to fetch Digikala gold price: {e}")
            return None

    def fetch_talasea_gold_price(self) -> Optional[Dict]:
        """Fetch gold price from Talasea API"""
        try:
            response = requests.get(
                self.APIS['talasea']['url'], 
                timeout=30,
                headers={'User-Agent': 'MyBalance/1.0'}
            )
            response.raise_for_status()
            
            data = response.json()
            logger.info(f"Successfully fetched Talasea gold price: {data}")
            return data
            
        except Exception as e:
            logger.error(f"Failed to fetch Talasea gold price: {e}")
            return None

    def fetch_tgju_gold_price(self) -> Optional[Dict]:
        """Fetch gold price from TGJU API"""
        try:
            headers = {
                'User-Agent': 'MyBalance/1.0',
                'Authorization': f'Bearer {settings.tgju_api_token}'
            }
            response = requests.get(
                self.APIS['tgju']['url'], 
                timeout=30,
                headers=headers
            )
            response.raise_for_status()
            
            data = response.json()
            logger.info(f"Successfully fetched TGJU gold price data")
            return data
            
        except Exception as e:
            logger.error(f"Failed to fetch TGJU gold price: {e}")
            return None

    def fetch_wallgold_gold_price(self) -> Optional[Dict]:
        """Fetch gold price from Wallgold API"""
        try:
            response = requests.get(
                self.APIS['wallgold']['url'], 
                timeout=30
            )
            response.raise_for_status()
            
            data = response.json()
            logger.info(f"Successfully fetched Wallgold gold price data")
            return data
            
        except Exception as e:
            logger.error(f"Failed to fetch Wallgold gold price: {e}")
            return None

    def fetch_technogold_gold_price(self) -> Optional[Dict]:
        """Fetch gold price from Technogold API"""
        try:
            response = requests.get(
                self.APIS['technogold']['url'], 
                timeout=30,
                headers={'User-Agent': 'MyBalance/1.0'}
            )
            response.raise_for_status()
            
            data = response.json()
            logger.info(f"Successfully fetched Technogold gold price data")
            return data
            
        except Exception as e:
            logger.error(f"Failed to fetch Technogold gold price: {e}")
            return None

    def fetch_melligold_gold_price(self) -> Optional[Dict]:
        """Fetch gold price from Melligold API"""
        try:
            response = requests.get(
                self.APIS['melligold']['url'], 
                timeout=30,
                headers={'User-Agent': 'MyBalance/1.0'}
            )
            response.raise_for_status()
            
            payload = response.json()
            if not isinstance(payload, dict):
                logger.error(f"Unexpected Melligold response format: {payload}")
                return None

            if payload.get("message") != "Success":
                logger.warning(f"Melligold API responded with non-success status: {payload}")
                return None

            data = payload.get("data")
            if not isinstance(data, dict):
                logger.error(f"Melligold response missing data field: {payload}")
                return None

            logger.info("Successfully fetched Melligold gold price data")
            return data
            
        except Exception as e:
            logger.error(f"Failed to fetch Melligold gold price: {e}")
            return None

    def fetch_daric_gold_price(self) -> Optional[Dict]:
        """Fetch gold price from Daric API"""
        try:
            response = requests.get(
                self.APIS['daric']['url'], 
                timeout=30,
                headers={'User-Agent': 'MyBalance/1.0'}
            )
            response.raise_for_status()
            
            data = response.json()
            logger.info(f"Successfully fetched Daric gold price data")
            return data
            
        except Exception as e:
            logger.error(f"Failed to fetch Daric gold price: {e}")
            return None

    def fetch_goldika_gold_price(self) -> Optional[Dict]:
        """Fetch gold price from Goldika API"""
        try:
            response = requests.get(
                self.APIS['goldika']['url'], 
                timeout=30,
                headers={'User-Agent': 'MyBalance/1.0'}
            )
            response.raise_for_status()
            
            data = response.json()
            logger.info(f"Successfully fetched Goldika gold price data")
            return data
            
        except Exception as e:
            logger.error(f"Failed to fetch Goldika gold price: {e}")
            return None

    def fetch_estjt_gold_price(self) -> Optional[str]:
        """Fetch gold price from ESTJT website by crawling HTML"""
        try:
            response = requests.get(
                self.APIS['estjt']['url'], 
                timeout=30,
                headers={'User-Agent': 'MyBalance/1.0'}
            )
            response.raise_for_status()
            
            # Extract price using regex
            import re
            
            html_content = response.text
            
            # Find the div containing 'طلا ۱۸ عیار' and extract the price
            lines = html_content.split('\n')
            for i, line in enumerate(lines):
                if 'طلا ۱۸ عیار' in line:
                    # Look for the amount span in the next few lines
                    for j in range(i, min(i + 10, len(lines))):
                        if 'class="amount' in lines[j]:
                            # Check next line for the actual price
                            if j + 1 < len(lines):
                                next_line = lines[j + 1].strip()
                                # Extract price from the line (remove any trailing </span>)
                                price_text = re.sub(r'</span>.*$', '', next_line).strip()
                                if price_text and not price_text.startswith('<'):
                                    logger.info(f"Successfully fetched ESTJT gold price: {price_text}")
                                    return price_text
                            break
            
            logger.error("Could not find ESTJT gold price in HTML")
            return None
                
        except Exception as e:
            logger.error(f"Failed to fetch ESTJT gold price: {e}")
            return None

    def process_milli_data(self, data: Dict) -> List[Dict]:
        """Process Milli Gold API data"""
        results = []
        try:
            price_info = data or {}
            if 'data' in price_info and isinstance(price_info['data'], dict):
                price_info = price_info['data']

            if price_info and 'price18' in price_info:
                try:
                    results.append({
                        'price': Decimal(str(price_info['price18'])),
                        'source': 'milli',
                        'side': None,
                        'currency': 'IRR'  # Milli prices are in Rials
                    })
                except (ValueError, TypeError, decimal.ConversionSyntax) as e:
                    logger.warning(f"Error processing Milli price '{price_info['price18']}': {e}")
        except Exception as e:
            logger.error(f"Error processing Milli data: {e}")
            
        return results

    def process_taline_data(self, data: Dict) -> List[Dict]:
        """Process Taline API data"""
        results = []
        try:
            if data and 'prices' in data:
                for item in data['prices']:
                    if item.get('symbol') == 'GOLD18' and 'price' in item:
                        price_data = item['price']
                        if 'sell' in price_data:
                            try:
                                results.append({
                                    'price': Decimal(str(price_data['sell'])),
                                    'source': 'taline',
                                    'side': 'sell',
                                    'currency': 'IRT'  # Taline prices are in Tomans
                                })
                            except (ValueError, TypeError, decimal.ConversionSyntax) as e:
                                logger.warning(f"Error processing Taline sell price '{price_data['sell']}': {e}")
                        if 'buy' in price_data:
                            try:
                                results.append({
                                    'price': Decimal(str(price_data['buy'])),
                                    'source': 'taline',
                                    'side': 'buy',
                                    'currency': 'IRT'  # Taline prices are in Tomans
                                })
                            except (ValueError, TypeError, decimal.ConversionSyntax) as e:
                                logger.warning(f"Error processing Taline buy price '{price_data['buy']}': {e}")
        except Exception as e:
            logger.error(f"Error processing Taline data: {e}")
            
        return results

    def process_digikala_data(self, data: Dict) -> List[Dict]:
        """Process Digikala API data"""
        results = []
        try:
            if data and 'gold18' in data and 'price' in data['gold18']:
                try:
                    results.append({
                        'price': Decimal(str(data['gold18']['price'])),
                        'source': 'digikala',
                        'side': None,
                        'currency': 'IRR'  # Digikala prices are in Rials
                    })
                except (ValueError, TypeError, decimal.ConversionSyntax) as e:
                    logger.warning(f"Error processing Digikala price '{data['gold18']['price']}': {e}")
        except Exception as e:
            logger.error(f"Error processing Digikala data: {e}")
            
        return results

    def process_talasea_data(self, data: Dict) -> List[Dict]:
        """Process Talasea API data"""
        results = []
        try:
            if data and 'price' in data:
                try:
                    results.append({
                        'price': Decimal(str(data['price'])),
                        'source': 'talasea',
                        'side': None,
                        'currency': 'IRT'  # Talasea prices are in Tomans
                    })
                except (ValueError, TypeError, decimal.ConversionSyntax) as e:
                    logger.warning(f"Error processing Talasea price '{data['price']}': {e}")
        except Exception as e:
            logger.error(f"Error processing Talasea data: {e}")
            
        return results

    def process_tgju_data(self, data: Dict) -> List[Dict]:
        """Process TGJU API data"""
        results = []
        try:
            if data and 'result' in data:
                for item in data['result']:
                    # Look for 18 karat gold (طلای 18 عیار)
                    if (item.get('category') == 'طلا' and 
                        '18' in item.get('title', '') and 
                        'price' in item):
                        # TGJU prices are in Rials but need to be divided by 1000
                        try:
                            raw_price = Decimal(str(item['price']))
                            adjusted_price = raw_price / 1000
                            results.append({
                                'price': adjusted_price,
                                'source': 'tgju',
                                'side': None,
                                'currency': 'IRR'  # TGJU prices are in Rials
                            })
                            break  # We only need one 18 karat gold entry
                        except (ValueError, TypeError, decimal.ConversionSyntax) as e:
                            logger.warning(f"Error processing TGJU price '{item['price']}': {e}")
                            break
        except Exception as e:
            logger.error(f"Error processing TGJU data: {e}")
            
        return results

    def process_wallgold_data(self, data: Dict) -> List[Dict]:
        """Process Wallgold API data"""
        results = []
        try:
            if data and 'result' in data:
                for item in data['result']:
                    # Look for GLD_18C_750TMN symbol
                    if (item.get('symbol') == 'GLD_18C_750TMN' and 
                        'marketCap' in item and 
                        'lastPrice' in item['marketCap']):
                        # Wallgold prices are in Tomans but need to be divided by 1000
                        try:
                            raw_price = Decimal(str(item['marketCap']['lastPrice']))
                            adjusted_price = raw_price / 1000
                            results.append({
                                'price': adjusted_price,
                                'source': 'wallgold',
                                'side': None,
                                'currency': 'IRT'  # Wallgold prices are in Tomans
                            })
                            break  # We only need one 18 karat gold entry
                        except (ValueError, TypeError, decimal.ConversionSyntax) as e:
                            logger.warning(f"Error processing Wallgold price '{item['marketCap']['lastPrice']}': {e}")
                            break
        except Exception as e:
            logger.error(f"Error processing Wallgold data: {e}")
            
        return results

    def process_technogold_data(self, data: Dict) -> List[Dict]:
        """Process Technogold API data"""
        results = []
        try:
            if data and 'results' in data and 'price' in data['results']:
                # Technogold prices are in Tomans but need to be divided by 1000
                try:
                    raw_price = Decimal(str(data['results']['price']))
                    adjusted_price = raw_price / 1000
                    results.append({
                        'price': adjusted_price,
                        'source': 'technogold',
                        'side': None,
                        'currency': 'IRT'  # Technogold prices are in Tomans
                    })
                except (ValueError, TypeError, decimal.ConversionSyntax) as e:
                    logger.warning(f"Error processing Technogold price '{data['results']['price']}': {e}")
        except Exception as e:
            logger.error(f"Error processing Technogold data: {e}")
            
        return results

    def process_melligold_data(self, data: Dict) -> List[Dict]:
        """Process Melligold API data"""
        results = []
        try:
            if data and 'price_buy' in data and 'price_sell' in data:
                # Melligold prices are in Tomans but need to be divided by 1000
                if 'price_buy' in data:
                    try:
                        raw_buy_price = Decimal(str(data['price_buy']))
                        adjusted_buy_price = raw_buy_price / 1000
                        results.append({
                            'price': adjusted_buy_price,
                            'source': 'melligold',
                            'side': 'buy',
                            'currency': 'IRT'  # Melligold prices are in Tomans
                        })
                    except (ValueError, TypeError, decimal.ConversionSyntax) as e:
                        logger.warning(f"Error processing Melligold buy price '{data['price_buy']}': {e}")
                
                if 'price_sell' in data:
                    try:
                        raw_sell_price = Decimal(str(data['price_sell']))
                        adjusted_sell_price = raw_sell_price / 1000
                        results.append({
                            'price': adjusted_sell_price,
                            'source': 'melligold',
                            'side': 'sell',
                            'currency': 'IRT'  # Melligold prices are in Tomans
                        })
                    except (ValueError, TypeError, decimal.ConversionSyntax) as e:
                        logger.warning(f"Error processing Melligold sell price '{data['price_sell']}': {e}")
        except Exception as e:
            logger.error(f"Error processing Melligold data: {e}")
            
        return results

    def process_daric_data(self, data: Dict) -> List[Dict]:
        """Process Daric API data"""
        results = []
        try:
            if data and 'Data' in data and 'BestBuyPrice' in data['Data'] and 'BestSellPrice' in data['Data']:
                # Daric prices are in Tomans but need to be divided by 1000
                if 'BestBuyPrice' in data['Data']:
                    try:
                        raw_buy_price = Decimal(str(data['Data']['BestBuyPrice']))
                        adjusted_buy_price = raw_buy_price / 1000
                        results.append({
                            'price': adjusted_buy_price,
                            'source': 'daric',
                            'side': 'buy',
                            'currency': 'IRT'  # Daric prices are in Tomans
                        })
                    except (ValueError, TypeError, decimal.ConversionSyntax) as e:
                        logger.warning(f"Error processing Daric buy price '{data['Data']['BestBuyPrice']}': {e}")
                
                if 'BestSellPrice' in data['Data']:
                    try:
                        raw_sell_price = Decimal(str(data['Data']['BestSellPrice']))
                        adjusted_sell_price = raw_sell_price / 1000
                        results.append({
                            'price': adjusted_sell_price,
                            'source': 'daric',
                            'side': 'sell',
                            'currency': 'IRT'  # Daric prices are in Tomans
                        })
                    except (ValueError, TypeError, decimal.ConversionSyntax) as e:
                        logger.warning(f"Error processing Daric sell price '{data['Data']['BestSellPrice']}': {e}")
        except Exception as e:
            logger.error(f"Error processing Daric data: {e}")
            
        return results

    def process_goldika_data(self, data: Dict) -> List[Dict]:
        """Process Goldika API data"""
        results = []
        try:
            if data and 'data' in data and 'price' in data['data'] and 'buy' in data['data']['price'] and 'sell' in data['data']['price']:
                # Goldika prices are in Rials but need to be divided by 1000
                if 'buy' in data['data']['price']:
                    try:
                        raw_buy_price = Decimal(str(data['data']['price']['buy']))
                        adjusted_buy_price = raw_buy_price / 1000
                        results.append({
                            'price': adjusted_buy_price,
                            'source': 'goldika',
                            'side': 'buy',
                            'currency': 'IRR'  # Goldika prices are in Rials
                        })
                    except (ValueError, TypeError, decimal.ConversionSyntax) as e:
                        logger.warning(f"Error processing Goldika buy price '{data['data']['price']['buy']}': {e}")
                
                if 'sell' in data['data']['price']:
                    try:
                        raw_sell_price = Decimal(str(data['data']['price']['sell']))
                        adjusted_sell_price = raw_sell_price / 1000
                        results.append({
                            'price': adjusted_sell_price,
                            'source': 'goldika',
                            'side': 'sell',
                            'currency': 'IRR'  # Goldika prices are in Rials
                        })
                    except (ValueError, TypeError, decimal.ConversionSyntax) as e:
                        logger.warning(f"Error processing Goldika sell price '{data['data']['price']['sell']}': {e}")
        except Exception as e:
            logger.error(f"Error processing Goldika data: {e}")
            
        return results

    def process_estjt_data(self, price_text: str) -> List[Dict]:
        """Process ESTJT HTML data"""
        results = []
        if price_text:
            try:
                # Remove commas and convert to number
                price_clean = price_text.replace(',', '')
                raw_price = Decimal(price_clean)
                
                # Divide by 1000 as specified
                adjusted_price = raw_price / 1000
                
                results.append({
                    'price': adjusted_price,
                    'source': 'estjt',
                    'side': None,
                    'currency': 'IRT'  # ESTJT prices are in Tomans
                })
                
                logger.info(f"Processed ESTJT price: {price_text} -> {adjusted_price}")
                
            except (ValueError, TypeError) as e:
                logger.error(f"Error processing ESTJT price '{price_text}': {e}")
                
        return results

    def store_gold_prices(self, price_records: List[Dict]) -> int:
        """Store multiple gold price records in database"""
        stored_count = 0
        session = self.get_session()
        
        try:
            for record in price_records:
                gold_price_record = GoldPrice(
                    price=record['price'],
                    source=record['source'],
                    side=record['side'],
                    currency=record.get('currency', 'IRR')  # Default to IRR if not specified
                )
                
                session.add(gold_price_record)
                stored_count += 1
                
            session.commit()
            logger.info(f"Stored {stored_count} gold price records")
            
        except Exception as e:
            logger.error(f"Error storing gold prices: {e}")
            session.rollback()
            stored_count = 0
            
        return stored_count

    def cleanup_old_gold_prices(self, days_to_keep: int = 30):
        """Remove old gold price data to keep database size manageable"""
        session = self.get_session()
        
        try:
            cutoff_date = datetime.now() - timedelta(days=days_to_keep)
            
            deleted_count = session.query(GoldPrice).filter(
                GoldPrice.created_at < cutoff_date
            ).delete()
            
            session.commit()
            
            if deleted_count > 0:
                logger.info(f"Cleaned up {deleted_count} old gold price records")
                
        except Exception as e:
            logger.error(f"Error cleaning up old gold prices: {e}")
            session.rollback()

    def get_latest_gold_price(self, source: str = None, side: str = None) -> Optional[Decimal]:
        """Get latest gold price for a specific source and side"""
        session = self.get_session()
        
        try:
            latest_price = GoldPrice.get_latest_price(session, source, side)
            if latest_price:
                return latest_price.price
            return None
                    
        except Exception as e:
            logger.error(f"Error fetching latest gold price: {e}")
            return None

    def get_all_latest_prices(self) -> Dict[str, Dict[str, Optional[Decimal]]]:
        """Get latest prices for all sources and sides"""
        session = self.get_session()
        
        try:
            latest_prices = GoldPrice.get_all_latest_prices(session)
            result = {}
            
            for source, sides in latest_prices.items():
                result[source] = {}
                for side, price_record in sides.items():
                    result[source][side] = price_record.price if price_record else None
            
            return result
                    
        except Exception as e:
            logger.error(f"Error fetching all latest prices: {e}")
            return {}

    async def collect_gold_prices_once(self):
        """Collect gold prices from all APIs once"""
        logger.info("Starting gold price collection from all sources...")
        
        all_price_records = []
        successful_sources = 0
        failed_sources = 0
        
        # Define all sources with their fetch and process functions
        sources = [
            ('milli', self.fetch_milli_gold_price, self.process_milli_data),
            ('taline', self.fetch_taline_gold_price, self.process_taline_data),
            ('digikala', self.fetch_digikala_gold_price, self.process_digikala_data),
            ('talasea', self.fetch_talasea_gold_price, self.process_talasea_data),
            ('tgju', self.fetch_tgju_gold_price, self.process_tgju_data),
            ('wallgold', self.fetch_wallgold_gold_price, self.process_wallgold_data),
            ('technogold', self.fetch_technogold_gold_price, self.process_technogold_data),
            ('melligold', self.fetch_melligold_gold_price, self.process_melligold_data),
            ('daric', self.fetch_daric_gold_price, self.process_daric_data),
            ('goldika', self.fetch_goldika_gold_price, self.process_goldika_data),
            ('estjt', self.fetch_estjt_gold_price, self.process_estjt_data)
        ]
        
        # Process each source independently
        for source_name, fetch_func, process_func in sources:
            try:
                # Fetch data from the source
                source_data = fetch_func()
                if source_data:
                    # Process the data
                    source_records = process_func(source_data)
                    if source_records:
                        all_price_records.extend(source_records)
                        successful_sources += 1
                        logger.debug(f"Successfully processed {source_name}: {len(source_records)} records")
                    else:
                        logger.warning(f"No valid records from {source_name} after processing")
                        failed_sources += 1
                else:
                    logger.warning(f"No data received from {source_name}")
                    failed_sources += 1
                    
            except Exception as e:
                logger.error(f"Error processing {source_name}: {e}")
                failed_sources += 1
                continue  # Continue with next source
        
        # Store all collected prices
        if all_price_records:
            try:
                stored_count = self.store_gold_prices(all_price_records)
                
                # Update last fetch time
                self.last_fetch_time = datetime.now()
                
                # Clean up old data (once per hour) NOT DELEEEEEEEEETTEEE
                # if datetime.now().minute == 0:
                #     self.cleanup_old_gold_prices()
                
                logger.info(f"Gold price collection completed. Stored {stored_count} records from {successful_sources} sources (failed: {failed_sources})")
                return True
            except Exception as e:
                logger.error(f"Error storing gold prices: {e}")
                return False
        else:
            logger.error(f"No gold price data collected from any source (failed: {failed_sources})")
            return False

    async def start_collector(self, interval_minutes: int = 1):
        """Start the gold price collector service"""
        self.running = True
        logger.info(f"Starting gold price collector with {interval_minutes} minute interval")
        
        while self.running:
            try:
                await self.collect_gold_prices_once()
                
                # Wait for the specified interval
                if self.running:
                    await asyncio.sleep(interval_minutes * 60)
                    
            except asyncio.CancelledError:
                logger.info("Gold price collector was cancelled")
                break
            except Exception as e:
                logger.error(f"Unexpected error in gold price collector: {e}")
                # Wait a bit before retrying
                if self.running:
                    await asyncio.sleep(60)

    def stop_collector(self):
        """Stop the gold price collector service"""
        logger.info("Stopping gold price collector...")
        self.running = False
        self.close_session()

    def get_status(self) -> Dict:
        """Get collector status"""
        return {
            'running': self.running,
            'last_fetch_time': self.last_fetch_time,
            'latest_prices': self.get_all_latest_prices()
        }


# Entry point for running as a standalone service
async def main():
    """Main entry point for gold price collector service"""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    collector = GoldPriceCollectorService()
    
    try:
        await collector.start_collector(interval_minutes=1)
    except KeyboardInterrupt:
        logger.info("Received interrupt signal")
    finally:
        collector.stop_collector()


if __name__ == "__main__":
    asyncio.run(main()) 