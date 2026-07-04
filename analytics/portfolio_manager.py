# ========================================================
# GESTÃO DE PORTFÓLIO
# ========================================================
# Sistema para gerenciar múltiplas posições e capital
# ========================================================

import sqlite3
import pandas as pd
from datetime import datetime

DB_NAME = "plataforma_analytics.db"

def inicializar_portfolio():
    """Inicializa tabela de portfólio no banco de dados."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS portfolio (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ativo TEXT, tipo TEXT, quantidade REAL,
            preco_medio REAL, preco_atual REAL,
            valor_total REAL, lucro_perda REAL,
            lucro_perda_percentual REAL, data_entrada TEXT
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS transacoes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ativo TEXT, tipo_transacao TEXT,
            quantidade REAL, preco REAL,
            valor_total REAL, data_hora TEXT
        )
    """)
    
    conn.commit()
    conn.close()

def adicionar_posicao(ativo, tipo, quantidade, preco):
    """Adiciona nova posição ao portfólio."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    valor_total = quantidade * preco
    data_hora = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    # Registrar transação
    cursor.execute("""
        INSERT INTO transacoes (ativo, tipo_transacao, quantidade, preco, valor_total, data_hora)
        VALUES (?, 'COMPRA', ?, ?, ?, ?)
    """, (ativo, quantidade, preco, valor_total, data_hora))
    
    # Verificar se já tem posição desse ativo
    cursor.execute("SELECT quantidade, preco_medio FROM portfolio WHERE ativo = ?", (ativo,))
    resultado = cursor.fetchone()
    
    if resultado:
        # Atualizar posição existente (média ponderada)
        qtd_antiga, preco_medio_antigo = resultado
        nova_qtd = qtd_antiga + quantidade
        novo_preco_medio = ((qtd_antiga * preco_medio_antigo) + (quantidade * preco)) / nova_qtd
        novo_valor_total = nova_qtd * novo_preco_medio
        
        cursor.execute("""
            UPDATE portfolio
            SET quantidade = ?, preco_medio = ?, valor_total = ?, data_entrada = ?
            WHERE ativo = ?
        """, (nova_qtd, novo_preco_medio, novo_valor_total, data_hora, ativo))
    else:
        # Nova posição
        cursor.execute("""
            INSERT INTO portfolio (ativo, tipo, quantidade, preco_medio, valor_total, data_entrada)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (ativo, tipo, quantidade, preco, valor_total, data_hora))
    
    conn.commit()
    conn.close()
    print(f"✅ Posição adicionada: {ativo}")

def fechar_posicao(ativo, quantidade, preco_saida):
    """Fecha posição parcial ou totalmente."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    # Buscar posição atual
    cursor.execute("SELECT quantidade, preco_medio FROM portfolio WHERE ativo = ?", (ativo,))
    resultado = cursor.fetchone()
    
    if not resultado:
        conn.close()
        print(f"❌ Posição não encontrada: {ativo}")
        return
    
    qtd_atual, preco_medio = resultado
    valor_saida = quantidade * preco_saida
    data_hora = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    # Calcular lucro/perda
    lucro_perda = (preco_saida - preco_medio) * quantidade
    lucro_percentual = ((preco_saida - preco_medio) / preco_medio) * 100
    
    # Registrar transação
    cursor.execute("""
        INSERT INTO transacoes (ativo, tipo_transacao, quantidade, preco, valor_total, data_hora)
        VALUES (?, 'VENDA', ?, ?, ?, ?)
    """, (ativo, quantidade, preco_saida, valor_saida, data_hora))
    
    # Atualizar ou remover posição
    nova_qtd = qtd_atual - quantidade
    
    if nova_qtd <= 0:
        # Fechar posição completamente
        cursor.execute("DELETE FROM portfolio WHERE ativo = ?", (ativo,))
    else:
        # Fechar parcialmente
        novo_valor_total = nova_qtd * preco_medio
        cursor.execute("""
            UPDATE portfolio
            SET quantidade = ?, valor_total = ?
            WHERE ativo = ?
        """, (nova_qtd, novo_valor_total, ativo))
    
    # Registrar performance
    cursor.execute("""
        INSERT INTO performance_historica (tipo, ativo, resultado, lucro_perda, data_hora)
        VALUES (?, ?, ?, ?, ?)
    """, ('Portfolio', ativo, 'GAIN' if lucro_perda > 0 else 'LOSS', lucro_percentual, data_hora))
    
    conn.commit()
    conn.close()
    
    status = "✅" if lucro_perda > 0 else "❌"
    print(f"{status} Posição fechada: {ativo} | Lucro/Perda: ${lucro_perda:.2f} ({lucro_percentual:.2f}%)")

def atualizar_precos_portfolio(dicionario_precos):
    """Atualiza preços atuais de todas as posições."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    for ativo, preco_atual in dicionario_precos.items():
        cursor.execute("SELECT quantidade, preco_medio FROM portfolio WHERE ativo = ?", (ativo,))
        resultado = cursor.fetchone()
        
        if resultado:
            quantidade, preco_medio = resultado
            valor_total = quantidade * preco_atual
            lucro_perda = (preco_atual - preco_medio) * quantidade
            lucro_percentual = ((preco_atual - preco_medio) / preco_medio) * 100
            
            cursor.execute("""
                UPDATE portfolio
                SET preco_atual = ?, valor_total = ?, lucro_perda = ?, lucro_perda_percentual = ?
                WHERE ativo = ?
            """, (preco_atual, valor_total, lucro_perda, lucro_percentual, ativo))
    
    conn.commit()
    conn.close()
    print("✅ Preços do portfólio atualizados!")

def obter_resumo_portfolio():
    """Obtém resumo completo do portfólio."""
    conn = sqlite3.connect(DB_NAME)
    
    df = pd.read_sql_query("SELECT * FROM portfolio", conn)
    
    if df.empty:
        conn.close()
        return None
    
    # Calcular métricas
    total_investido = df['valor_total'].sum()
    total_lucro_perda = df['lucro_perda'].sum()
    
    # Calcular retorno percentual
    if total_investido > 0:
        retorno_percentual = (total_lucro_perda / total_investido) * 100
    else:
        retorno_percentual = 0
    
    resumo = {
        'total_ativos': len(df),
        'total_investido': total_investido,
        'total_lucro_perda': total_lucro_perda,
        'retorno_percentual': retorno_percentual,
        'posicoes': df
    }
    
    conn.close()
    return resumo

if __name__ == "__main__":
    # Exemplo de uso
    inicializar_portfolio()
    
    # Adicionar posições
    adicionar_posicao("Bitcoin", "Cripto", 0.5, 65000)
    adicionar_posicao("Ethereum", "Cripto", 2.0, 3500)
    
    # Atualizar preços
    atualizar_precos_portfolio({
        "Bitcoin": 67000,
        "Ethereum": 3600
    })
    
    # Ver resumo
    resumo = obter_resumo_portfolio()
    if resumo:
        print(f"\n📊 Resumo do Portfólio:")
        print(f"Total de Ativos: {resumo['total_ativos']}")
        print(f"Total Investido: ${resumo['total_investido']:.2f}")
        print(f"Lucro/Perda Total: ${resumo['total_lucro_perda']:.2f}")
        print(f"Retorno: {resumo['retorno_percentual']:.2f}%")
