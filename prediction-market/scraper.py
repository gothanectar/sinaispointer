# ========================================================
# PREDICTION MARKET - FAST FOOD MVP
# Script de Web Scraping com Playwright
# ========================================================

import asyncio
import logging
from playwright.async_api import async_playwright
import psycopg2
from datetime import datetime
import os
import re
from typing import List, Dict

# Configuração de logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configuração do banco PostgreSQL
DB_PARAMS = {
    "dbname": os.getenv("DB_NAME", "varedb"),
    "user": os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD", "root"),
    "host": os.getenv("DB_HOST", "localhost"),
    "port": os.getenv("DB_PORT", "5432")
}

# Configuração dos estabelecimentos para scraping
ESTABLISHMENTS_CONFIG = {
    "mcdonalds": {
        "name": "McDonald's Brasil",
        "url": "https://mcdonalds.com.br/cardapio",
        "type": "NATIONAL_CHAIN",
        "selectors": {
            "product": ".product-card, .menu-item, .card-produto",
            "name": ".product-title, .item-name, .produto-nome",
            "price": ".product-price, .item-price, .produto-preco"
        }
    },
    "burgerking": {
        "name": "Burger King Brasil",
        "url": "https://burgerking.com.br/cardapio",
        "type": "NATIONAL_CHAIN",
        "selectors": {
            "product": ".product-card, .menu-item",
            "name": ".product-title, .item-name",
            "price": ".product-price, .item-price"
        }
    },
    "subway": {
        "name": "Subway Brasil",
        "url": "https://subway.com.br/menu",
        "type": "NATIONAL_CHAIN",
        "selectors": {
            "product": ".product-card, .menu-item",
            "name": ".product-title, .item-name",
            "price": ".product-price, .item-price"
        }
    }
}

def clean_price(price_str: str) -> float:
    """Converte string de preço para float (ex: 'R$ 39,90' -> 39.90)"""
    if not price_str:
        return 0.0
    
    # Remove caracteres não numéricos exceto vírgula e ponto
    cleaned = re.sub(r'[^\d,\.]', '', price_str)
    
    # Substitui vírgula por ponto para formato decimal
    cleaned = cleaned.replace(',', '.')
    
    try:
        return float(cleaned)
    except ValueError:
        logger.warning(f"Não foi possível converter preço: {price_str}")
        return 0.0

def get_or_create_establishment(cur, name: str, est_type: str, url: str) -> str:
    """Retorna ID do estabelecimento ou cria um novo"""
    cur.execute(
        "SELECT id FROM establishments WHERE name = %s;",
        (name,)
    )
    result = cur.fetchone()
    
    if result:
        return result[0]
    
    cur.execute(
        """
        INSERT INTO establishments (name, type, city, state, website_url)
        VALUES (%s, %s, 'São Paulo', 'SP', %s)
        RETURNING id;
        """,
        (name, est_type, url)
    )
    return cur.fetchone()[0]

def get_or_create_product(cur, establishment_id: str, name: str, category: str = "Hambúrguer") -> str:
    """Retorna ID do produto ou cria um novo"""
    cur.execute(
        """
        SELECT id FROM products 
        WHERE establishment_id = %s AND name = %s;
        """,
        (establishment_id, name)
    )
    result = cur.fetchone()
    
    if result:
        return result[0]
    
    cur.execute(
        """
        INSERT INTO products (establishment_id, name, category)
        VALUES (%s, %s, %s)
        RETURNING id;
        """,
        (establishment_id, name, category)
    )
    return cur.fetchone()[0]

def save_price_to_database(cur, product_id: str, price: float, source: str = "AUTOMATED_SCRAPER"):
    """Salva o preço no histórico"""
    cur.execute(
        """
        INSERT INTO price_history (product_id, price, source, is_validated)
        VALUES (%s, %s, %s, TRUE);
        """,
        (product_id, price, source)
    )

