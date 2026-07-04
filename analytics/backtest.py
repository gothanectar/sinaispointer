# ========================================================
# SISTEMA DE BACKTEST
# ========================================================
# Simula estratégias de trading com dados históricos
# ========================================================

import sqlite3
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

DB_NAME = "plataforma_analytics.db"

def simular_estrategia_rsi(dados_historicos, periodo_rsi=14, limiar_compra=30, limiar_venda=70):
    """
    Simula estratégia baseada em RSI.
    Retorna DataFrame com resultados do backtest.
    """
    resultados = []
    posicao = None
    entrada = 0
    
    for i in range(len(dados_historicos)):
        preco = dados_historicos[i]
        
        # Calcular RSI
        if i >= periodo_rsi:
            precos_janela = dados_historicos[max(0, i-50):i+1]
            rsi = calcular_rsi(precos_janela, periodo_rsi)
            
            # Sinal de compra
            if rsi < limiar_compra and posicao is None:
                posicao = 'COMPRA'
                entrada = preco
                data_entrada = datetime.now() - timedelta(days=len(dados_historicos)-i)
            
            # Sinal de venda
            elif rsi > limiar_venda and posicao == 'COMPRA':
                saida = preco
                lucro = (saida - entrada) / entrada * 100
                resultados.append({
                    'tipo': 'RSI',
                    'entrada': entrada,
                    'saida': saida,
                    'lucro_percentual': lucro,
                    'data_entrada': data_entrada.strftime('%Y-%m-%d')
                })
                posicao = None
    
    return pd.DataFrame(resultados)

def simular_estrategia_media_movel(dados_historicos, curta=20, longa=50):
    """
    Simula estratégia de cruzamento de médias móveis.
    """
    resultados = []
    posicao = None
    entrada = 0
    
    for i in range(longa, len(dados_historicos)):
        precos_janela = dados_historicos[i-longa:i+1]
        
        media_curta = np.mean(precos_janela[-curta:])
        media_longa = np.mean(precos_janela)
        
        # Cruzamento de compra
        if media_curta > media_longa and posicao is None:
            posicao = 'COMPRA'
            entrada = dados_historicos[i]
            data_entrada = datetime.now() - timedelta(days=len(dados_historicos)-i)
        
        # Cruzamento de venda
        elif media_curta < media_longa and posicao == 'COMPRA':
            saida = dados_historicos[i]
            lucro = (saida - entrada) / entrada * 100
            resultados.append({
                'tipo': 'Média Móvel',
                'entrada': entrada,
                'saida': saida,
                'lucro_percentual': lucro,
                'data_entrada': data_entrada.strftime('%Y-%m-%d')
            })
            posicao = None
    
    return pd.DataFrame(resultados)

def calcular_rsi(precos, periodo=14):
    """Calcula RSI."""
    if len(precos) < periodo:
        return 50
    
    deltas = np.diff(precos)
    ganhos = np.where(deltas > 0, deltas, 0)
    perdas = np.where(deltas < 0, -deltas, 0)
    
    media_ganhos = np.mean(ganhos[-periodo:])
    media_perdas = np.mean(perdas[-periodo:])
    
    if media_perdas == 0:
        return 100
    
    rs = media_ganhos / media_perdas
    rsi = 100 - (100 / (1 + rs))
    return rsi

def executar_backtest_completo():
    """Executa backtest completo para múltiplas estratégias."""
    print("🚀 Iniciando backtest de estratégias...")
    
    # Simular dados históricos (em produção, usar dados reais)
    dias = 365
    dados_btc = np.random.normal(50000, 5000, dias).cumsum() + 50000
    dados_eth = np.random.normal(3000, 300, dias).cumsum() + 3000
    
    # Executar estratégias
    resultados_rsi_btc = simular_estrategia_rsi(dados_btc)
    resultados_mm_btc = simular_estrategia_media_movel(dados_btc)
    
    resultados_rsi_eth = simular_estrategia_rsi(dados_eth)
    resultados_mm_eth = simular_estrategia_media_movel(dados_eth)
    
    # Consolidar resultados
    todos_resultados = pd.concat([
        resultados_rsi_btc.assign(ativo='Bitcoin'),
        resultados_mm_btc.assign(ativo='Bitcoin'),
        resultados_rsi_eth.assign(ativo='Ethereum'),
        resultados_mm_eth.assign(ativo='Ethereum')
    ], ignore_index=True)
    
    # Salvar no banco de dados
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    cursor.execute("DELETE FROM performance_historica")
    
    for _, row in todos_resultados.iterrows():
        resultado = "GAIN" if row['lucro_percentual'] > 0 else "LOSS"
        cursor.execute("""
            INSERT INTO performance_historica (tipo, ativo, resultado, lucro_perda, data_hora)
            VALUES (?, ?, ?, ?, ?)
        """, (row['tipo'], row['ativo'], resultado, row['lucro_percentual'], row['data_entrada']))
    
    conn.commit()
    conn.close()
    
    # Calcular estatísticas
    if not todos_resultados.empty:
        total_trades = len(todos_resultados)
        trades_ganhadores = len(todos_resultados[todos_resultados['lucro_percentual'] > 0])
        win_rate = (trades_ganhadores / total_trades) * 100
        lucro_medio = todos_resultados['lucro_percentual'].mean()
        
        print(f"✅ Backtest concluído!")
        print(f"📊 Total de trades: {total_trades}")
        print(f"🎯 Win Rate: {win_rate:.2f}%")
        print(f"💰 Lucro médio: {lucro_medio:.2f}%")
    else:
        print("⚠️ Nenhum trade gerado no backtest")

if __name__ == "__main__":
    executar_backtest_completo()
