# ========================================================
# INTERFACE WEB UNIFICADA - Trading & Apostas
# ========================================================
# Painel completo combinando sinais de trading e análise de apostas
# ========================================================

import streamlit as st
import pandas as pd
import sqlite3
import plotly.graph_objects as go
from datetime import datetime
import json
import random

# Configuração da página
st.set_page_config(
    page_title="Terminal Pro - Trading & Analytics",
    layout="wide",
    page_icon="⚡",
    initial_sidebar_state="expanded"
)

# Configuração de CSS personalizado
st.markdown("""
    <style>
    .main {
        background-color: #0d1117;
    }
    .stApp {
        background-color: #0d1117;
    }
    h1, h2, h3 {
        color: #58a6ff;
    }
    .metric-card {
        background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
        border: 1px solid #374151;
        border-radius: 10px;
        padding: 20px;
        margin: 10px 0;
    }
    </style>
""", unsafe_allow_html=True)

DB_NAME = "plataforma_analytics.db"

# ========================================================
# FUNÇÕES DE BANCO DE DADOS
# ========================================================

def carregar_dados(query):
    """Carrega dados do banco de dados."""
    try:
        conn = sqlite3.connect(DB_NAME)
        df = pd.read_sql_query(query, conn)
        conn.close()
        return df
    except Exception as e:
        st.error(f"Erro ao carregar dados: {e}")
        return pd.DataFrame()

def obter_ultima_atualizacao():
    """Obtém a última atualização do sistema."""
    try:
        conn = sqlite3.connect(DB_NAME)
        cursor = conn.cursor()
        
        # Verificar última atualização de cada tabela
        tabelas = ["sinais_trading", "analise_loterias", "scanner_esportes"]
        atualizacoes = []
        
        for tabela in tabelas:
            cursor.execute(f"SELECT MAX(data_hora) FROM {tabela}")
            resultado = cursor.fetchone()
            if resultado and resultado[0]:
                atualizacoes.append(resultado[0])
        
        conn.close()
        
        if atualizacoes:
            return max(atualizacoes)
        return "Nunca atualizado"
    except:
        return "Erro ao verificar"

# ========================================================
# SIDEBAR - NAVEGAÇÃO E CONTROLES
# ========================================================

with st.sidebar:
    st.title("⚡ Terminal Pro")
    st.markdown("---")
    
    # Informações do sistema
    st.subheader("📊 Status do Sistema")
    ultima_atualizacao = obter_ultima_atualizacao()
    st.info(f"Última atualização:\n{ultima_atualizacao}")
    
    st.markdown("---")
    
    # Seletor de modo
    modo = st.selectbox(
        "Modo de Operação",
        ["� Dashboard Unificado", "� Trading", "🎰 Loterias", "⚽ Esportes", "📰 Notícias", "📊 Analytics"]
    )
    
    # Links para dashboards específicos
    st.markdown("---")
    st.markdown("### 🚀 Dashboards Especializados")
    col1, col2 = st.columns(2)
    
    with col1:
        if st.button("🎰 Dashboard Loterias (Detalhado)"):
            st.info("Execute: streamlit run loterias_dashboard.py")
    
    with col2:
        if st.button("⚽ Dashboard Esportes (Detalhado)"):
            st.info("Execute: streamlit run esportes_dashboard.py")
    
    st.markdown("---")
    
    st.markdown("---")
    
    # Controles rápidos
    st.subheader("⚙️ Controles")
    if st.button("🔄 Atualizar Dados"):
        st.success("Solicitação de atualização enviada!")
        # Aqui você pode chamar o motor.py
    
    st.markdown("---")
    
    # Informações
    st.subheader("ℹ️ Informações")
    st.markdown("""
    **Versão:** 1.0.0
    **Desenvolvido por:** TradePulse
    **Licença:** Comercial
    """)

# ========================================================
# CABEÇALHO PRINCIPAL
# ========================================================

st.title("🤖 Plataforma Inteligente de Análises")
st.subheader("Sinais e oportunidades gerados por cruzamento de dados matemáticos")

st.markdown("---")

# ========================================================
# MODO: DASHBOARD UNIFICADO
# ========================================================