async def scrape_establishment(browser, establishment_key: str, config: Dict) -> List[Dict]:
    """Faz scraping de um estabelecimento específico"""
    logger.info(f"Iniciando scraping de {config['name']}...")
    
    # Simula um dispositivo móvel para contornar bloqueios
    iphone_13 = browser.devices['iPhone 13']
    context = await browser.new_context(**iphone_13)
    page = await context.new_page()
    
    products_captured = []
    
    try:
        await page.goto(config['url'], wait_until="networkidle", timeout=30000)
        
        # Tenta diferentes seletores até encontrar elementos
        product_selector = config['selectors']['product']
        name_selector = config['selectors']['name']
        price_selector = config['selectors']['price']
        
        # Aguarda carregamento dos produtos
        await page.wait_for_selector(product_selector, timeout=10000)
        
        cards = await page.query_selector_all(product_selector)
        logger.info(f"Encontrados {len(cards)} produtos em {config['name']}")
        
        for card in cards:
            try:
                name_elem = await card.query_selector(name_selector)
                price_elem = await card.query_selector(price_selector)
                
                if name_elem and price_elem:
                    name = await name_elem.inner_text()
                    raw_price = await price_elem.inner_text()
                    
                    clean_name = name.strip()
                    clean_price_value = clean_price(raw_price)
                    
                    if clean_name and clean_price_value > 0:
                        products_captured.append({
                            "name": clean_name,
                            "price": clean_price_value,
                            "category": "Hambúrguer" if "hambúrguer" in clean_name.lower() or "burger" in clean_name.lower() else "Outros"
                        })
                        logger.debug(f"Capturado: {clean_name} - R$ {clean_price_value}")
            except Exception as e:
                logger.warning(f"Erro ao extrair dados de um produto: {e}")
                continue
        
        logger.info(f"Captura concluída: {len(products_captured)} produtos válidos")
        
    except Exception as e:
        logger.error(f"Erro ao fazer scraping de {config['name']}: {e}")
    finally:
        await context.close()
    
    return products_captured

async def run_fastfood_scraper():
    """Executa o scraping de todas as redes configuradas"""
    logger.info("Iniciando captura de preços de Fast Food...")
    
    conn = psycopg2.connect(**DB_PARAMS)
    cur = conn.cursor()
    
    total_captured = 0
    
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            
            for est_key, config in ESTABLISHMENTS_CONFIG.items():
                products = await scrape_establishment(browser, est_key, config)
                
                if products:
                    # Obtém ou cria estabelecimento
                    establishment_id = get_or_create_establishment(
                        cur, 
                        config['name'], 
                        config['type'], 
                        config['url']
                    )
                    
                    # Salva produtos e preços
                    for product in products:
                        product_id = get_or_create_product(
                            cur, 
                            establishment_id, 
                            product['name'], 
                            product['category']
                        )
                        save_price_to_database(cur, product_id, product['price'])
                        total_captured += 1
                    
                    conn.commit()
                    logger.info(f"Salvos {len(products)} preços de {config['name']}")
            
            await browser.close()
        
        logger.info(f"Scraping concluído! Total de preços capturados: {total_captured}")
        
    except Exception as e:
        logger.error(f"Erro geral no scraping: {e}")
        conn.rollback()
    finally:
        cur.close()
        conn.close()

async def run_single_establishment_scraper(establishment_key: str):
    """Executa scraping de apenas um estabelecimento específico"""
    if establishment_key not in ESTABLISHMENTS_CONFIG:
        logger.error(f"Estabelecimento {establishment_key} não configurado")
        return
    
    config = ESTABLISHMENTS_CONFIG[establishment_key]
    logger.info(f"Iniciando scraping específico de {config['name']}...")
    
    conn = psycopg2.connect(**DB_PARAMS)
    cur = conn.cursor()
    
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            products = await scrape_establishment(browser, establishment_key, config)
            
            if products:
                establishment_id = get_or_create_establishment(
                    cur, 
                    config['name'], 
                    config['type'], 
                    config['url']
                )
                
                for product in products:
                    product_id = get_or_create_product(
                        cur, 
                        establishment_id, 
                        product['name'], 
                        product['category']
                    )
                    save_price_to_database(cur, product_id, product['price'])
                
                conn.commit()
                logger.info(f"Salvos {len(products)} preços de {config['name']}")
            
            await browser.close()
    
    except Exception as e:
        logger.error(f"Erro no scraping específico: {e}")
        conn.rollback()
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        # Modo específico: python scraper.py mcdonalds
        establishment = sys.argv[1]
        asyncio.run(run_single_establishment_scraper(establishment))
    else:
        # Modo completo: scraping de todos
        asyncio.run(run_fastfood_scraper())
