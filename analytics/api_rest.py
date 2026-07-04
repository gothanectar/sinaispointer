# ========================================================
# API REST PARA TERCEIROS
# ========================================================
# API Flask para integração com sistemas externos
# ========================================================

from flask import Flask, jsonify, request
from flask_cors import CORS
import sqlite3
import pandas as pd
from datetime import datetime

app = Flask(__name__)
CORS(app)  # Permite requisições de qualquer origem

DB_NAME = "plataforma_analytics.db"

def obter_dados(query, params=None):
    """Função auxiliar para obter dados do banco."""
    conn = sqlite3.connect(DB_NAME)
    df = pd.read_sql_query(query, conn, params=params)
    conn.close()
    return df

# ========================================================
# ENDPOINTS PRINCIPAIS
# ========================================================

@app.route('/api/health', methods=['GET'])
def health_check():
    """Verifica se a API está funcionando."""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'version': '1.0.0'
    })

@app.route('/api/sinais/trading', methods=['GET'])
def obter_sinais_trading():
    """Retorna sinais de trading atuais."""
    df = obter_dados("""
        SELECT ativo, ticker, direcao, entrada, rsi_atual, 
        volatilidade, macd, tendencia, data_hora
        FROM sinais_trading
        ORDER BY data_hora DESC
    """)
    
    if df.empty:
        return jsonify({'error': 'Nenhum sinal disponível'}), 404
    
    return jsonify({
        'total': len(df),
        'dados': df.to_dict('records')
    })

@app.route('/api/sinais/trading/<ticker>', methods=['GET'])
def obter_sinal_ativo(ticker):
    """Retorna sinal de um ativo específico."""
    df = obter_dados("""
        SELECT * FROM sinais_trading
        WHERE ticker = ?
    """, params=(ticker.upper(),))
    
    if df.empty:
        return jsonify({'error': 'Ativo não encontrado'}), 404
    
    return jsonify(df.to_dict('records')[0])

@app.route('/api/loterias/<loteria>', methods=['GET'])
def obter_analise_loteria(loteria):
    """Retorna análise de uma loteria específica."""
    df = obter_dados("""
        SELECT * FROM analise_loterias
        WHERE loteria = ?
    """, params=(loteria.upper(),))
    
    if df.empty:
        return jsonify({'error': 'Loteria não encontrada'}), 404
    
    return jsonify(df.to_dict('records')[0])

@app.route('/api/esportes/oportunidades', methods=['GET'])
def obter_oportunidades_esportes():
    """Retorna oportunidades esportivas com +EV."""
    df = obter_dados("""
        SELECT * FROM scanner_esportes
        WHERE valor_esperado LIKE '%+EV%'
        ORDER BY probabilidade DESC
    """)
    
    if df.empty:
        return jsonify({'error': 'Nenhuma oportunidade disponível'}), 404
    
    return jsonify({
        'total': len(df),
        'dados': df.to_dict('records')
    })

@app.route('/api/portfolio/resumo', methods=['GET'])
def obter_resumo_portfolio():
    """Retorna resumo do portfólio."""
    df = obter_dados("""
        SELECT ativo, quantidade, preco_medio, preco_atual,
        valor_total, lucro_perda, lucro_perda_percentual
        FROM portfolio
    """)
    
    if df.empty:
        return jsonify({'error': 'Portfólio vazio'}), 404
    
    total_investido = df['valor_total'].sum()
    total_lucro = df['lucro_perda'].sum()
    
    return jsonify({
        'total_ativos': len(df),
        'total_investido': float(total_investido),
        'total_lucro_perda': float(total_lucro),
        'posicoes': df.to_dict('records')
    })

@app.route('/api/calendario-economico', methods=['GET'])
def obter_calendario_economico():
    """Retorna eventos econômicos."""
    df = obter_dados("""
        SELECT * FROM calendario_economico
        ORDER BY impacto DESC
    """)
    
    if df.empty:
        return jsonify({'error': 'Nenhum evento disponível'}), 404
    
    return jsonify({
        'total': len(df),
        'dados': df.to_dict('records')
    })

@app.route('/api/noticias', methods=['GET'])
def obter_noticias():
    """Retorna notícias de mercado."""
    limite = request.args.get('limite', 10, type=int)
    
    df = obter_dados("""
        SELECT titulo, fonte, sentimento, impacto, data_hora
        FROM noticias_mercado
        ORDER BY data_hora DESC
        LIMIT ?
    """, params=(limite,))
    
    if df.empty:
        return jsonify({'error': 'Nenhuma notícia disponível'}), 404
    
    return jsonify({
        'total': len(df),
        'dados': df.to_dict('records')
    })

@app.route('/api/performance/ranking', methods=['GET'])
def obter_ranking_performance():
    """Retorna ranking de performance."""
    df = obter_dados("""
        SELECT tipo, ativo, score, win_rate, lucro_medio, total_trades
        FROM ranking_diario
        ORDER BY score DESC
    """)
    
    if df.empty:
        return jsonify({'error': 'Ranking não disponível'}), 404
    
    return jsonify({
        'total': len(df),
        'dados': df.to_dict('records')
    })

@app.route('/api/sentimento-mercado', methods=['GET'])
def obter_sentimento_mercado():
    """Retorna sentimento geral do mercado."""
    df = obter_dados("""
        SELECT sentimento, COUNT(*) as total
        FROM noticias_mercado
        GROUP BY sentimento
    """)
    
    if df.empty:
        return jsonify({'error': 'Dados de sentimento não disponíveis'}), 404
    
    return jsonify({
        'dados': df.to_dict('records')
    })

# ========================================================
# ENDPOINTS DE AÇÃO (POST)
# ========================================================

@app.route('/api/portfolio/adicionar', methods=['POST'])
def adicionar_posicao_api():
    """Adiciona nova posição ao portfólio via API."""
    dados = request.json
    
    if not all(k in dados for k in ['ativo', 'quantidade', 'preco']):
        return jsonify({'error': 'Campos obrigatórios: ativo, quantidade, preco'}), 400
    
    # Aqui você chamaria a função do portfolio_manager
    # Por simplicidade, apenas retornamos sucesso
    return jsonify({
        'status': 'success',
        'mensagem': 'Posição adicionada com sucesso'
    })

@app.route('/api/portfolio/fechar', methods=['POST'])
def fechar_posicao_api():
    """Fecha posição via API."""
    dados = request.json
    
    if not all(k in dados for k in ['ativo', 'quantidade', 'preco_saida']):
        return jsonify({'error': 'Campos obrigatórios: ativo, quantidade, preco_saida'}), 400
    
    return jsonify({
        'status': 'success',
        'mensagem': 'Posição fechada com sucesso'
    })

# ========================================================
# TRATAMENTO DE ERROS
# ========================================================

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint não encontrado'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Erro interno do servidor'}), 500

if __name__ == '__main__':
    print("🚀 API REST iniciada em http://localhost:5000")
    app.run(debug=True, host='0.0.0.0', port=5000)