if modo == "🚀 Dashboard Unificado":
    st.header("🚀 Dashboard Unificado - Trading & Apostas")
    
    # Tabs para diferentes visões
    tab1, tab2, tab3 = st.tabs(["📊 Visão Geral", "⚽ Oportunidades +EV", "🎰 Loterias"])
    
    with tab1:
        st.subheader("📈 Sinais de Trading + ⚽ Apostas Esportivas")
        
        # Métricas combinadas
        col1, col2, col3, col4 = st.columns(4)
        
        df_trading = carregar_dados("SELECT * FROM sinais_trading")
        df_esportes = carregar_dados("SELECT * FROM scanner_esportes")
        
        if not df_trading.empty:
            with col1:
                st.metric("Sinais Trading", len(df_trading))
        if not df_esportes.empty:
            with col2:
                ev_positivo = len(df_esportes[df_esportes['valor_esperado'].str.contains(r'\+EV')])
                st.metric("Oportunidades +EV", ev_positivo)
        with col3:
            st.metric("Ativos Monitorados", len(df_trading) if not df_trading.empty else 0)
        with col4:
            st.metric("Eventos Esportivos", len(df_esportes) if not df_esportes.empty else 0)
        
        st.markdown("---")
        
        # Grid de sinais de trading
        col1, col2 = st.columns(2)
        
        with col1:
            st.subheader("📊 Últimos Sinais de Trading")
            if not df_trading.empty:
                df_display = df_trading.head(5)[['ativo', 'direcao', 'entrada', 'rsi_atual']]
                df_display.columns = ['Ativo', 'Sinal', 'Preço', 'RSI']
                st.dataframe(df_display, use_container_width=True, hide_index=True)
            else:
                st.info("Aguardando sinais de trading...")
        
        with col2:
            st.subheader("⚽ Oportunidades de Apostas")
            if not df_esportes.empty:
                df_display = df_esportes.head(5)[['esporte', 'evento', 'probabilidade', 'valor_esperado']]
                df_display.columns = ['Esporte', 'Evento', 'Probabilidade', 'Valor Esperado']
                st.dataframe(df_display, use_container_width=True, hide_index=True)
            else:
                st.info("Aguardando oportunidades de apostas...")
    
    with tab2:
        st.subheader("⚽ Oportunidades +EV Detalhadas")
        
        if not df_esportes.empty:
            # Filtro para +EV apenas
            df_ev_positivo = df_esportes[df_esportes['valor_esperado'].str.contains(r'\+EV')]
            
            if not df_ev_positivo.empty:
                st.metric("Total de Oportunidades +EV", len(df_ev_positivo))
                
                for idx, row in df_ev_positivo.head(10).iterrows():
                    with st.expander(f"🎯 {row['evento']} - {row['esporte']}"):
                        col1, col2, col3 = st.columns(3)
                        
                        with col1:
                            st.metric("Probabilidade", row['probabilidade'])
                        with col2:
                            st.metric("Odd Mínima", f"{row['odd_minima']:.2f}")
                        with col3:
                            st.metric("Valor Esperado", row['valor_esperado'])
                        
                        st.info(f"📊 Palpite: {row['palpite']}")
                        st.info(f"🏆 Campeonato: {row['mercado']}")
            else:
                st.warning("Nenhuma oportunidade +EV encontrada no momento.")
        else:
            st.info("Execute o motor.py para gerar dados de apostas.")
    
    with tab3:
        st.subheader("🎰 Análise de Loterias")
        
        df_loterias = carregar_dados("SELECT * FROM analise_loterias")
        
        if not df_loterias.empty:
            for idx, row in df_loterias.iterrows():
                with st.expander(f"🎲 {row['loteria']}"):
                    col1, col2 = st.columns(2)
                    
                    with col1:
                        st.metric("Números Quentes", row['dezenas_quentes'])
                        st.metric("Números Frios", row['dezenas_frias'])
                    
                    with col2:
                        st.success(f"🎯 Palpite: {row['palpite_gerado']}")
                        st.warning(f"⏰ {row['indice_atraso']}")
        else:
            st.info("Execute o motor.py para gerar dados de loterias.")

# ========================================================
# MODO: TRADING
# ========================================================

