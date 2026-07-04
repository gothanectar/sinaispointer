# ========================================================
# CAPTURADOR ESPORTIVO ROBUSTO - MULTI-FONTE
# ========================================================
# Captura dados de futebol de múltiplas fontes gratuitas
# Sistema de fallback automático
# ========================================================

import requests
from datetime import datetime
import json
import random

def capturar_api_football_data():
    """
    Tenta capturar dados da API-Football (plano gratuito).
    """
    # API-Football tem plano gratuito com 100 requisições/dia
    # Você precisa se registrar em https://api-football.com/
    api_key = "SUA_CHAVE_AQUI"  # Substituir com sua chave real
    
    if api_key == "SUA_CHAVE_AQUI":
        return None
    
    data_hoje = datetime.now().strftime("%Y-%m-%d")
    url = f"https://api-football-v1.p.rapidapi.com/v3/fixtures?date={data_hoje}"
    
    headers = {
        "X-RapidAPI-Key": api_key,
        "X-RapidAPI-Host": "api-football-v1.p.rapidapi.com"
    }
    
    try:
        resposta = requests.get(url, headers=headers, timeout=10)
        if resposta.status_code == 200:
            dados = resposta.json()
            return dados.get("response", [])
    except:
        pass
    
    return None

def capturar_the_odds_api():
    """
    Tenta capturar dados da The Odds API (plano gratuito).
    """
    # The Odds API tem plano gratuito com 500 requisições/mês
    api_key = "SUA_CHAVE_AQUI"  # Substituir com sua chave real
    
    if api_key == "SUA_CHAVE_AQUI":
        return None
    
    url = "https://api.the-odds-api.com/v4/sports/soccer_epl/odds/"
    
    params = {
        "apiKey": api_key,
        "regions": "eu",
        "markets": "h2h"
    }
    
    try:
        resposta = requests.get(url, params=params, timeout=10)
        if resposta.status_code == 200:
            dados = resposta.json()
            return dados
    except:
        pass
    
    return None

def capturar_jogos_do_dia_robusto():
    """
    Captura os jogos do dia usando múltiplas fontes com fallback.
    """
    print("🛰️ Iniciando captura multi-fonte de jogos...")
    
    # Tentar API-Football primeiro
    dados_api_football = capturar_api_football_data()
    if dados_api_football:
        print("✅ Dados capturados via API-Football")
        return processar_dados_api_football(dados_api_football)
    
    # Tentar The Odds API
    dados_odds = capturar_the_odds_api()
    if dados_odds:
        print("✅ Dados capturados via The Odds API")
        return processar_dados_odds(dados_odds)
    
    # Fallback para dados simulados realistas
    print("⚠️ APIs externas indisponíveis. Usando dados simulados...")
    return gerar_jogos_simulados()

def processar_dados_api_football(dados):
    """Processa dados da API-Football."""
    jogos = []
    
    for jogo in dados:
        try:
            campeonato = jogo.get("league", {}).get("name", "")
            time_casa = jogo.get("teams", {}).get("home", {}).get("name", "")
            time_fora = jogo.get("teams", {}).get("away", {}).get("name", "")
            status = jogo.get("fixture", {}).get("status", {}).get("long", "")
            
            # Odds
            odds = jogo.get("bookmakers", [{}])[0].get("bets", [{}])[0].get("values", [])
            odd_casa = odds[0].get("odd", 0) if len(odds) > 0 else 0
            odd_empate = odds[1].get("odd", 0) if len(odds) > 1 else 0
            odd_fora = odds[2].get("odd", 0) if len(odds) > 2 else 0
            
            jogos.append({
                "id": jogo.get("fixture", {}).get("id"),
                "campeonato": campeonato,
                "jogo": f"{time_casa} vs {time_fora}",
                "time_casa": time_casa,
                "time_fora": time_fora,
                "status": status,
                "horario": jogo.get("fixture", {}).get("date", "")[-5:],
                "odd_casa": odd_casa,
                "odd_empate": odd_empate,
                "odd_fora": odd_fora,
                "data": datetime.now().strftime("%Y-%m-%d")
            })
        except:
            continue
    
    return jogos

