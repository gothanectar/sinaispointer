# ========================================================
# ANÁLISE DE SENTIMENTO DE MERCADO
# ========================================================
# Analisa sentimento de notícias e redes sociais
# para prever movimentos de mercado
# ========================================================

import sqlite3
import pandas as pd
import re
from datetime import datetime

DB_NAME = "plataforma_analytics.db"

# Palavras-chave para análise de sentimento
PALAVRAS_POSITIVAS = [
    'crescimento', 'aumento', 'lucro', 'ganho', 'sucesso', 'positivo',
    'alta', 'subiu', 'recuperação', 'boom', 'expansão', 'forte',
    'otimista', 'bullish', 'rally', 'record', 'melhora'
]

PALAVRAS_NEGATIVAS = [
    'queda', 'perda', 'prejuízo', 'crise', 'recessão', 'negativo',
    'baixa', 'caiu', 'colapso', 'crash', 'contração', 'fraco',
    'pessimista', 'bearish', 'declínio', 'piora', 'risco', 'medo'
]

def analisar_sentimento_texto(texto):
    """
    Analisa o sentimento de um texto.
    Retorna score entre -1 (muito negativo) e 1 (muito positivo).
    """
    texto_lower = texto.lower()
    
    score_positivo = sum(1 for palavra in PALAVRAS_POSITIVAS if palavra in texto_lower)
    score_negativo = sum(1 for palavra in PALAVRAS_NEGATIVAS if palavra in texto_lower)
    
    total = score_positivo + score_negativo
    
    if total == 0:
        return 0
    
    return (score_positivo - score_negativo) / total

def classificar_sentimento(score):
    """Classifica o score em categoria."""
    if score > 0.3:
        return "🟢 Muito Positivo", "Alto"
    elif score > 0.1:
        return "🟢 Positivo", "Moderado"
    elif score > -0.1:
        return "🟡 Neutro", "Baixo"
    elif score > -0.3:
        return "🔴 Negativo", "Moderado"
    else:
        return "🔴 Muito Negativo", "Alto"

def processar_sentimento_noticias():
    """Processa sentimento das notícias do banco de dados."""
    conn = sqlite3.connect(DB_NAME)
    
    df = pd.read_sql_query("SELECT id, titulo FROM noticias_mercado", conn)
    
    if df.empty:
        conn.close()
        print("⚠️ Nenhuma notícia para analisar")
        return
    
    # Adicionar coluna de sentimento
    df['score_sentimento'] = df['titulo'].apply(analisar_sentimento_texto)
    
    # Atualizar banco de dados
    cursor = conn.cursor()
    
    for _, row in df.iterrows():
        sentimento, impacto = classificar_sentimento(row['score_sentimento'])
        
        cursor.execute("""
            UPDATE noticias_mercado
            SET sentimento = ?, impacto = ?
            WHERE id = ?
        """, (sentimento, impacto, row['id']))
    
    conn.commit()
    conn.close()
    
    print("✅ Análise de sentimento concluída!")

def calcular_sentimento_geral_mercado():
    """Calcula sentimento geral do mercado baseado em todas as notícias."""
    conn = sqlite3.connect(DB_NAME)
    
    df = pd.read_sql_query("SELECT score_sentimento FROM noticias_mercado", conn)
    
    if df.empty:
        conn.close()
        return 0, "Neutro"
    
    # Calcular média ponderada
    media_sentimento = df['score_sentimento'].mean()
    
    sentimento_geral, impacto = classificar_sentimento(media_sentimento)
    
    conn.close()
    
    return media_sentimento, sentimento_geral

def gerar_relatorio_sentimento():
    """Gera relatório detalhado de sentimento."""
    conn = sqlite3.connect(DB_NAME)
    
    df = pd.read_sql_query("""
        SELECT titulo, fonte, sentimento, impacto, data_hora
        FROM noticias_mercado
        ORDER BY data_hora DESC
    """, conn)
    
    conn.close()
    
    if df.empty:
        return None
    
    # Estatísticas
    media_score, sentimento_geral = calcular_sentimento_geral_mercado()
    
    total_positivas = len(df[df['sentimento'].str.contains('Positivo')])
    total_negativas = len(df[df['sentimento'].str.contains('Negativo')])
    total_neutras = len(df[df['sentimento'].str.contains('Neutro')])
    
    relatorio = {
        'sentimento_geral': sentimento_geral,
        'media_score': media_score,
        'total_positivas': total_positivas,
        'total_negativas': total_negativas,
        'total_neutras': total_neutras,
        'total_noticias': len(df),
        'noticias': df
    }
    
    return relatorio

if __name__ == "__main__":
    processar_sentimento_noticias()
    
    relatorio = gerar_relatorio_sentimento()
    if relatorio:
        print(f"\n📊 Relatório de Sentimento:")
        print(f"Sentimento Geral: {relatorio['sentimento_geral']}")
        print(f"Score Médio: {relatorio['media_score']:.2f}")
        print(f"Positivas: {relatorio['total_positivas']}")
        print(f"Negativas: {relatorio['total_negativas']}")
        print(f"Neutras: {relatorio['total_neutras']}")