elif modo == "📈 Trading":
    st.header("📊 Painel Técnico de Ativos")
    
    # Métricas rápidas
    col1, col2, col3, col4 = st.columns(4)
    
    df_trading = carregar_dados("SELECT * FROM sinais_trading")
    
    if not df_trading.empty:
        with col1:
            st.metric("Ativos Monitorados", len(df_trading))
        with col2:
            compras = len(df_trading[df_trading['direcao'].str.contains('COMPRA')])
            st.metric("Sinais de Compra", compras)
        with col3:
            vendas = len(df_trading[df_trading['direcao'].str.contains('VENDA')])
            st.metric("Sinais de Venda", vendas)
        with col4:
            neutros = len(df_trading[df_trading['direcao'].str.contains('AGUARDAR')])
            st.metric("Aguardando", neutros)
    
    st.markdown("---")
    
    # Tabela de sinais
    st.subheader("🎯 Sinais Atuais")
    df_display = carregar_dados("""
        SELECT ativo as Ativo, ticker as Ticker, 
        direcao as 'Sinal do Robô', entrada as 'Preço de Entrada', 
        rsi_atual as 'RSI (14)', volatilidade as Volatilidade,
        macd as MACD, bollinger as 'Bollinger Bands',
        tendencia as Tendência, data_hora as 'Horário'
        FROM sinais_trading
    """)
    
    if not df_display.empty:
        # Colorir based on sinal
        def colorir_sinal(val):
            if 'COMPRA' in str(val):
                return 'background-color: #00ff0033'
            elif 'VENDA' in str(val):
                return 'background-color: #ff000033'
            return ''
        
        styled_df = df_display.style.map(colorir_sinal, subset=['Sinal do Robô'])
        st.dataframe(styled_df, use_container_width=True, hide_index=True)
    else:
        st.info("Aguardando o motor diário gerar os primeiros sinais de mercado...")
    
    st.markdown("---")
    
    # Correlação de ativos
    st.subheader("🔗 Correlação Entre Ativos")
    df_correlacao = carregar_dados("""
        SELECT ativo_a as 'Ativo A', ativo_b as 'Ativo B', 
        correlacao as Correlação, periodo as 'Tipo de Correlação'
        FROM correlacao_ativos
    """)
    
    if not df_correlacao.empty:
        st.dataframe(df_correlacao, use_container_width=True, hide_index=True)

# ========================================================
# MODO: LOTERIAS
# ========================================================

elif modo == "🎰 Loterias":
    st.header("🎲 Inteligência Operacional de Loterias")
    
    df_loterias = carregar_dados("""
        SELECT loteria as Loteria, dezenas_quentes as 'Números Quentes',
        dezenas_frias as 'Números Frios', quadrante_favorito as 'Região Tendência',
        palpite_gerado as 'Sugestão de Fechamento', indice_atraso as 'Índice de Atraso'
        FROM analise_loterias
    """)
    
    if not df_loterias.empty:
        for idx, linha in df_loterias.iterrows():
            with st.expander(f"📊 Análise Completa: {linha['Loteria']}"):
                col1, col2 = st.columns(2)
                
                with col1:
                    st.metric("🔥 Números Quentes (Mais Sorteados)", linha['Números Quentes'])
                    st.metric("❄️ Números Frios (Mais Atrasados)", linha['Números Frios'])
                
                with col2:
                    st.info(f"🎯 **Zona Alvo do Próximo Concurso:** {linha['Região Tendência']}")
                    st.success(f"🔮 **Palpite Sugerido para Caneta/Bilhete:** {linha['Sugestão de Fechamento']}")
                    st.warning(f"⏰ **{linha['Índice de Atraso']}**")
    else:
        st.info("Histórico de loterias em processo de mineração de dados...")

# ========================================================
# MODO: ESPORTES
# ========================================================

elif modo == "⚽ Esportes":
    st.header("⚽ Scanner Esportivo Inteligente")
    
    # Métricas
    col1, col2, col3 = st.columns(3)
    
    df_esportes = carregar_dados("SELECT * FROM scanner_esportes")
    
    if not df_esportes.empty:
        with col1:
            st.metric("Eventos Analisados", len(df_esportes))
        with col2:
            ev_positivo = len(df_esportes[df_esportes['valor_esperado'].str.contains(r'\+EV')])
            st.metric("Oportunidades +EV", ev_positivo)
        with col3:
            prob_media = df_esportes['probabilidade'].str.replace('%', '').astype(float).mean()
            st.metric("Probabilidade Média", f"{prob_media:.1f}%")
    
    st.markdown("---")
    
    # Tabela de eventos
    df_display = carregar_dados("""
        SELECT esporte as Esporte, evento as Evento, mercado as Mercado,
        palpite as Status, probabilidade as Assertividade,
        odd_minima as 'Odd Mínima', valor_esperado as 'Valor Esperado'
        FROM scanner_esportes
    """)
    
    if not df_display.empty:
        def colorir_ev(val):
            if '+EV' in str(val):
                return 'background-color: #00ff0033'
            elif '-EV' in str(val):
                return 'background-color: #ff000033'
            return ''
        
        styled_df = df_display.style.map(colorir_ev, subset=['Valor Esperado'])
        st.dataframe(styled_df, use_container_width=True, hide_index=True)
    else:
        st.info("Nenhuma oportunidade esportiva calculada no banco de dados.")

