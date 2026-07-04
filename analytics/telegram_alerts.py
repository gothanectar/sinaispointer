# ========================================================
# SISTEMA DE ALERTAS TELEGRAM
# ========================================================
# Envia sinais e oportunidades automaticamente para Telegram
# ========================================================

import sqlite3
import requests
from datetime import datetime

# Configurações do Telegram
TELEGRAM_BOT_TOKEN = "SEU_BOT_TOKEN_AQUI"  # Obter em @BotFather
TELEGRAM_CHAT_ID = "SEU_CHAT_ID_AQUI"  # Seu chat ID ou canal
DB_NAME = "plataforma_analytics.db"

def enviar_mensagem_telegram(mensagem):
    """Envia mensagem para o Telegram."""
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    
    try:
        response = requests.post(url, json={
            "chat_id": TELEGRAM_CHAT_ID,
            "text": mensagem,
            "parse_mode": "HTML"
        })
        
        if response.status_code == 200:
            print("✅ Mensagem enviada para Telegram")
            return True
        else:
            print(f"❌ Erro ao enviar: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Erro na requisição: {e}")
        return False

def gerar_mensagem_trading():
    """Gera mensagem com sinais de trading."""
    conn = sqlite3.connect(DB_NAME)
    df = pd.read_sql_query("""
        SELECT ativo, ticker, direcao, entrada, rsi_atual, volatilidade
        FROM sinais_trading
        WHERE direcao LIKE '%COMPRA%' OR direcao LIKE '%VENDA%'
        LIMIT 5
    """, conn)
    conn.close()
    
    if df.empty:
        return None
    
    mensagem = "🚨 <b>SINAIS DE TRADING - OPORTUNIDADES</b> 🚨\n\n"
    
    for _, row in df.iterrows():
        emoji = "📈" if "COMPRA" in row['direcao'] else "📉"
        mensagem += f"{emoji} <b>{row['ativo']}</b> ({row['ticker']})\n"
        mensagem += f"   Sinal: {row['direcao']}\n"
        mensagem += f"   Entrada: ${row['entrada']:.2f}\n"
        mensagem += f"   RSI: {row['rsi_atual']:.2f} | Volatilidade: {row['volatilidade']}\n\n"
    
    mensagem += f"\n⏰ Gerado em: {datetime.now().strftime('%d/%m/%Y %H:%M')}"
    return mensagem

def gerar_mensagem_loterias():
    """Gera mensagem com análise de loterias."""
    conn = sqlite3.connect(DB_NAME)
    df = pd.read_sql_query("SELECT * FROM analise_loterias", conn)
    conn.close()
    
    if df.empty:
        return None
    
    mensagem = "🎰 <b>ANÁLISE DE LOTERIAS - OPORTUNIDADES</b> 🎰\n\n"
    
    for _, row in df.iterrows():
        mensagem += f"🎲 <b>{row['loteria']}</b>\n"
        mensagem += f"   🔥 Quentes: {row['dezenas_quentes']}\n"
        mensagem += f"   ❄️ Frias: {row['dezenas_frias']}\n"
        mensagem += f"   🎯 Palpite: {row['palpite_gerado']}\n"
        mensagem += f"   ⏰ {row['indice_atraso']}\n\n"
    
    mensagem += f"\n⏰ Gerado em: {datetime.now().strftime('%d/%m/%Y %H:%M')}"
    return mensagem

def gerar_mensagem_esportes():
    """Gera mensagem com oportunidades esportivas."""
    conn = sqlite3.connect(DB_NAME)
    df = pd.read_sql_query("""
        SELECT * FROM scanner_esportes
        WHERE valor_esperado LIKE '%+EV%'
        LIMIT 5
    """, conn)
    conn.close()
    
    if df.empty:
        return None
    
    mensagem = "⚽ <b>OPORTUNIDADES ESPORTIVAS - +EV</b> ⚽\n\n"
    
    for _, row in df.iterrows():
        mensagem += f"{row['esporte']} <b>{row['evento']}</b>\n"
        mensagem += f"   Mercado: {row['mercado']}\n"
        mensagem += f"   Probabilidade: {row['probabilidade']}\n"
        mensagem += f"   Odd Mínima: {row['odd_minima']:.2f}\n"
        mensagem += f"   {row['valor_esperado']}\n\n"
    
    mensagem += f"\n⏰ Gerado em: {datetime.now().strftime('%d/%m/%Y %H:%M')}"
    return mensagem

def enviar_alertas_completos():
    """Envia todos os alertas para o Telegram."""
    print("🚀 Iniciando envio de alertas para Telegram...")
    
    # Enviar sinais de trading
    msg_trading = gerar_mensagem_trading()
    if msg_trading:
        enviar_mensagem_telegram(msg_trading)
    
    # Enviar análise de loterias
    msg_loterias = gerar_mensagem_loterias()
    if msg_loterias:
        enviar_mensagem_telegram(msg_loterias)
    
    # Enviar oportunidades esportivas
    msg_esportes = gerar_mensagem_esportes()
    if msg_esportes:
        enviar_mensagem_telegram(msg_esportes)
    
    print("✅ Alertas enviados com sucesso!")

if __name__ == "__main__":
    enviar_alertas_completos()
