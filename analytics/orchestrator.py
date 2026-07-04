# ========================================================
# ORQUESTRADOR PRINCIPAL
# ========================================================
# Script principal que coordena todos os sistemas
# Executa todas as rotinas em ordem e gera relatórios
# ========================================================

import subprocess
import sqlite3
import logging
from datetime import datetime
import os

# Configuração de logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('analytics/logs/orchestrator.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

DB_NAME = "plataforma_analytics.db"

# ========================================================
# FUNÇÕES DE EXECUÇÃO
# ========================================================

def executar_script(script_path, descricao):
    """Executa um script Python e retorna o resultado."""
    logger.info(f"🚀 Iniciando: {descricao}")
    
    try:
        resultado = subprocess.run(
            ['python', script_path],
            capture_output=True,
            text=True,
            timeout=300  # 5 minutos timeout
        )
        
        if resultado.returncode == 0:
            logger.info(f"✅ Concluído: {descricao}")
            return True
        else:
            logger.error(f"❌ Erro em {descricao}: {resultado.stderr}")
            return False
    except subprocess.TimeoutExpired:
        logger.error(f"⏱️ Timeout em {descricao}")
        return False
    except Exception as e:
        logger.error(f"❌ Exceção em {descricao}: {str(e)}")
        return False

def verificar_banco_dados():
    """Verifica se o banco de dados existe e está acessível."""
    try:
        conn = sqlite3.connect(DB_NAME)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tabelas = cursor.fetchall()
        conn.close()
        
        logger.info(f"📊 Banco de dados encontrado com {len(tabelas)} tabelas")
        return True
    except Exception as e:
        logger.error(f"❌ Erro ao acessar banco de dados: {str(e)}")
        return False

def gerar_relatorio_diario():
    """Gera relatório diário de execução."""
    logger.info("📝 Gerando relatório diário...")
    
    try:
        conn = sqlite3.connect(DB_NAME)
        
        # Contar registros em cada tabela
        tabelas = [
            'sinais_trading', 'analise_loterias', 'scanner_esportes',
            'correlacao_ativos', 'calendario_economico', 'noticias_mercado',
            'performance_historica', 'ranking_diario'
        ]
        
        relatorio = f"""
═════════════════════════════════════════════════════════
📊 RELATÓRIO DIÁLICO - TERMINAL PRO
═════════════════════════════════════════════════════════
📅 Data: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}
═════════════════════════════════════════════════════════
"""
        
        for tabela in tabelas:
            try:
                cursor = conn.cursor()
                cursor.execute(f"SELECT COUNT(*) FROM {tabela}")
                count = cursor.fetchone()[0]
                relatorio += f"✅ {tabela}: {count} registros\n"
            except:
                relatorio += f"⚠️ {tabela}: Não acessível\n"
        
        conn.close()
        
        relatorio += "═════════════════════════════════════════════════════════\n"
        
        logger.info(relatorio)
        
        # Salvar relatório em arquivo
        os.makedirs('analytics/logs', exist_ok=True)
        with open(f'analytics/logs/relatorio_{datetime.now().strftime("%Y%m%d")}.txt', 'w') as f:
            f.write(relatorio)
        
        return relatorio
    except Exception as e:
        logger.error(f"❌ Erro ao gerar relatório: {str(e)}")
        return None

# ========================================================
# EXECUÇÃO PRINCIPAL
# ========================================================

def executar_rotina_completa():
    """Executa todas as rotinas do sistema."""
    logger.info("🚀 Iniciando rotina completa do Terminal Pro")
    logger.info(f"⏰ Horário de início: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Criar diretório de logs se não existir
    os.makedirs('analytics/logs', exist_ok=True)
    
    # Verificar banco de dados
    if not verificar_banco_dados():
        logger.error("❌ Banco de dados não acessível. Abortando.")
        return False
    
    # Executar scripts em ordem
    scripts = [
        ('motor.py', 'Motor de Automação'),
        ('backtest.py', 'Sistema de Backtest'),
        ('ranking_system.py', 'Sistema de Ranking'),
        ('sentiment_analysis.py', 'Análise de Sentimento'),
        ('telegram_alerts.py', 'Alertas Telegram')
    ]
    
    resultados = {}
    
    for script, descricao in scripts:
        caminho_script = f'analytics/{script}'
        if os.path.exists(caminho_script):
            resultados[descricao] = executar_script(caminho_script, descricao)
        else:
            logger.warning(f"⚠️ Script não encontrado: {caminho_script}")
            resultados[descricao] = False
    
    # Gerar relatório final
    relatorio = gerar_relatorio_diario()
    
    # Resumo
    total = len(resultados)
    sucesso = sum(resultados.values())
    
    logger.info(f"📊 Resumo: {sucesso}/{total} tarefas concluídas com sucesso")
    logger.info(f"⏰ Horário de término: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    return sucesso == total

if __name__ == "__main__":
    sucesso = executar_rotina_completa()
    
    if sucesso:
        logger.info("✅ Rotina completa concluída com sucesso!")
        exit(0)
    else:
        logger.error("❌ Rotina completa concluída com erros!")
        exit(1)