# ========================================================
# MODO: NOTÍCIAS
# ========================================================

elif modo == "📰 Notícias":
    st.header("📰 Notícias de Mercado em Tempo Real")
    
    col1, col2 = st.columns([2, 1])
    
    with col1:
        st.subheader("📰 Feed de Notícias")
        df_noticias = carregar_dados("""
            SELECT titulo as Título, fonte as Fonte, 
            sentimento as Sentimento, impacto as Impacto,
            data_hora as 'Horário'
            FROM noticias_mercado
        """)
        
        if not df_noticias.empty:
            for idx, linha in df_noticias.iterrows():
                with st.container():
                    st.markdown(f"### {linha['Título']}")
                    col_a, col_b, col_c = st.columns(3)
                    col_a.caption(f"📰 {linha['Fonte']}")
                    col_b.caption(f"{linha['Sentimento']}")
                    col_c.caption(f"{linha['Impacto']}")
                    st.caption(f"⏰ {linha['Horário']}")
                    st.markdown("---")
        else:
            st.info("Nenhuma notícia disponível no momento.")
    
    with col2:
        st.subheader("📅 Calendário Econômico")
        df_calendario = carregar_dados("""
            SELECT evento as Evento, moeda as Moeda, impacto as Impacto,
            atual as Atual, previsto as Previsto, anterior as Anterior
            FROM calendario_economico
        """)
        
        if not df_calendario.empty:
            for idx, linha in df_calendario.iterrows():
                with st.container():
                    st.markdown(f"**{linha['Evento']}**")
                    st.caption(f"💱 {linha['Moeda']} | {linha['Impacto']}")
                    st.markdown(f"- Atual: {linha['Atual']}")
                    st.markdown(f"- Previsto: {linha['Previsto']}")
                    st.markdown(f"- Anterior: {linha['Anterior']}")
                    st.markdown("---")
        else:
            st.info("Nenhum evento econômico agendado.")

# ========================================================
# MODO: ANALYTICS
# ========================================================

elif modo == "📊 Analytics":
    st.header("📊 Dashboard de Analytics")
    
    # Seleção de período
    periodo = st.selectbox("Período de Análise", ["Hoje", "Última Semana", "Último Mês", "Todo o Período"])
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("📈 Performance por Categoria")
        
        # Gráfico de barras simulado
        categorias = ["Trading", "Loterias", "Esportes"]
        valores = [random.randint(50, 100) for _ in range(3)]
        
        fig = go.Figure(data=[
            go.Bar(name='Sinais Gerados', x=categorias, y=valores)
        ])
        
        fig.update_layout(
            title="Sinais Gerados por Categoria",
            xaxis_title="Categoria",
            yaxis_title="Quantidade",
            plot_bgcolor="#1f2937",
            paper_bgcolor="#1f2937",
            font=dict(color="#ffffff")
        )
        
        st.plotly_chart(fig, use_container_width=True)
    
    with col2:
        st.subheader("🎯 Taxa de Acerto")
        
        # Gráfico de pizza simulado
        labels = ["Acertos", "Erros", "Pendentes"]
        values = [65, 25, 10]
        
        fig = go.Figure(data=[go.Pie(labels=labels, values=valores)])
        
        fig.update_layout(
            title="Taxa de Acerto Geral",
            plot_bgcolor="#1f2937",
            paper_bgcolor="#1f2937",
            font=dict(color="#ffffff")
        )
        
        st.plotly_chart(fig, use_container_width=True)
    
    st.markdown("---")
    
    # Tabela de performance histórica
    st.subheader("📊 Histórico de Performance")
    df_performance = carregar_dados("""
        SELECT tipo as Tipo, ativo as Ativo, resultado as Resultado,
        lucro_perda as 'Lucro/Perda', data_hora as 'Data/Hora'
        FROM performance_historica
        ORDER BY data_hora DESC
        LIMIT 20
    """)
    
    if not df_performance.empty:
        st.dataframe(df_performance, use_container_width=True, hide_index=True)
    else:
        st.info("Nenhum dado de performance disponível ainda.")

# ========================================================
# RODAPÉ
# ========================================================

st.markdown("---")
st.markdown("""
<div style='text-align: center; color: #6b7280;'>
    <p>⚡ Terminal Pro - Plataforma Inteligente de Análises</p>
    <p>Desenvolvido por TradePulse | © 2026</p>
    <p><small>Os sinais e análises são baseados em dados históricos e não garantem lucros futuros.</small></p>
</div>
""", unsafe_allow_html=True)