def processar_dados_odds(dados):
    """Processa dados da The Odds API."""
    jogos = []
    
    for jogo in dados:
        try:
            time_casa = jogo.get("home_team", "")
            time_fora = jogo.get("away_team", "")
            
            # Odds
            odds = jogo.get("bookmakers", [{}])[0].get("markets", [{}])[0].get("outcomes", [])
            odd_casa = odds[0].get("price", 0) if len(odds) > 0 else 0
            odd_empate = odds[1].get("price", 0) if len(odds) > 1 else 0
            odd_fora = odds[2].get("price", 0) if len(odds) > 2 else 0
            
            jogos.append({
                "id": jogo.get("id"),
                "campeonato": "Premier League",
                "jogo": f"{time_casa} vs {time_fora}",
                "time_casa": time_casa,
                "time_fora": time_fora,
                "status": "Scheduled",
                "horario": "15:00",
                "odd_casa": odd_casa,
                "odd_empate": odd_empate,
                "odd_fora": odd_fora,
                "data": datetime.now().strftime("%Y-%m-%d")
            })
        except:
            continue
    
    return jogos

def gerar_jogos_simulados():
    """Gera jogos simulados realistas como fallback."""
    campeonatos = [
        "Brasileirão Série A", "Premier League", "La Liga",
        "Serie A", "Bundesliga", "Ligue 1", "Copa do Brasil",
        "Libertadores", "Champions League"
    ]
    
    times_br = [
        ("Flamengo", "Vasco"), ("Palmeiras", "São Paulo"),
        ("Corinthians", "Santos"), ("Grêmio", "Internacional"),
        ("Atlético-MG", "Cruzeiro"), ("Fluminense", "Botafogo")
    ]
    
    times_europa = [
        ("Real Madrid", "Barcelona"), ("Manchester City", "Liverpool"),
        ("Bayern Munich", "Dortmund"), ("PSG", "Marseille"),
        ("Juventus", "Inter Milan"), ("Ajax", "PSV")
    ]
    
    jogos = []
    
    # Adicionar jogos brasileiros
    for time_casa, time_fora in times_br:
        jogos.append({
            "id": random.randint(100000, 999999),
            "campeonato": "Brasileirão Série A",
            "jogo": f"{time_casa} vs {time_fora}",
            "time_casa": time_casa,
            "time_fora": time_fora,
            "status": "notstarted",
            "horario": f"{random.randint(16, 21)}:00",
            "odd_casa": round(random.uniform(1.5, 3.0), 2),
            "odd_empate": round(random.uniform(3.0, 4.0), 2),
            "odd_fora": round(random.uniform(2.0, 5.0), 2),
            "data": datetime.now().strftime("%Y-%m-%d")
        })
    
    # Adicionar jogos europeus
    for time_casa, time_fora in times_europa:
        jogos.append({
            "id": random.randint(100000, 999999),
            "campeonato": random.choice(["Premier League", "La Liga", "Champions League"]),
            "jogo": f"{time_casa} vs {time_fora}",
            "time_casa": time_casa,
            "time_fora": time_fora,
            "status": "notstarted",
            "horario": f"{random.randint(16, 21)}:00",
            "odd_casa": round(random.uniform(1.5, 3.0), 2),
            "odd_empate": round(random.uniform(3.0, 4.0), 2),
            "odd_fora": round(random.uniform(2.0, 5.0), 2),
            "data": datetime.now().strftime("%Y-%m-%d")
        })
    
    print(f"✅ {len(jogos)} jogos simulados gerados")
    return jogos

if __name__ == "__main__":
    print("🛰️ Testando captura robusta em tempo real...")
    
    lista_jogos = capturar_jogos_do_dia_robusto()
    print(f"\n📊 Total de jogos mapeados hoje: {len(lista_jogos)}")
    
    if lista_jogos:
        print("\n🎯 Exemplo de jogos capturados:")
        for i, jogo in enumerate(lista_jogos[:5], 1):
            print(f"\n{i}. {jogo['campeonato']}")
            print(f"   {jogo['jogo']}")
            print(f"   Horário: {jogo['horario']}")
            print(f"   Status: {jogo['status']}")
            if jogo['odd_casa'] > 0:
                print(f"   Odds: {jogo['odd_casa']} - {jogo['odd_empate']} - {jogo['odd_fora']}")
