# ========================================================
# SISTEMA DE RANKING DE PERFORMANCE
# ========================================================
# Classifica estratégias e ativos por performance
# ========================================================

import sqlite3
import pandas as pd
from datetime import datetime, timedelta

DB_NAME = "plataforma_analytics.db"

def calcular_ranking_estrategias():
    """Calcula ranking das estratégias baseado em performance histórica."""
    conn = sqlite3.connect(DB_NAME)
    
    # Buscar dados de performance
    df = pd.read_sql_query("""
        SELECT tipo, ativo, resultado, lucro_perda
        FROM performance_historica
    """, conn)
    
    conn.close()
    
    if df.empty:
        return pd.DataFrame()
    
    # Agrupar por tipo de estratégia
    ranking = df.groupby('tipo').agg({
        'resultado': lambda x: (x == 'GAIN').sum() / len(x) * 100,
        'lucro_perda': ['mean', 'sum', 'count']
    }).round(2)
    
    ranking.columns = ['Win Rate (%)', 'Lucro Médio (%)', 'Lucro Total (%)', 'Total Trades']
    ranking = ranking.reset_index()
    ranking = ranking.sort_values('Win Rate (%)', ascending=False)
    
    return ranking

def calcular_ranking_ativos():
    """Calcula ranking dos ativos por performance."""
    conn = sqlite3.connect(DB_NAME)
    
    df = pd.read_sql_query("""
        SELECT ativo, resultado, lucro_perda
        FROM performance_historica
    """, conn)
    
    conn.close()
    
    if df.empty:
        return pd.DataFrame()
    
    # Agrupar por ativo
    ranking = df.groupby('ativo').agg({
        'resultado': lambda x: (x == 'GAIN').sum() / len(x) * 100,
        'lucro_perda': ['mean', 'sum', 'count']
    }).round(2)
    
    ranking.columns = ['Win Rate (%)', 'Lucro Médio (%)', 'Lucro Total (%)', 'Total Trades']
    ranking = ranking.reset_index()
    ranking = ranking.sort_values('Lucro Total (%)', ascending=False)
    
    return ranking

def calcular_score_geral(tipo, ativo):
    """Calcula score geral (0-100) para uma estratégia/ativo."""
    conn = sqlite3.connect(DB_NAME)
    
    df = pd.read_sql_query("""
        SELECT resultado, lucro_perda
        FROM performance_historica
        WHERE tipo = ? AND ativo = ?
    """, conn, params=(tipo, ativo))
    
    conn.close()
    
    if df.empty:
        return 0
    
    # Fatores para o score
    win_rate = (df['resultado'] == 'GAIN').sum() / len(df) * 100
    lucro_medio = df['lucro_perda'].mean()
    total_trades = len(df)
    
    # Score baseado em múltiplos fatores
    score = (
        (win_rate * 0.4) +           # 40% peso no win rate
        (min(lucro_medio, 10) * 5) + # 50% peso no lucro médio (max 10% = 50 pontos)
        (min(total_trades, 50) * 0.2) # 10% peso no número de trades (max 50 = 10 pontos)
    )
    
    return min(score, 100)  # Máximo 100

def atualizar_ranking_diario():
    """Atualiza ranking diário e salva no banco."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    # Criar tabela de ranking se não existir
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS ranking_diario (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tipo TEXT, ativo TEXT, score REAL,
            win_rate REAL, lucro_medio REAL, total_trades INTEGER,
            data TEXT
        )
    """)
    
    # Limpar rankings antigos
    cursor.execute("DELETE FROM ranking_diario")
    
    # Calcular rankings
    ranking_estrategias = calcular_ranking_estrategias()
    ranking_ativos = calcular_ranking_ativos()
    
    # Salvar ranking de estratégias
    for _, row in ranking_estrategias.iterrows():
        score = (row['Win Rate (%)'] * 0.6) + (row['Lucro Médio (%)'] * 4)
        cursor.execute("""
            INSERT INTO ranking_diario (tipo, ativo, score, win_rate, lucro_medio, total_trades, data)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (row['tipo'], 'Geral', score, row['Win Rate (%)'], row['Lucro Médio (%)'], row['Total Trades'], datetime.now().strftime('%Y-%m-%d')))
    
    # Salvar ranking de ativos
    for _, row in ranking_ativos.iterrows():
        score = (row['Win Rate (%)'] * 0.6) + (row['Lucro Médio (%)'] * 4)
        cursor.execute("""
            INSERT INTO ranking_diario (tipo, ativo, score, win_rate, lucro_medio, total_trades, data)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, ('Geral', row['ativo'], score, row['Win Rate (%)'], row['Lucro Médio (%)'], row['Total Trades'], datetime.now().strftime('%Y-%m-%d')))
    
    conn.commit()
    conn.close()
    
    print("✅ Ranking diário atualizado!")

if __name__ == "__main__":
    atualizar_ranking_diario()
