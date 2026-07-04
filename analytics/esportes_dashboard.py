# ========================================================
# DASHBOARD ESPECÍFICO - ESPORTES
# ========================================================
# Interface dedicada para análise de apostas esportivas
# ========================================================

import streamlit as st
import pandas as pd
import sqlite3
import plotly.graph_objects as go
from datetime import datetime
import random

st.set_page_config(
    page_title="Dashboard Esportes",
    layout="wide",
    page_icon="⚽",
    initial_sidebar_state="expanded"
)

DB_NAME = "plataforma_analytics.db"

# ========================================================
# FUNÇÕES DE BANCO DE DADOS
# ========================================================

def carregar_dados(query, params=None):
    """Carrega dados do banco de dados."""
    try:
        conn = sqlite3.connect(DB_NAME)
        df = pd.read_sql_query(query, conn, params=params)
        conn.close()
        return df
    except Exception as e:
        st.error(f"Erro ao carregar dados: {e}")
        return pd.DataFrame()

def criar_grafico_odds(df):
    """Cria gráfico de odds."""
    fig = go.Figure()
    
    fig.add_trace(go.Bar(
        name='Odd Casa',
        x=df['evento'],
        y=df['odd_casa'],
        marker_color='#00ff88'
    ))
    
    fig.add_trace(go.Bar(
        name='Odd Empate',
        x=df['evento'],
        y=df['odd_empate'],
        marker_color='#ffaa00'
    ))
    
    fig.add_trace(go.Bar(
        name='Odd Fora',
        x=df['evento'],
        y=df['odd_fora'],
        marker_color='#ff4444'
    ))
    
    fig.update_layout(
        title="Comparação de Odds",
        barmode='group',
        xaxis_title="Jogo",
        yaxis_title="Odd",
        plot_bgcolor="#1f2937",
        paper_bgcolor="#1f2937",
        font=dict(color="#ffffff"),
        height=400
    )
    
    return fig

def criar_grafico_probabilidade(df):
    """Cria gráfico de probabilidade."""
    fig = go.Figure()
    
    df['prob_num'] = df['probabilidade'].str.replace('%', '').astype(float)
    
    fig.add_trace(go.Pie(
        labels=df['evento'],
        values=df['prob_num'],
        hole=0.4,
        marker=dict(colors=['#00ff88', '#ffaa00', '#ff4444', '#00aaff', '#ff88ff'])
    ))
    
    fig.update_layout(
        title="Distribuição de Probabilidades",
        plot_bgcolor="#1f2937",
        paper_bgcolor="#1f2937",
        font=dict(color="#ffffff"),
        height=400
    )
    
    return fig

# ========================================================
# INTERFACE PRINCIPAL
# ========================================================

st.title("⚽ Dashboard de Apostas Esportivas")
st.subheader("Análise completa de oportunidades +EV")

st.markdown("---")

# Filtros
col1, col2, col3 = st.columns(3)

with col1:
    campeonato_filtro = st.selectbox(
        "Campeonato",
        ["Todos", "Brasileirão Série A", "Premier League", "La Liga", "Champions League"]
    )

with col2:
    ev_filtro = st.selectbox(
        "Valor Esperado",
        ["Todos", "+EV Apenas", "-EV Apenas"]
    )

with col3:
    ordem = st.selectbox(
        "Ordenar por",
        ["Probabilidade", "Odd Mínima", "Valor Esperado"]
    )

# Carregar dados
query = "SELECT * FROM scanner_esportes"
df_esportes = carregar_dados(query)

if not df_esportes.empty:
    # Aplicar filtros
    if campeonato_filtro != "Todos":
        df_esportes = df_esportes[df_esportes['mercado'].str.contains(campeonato_filtro, case=False, na=False)]
    
    if ev_filtro == "+EV Apenas":
        df_esportes = df_esportes[df_esportes['valor_esperado'].str.contains('\+EV')]
    elif ev_filtro == "-EV Apenas":
        df_esportes = df_esportes[df_esportes['valor_esperado'].str.contains('-EV')]
    
    # Ordenar
    if ordem == "Probabilidade":
        df_esportes['prob_num'] = df_esportes['probabilidade'].str.replace('%', '').astype(float)
        df_esportes = df_esportes.sort_values('prob_num', ascending=False)
    elif ordem == "Odd Mínima":
        df_esportes = df_esportes.sort_values('odd_minima', ascending=True)
    elif ordem == "Valor Esperado":
        df_esportes = df_esportes.sort_values('valor_esperado', ascending=False)

# Métricas rápidas
st.markdown("### 📊 Métricas Gerais")
col1, col2, col3, col4 = st.columns(4)

if not df_esportes.empty:
    with col1:
        st.metric("Total de Jogos", len(df_esportes))
    
    with col2:
        ev_positivo = len(df_esportes[df_esportes['valor_esperado'].str.contains('\+EV')])
        st.metric("Oportunidades +EV", ev_positivo)
    
    with col3:
        df_esportes['prob_num'] = df_esportes['probabilidade'].str.replace('%', '').astype(float)
        prob_media = df_esportes['prob_num'].mean()
        st.metric("Probabilidade Média", f"{prob_media:.1f}%")
    
    with col4:
        odd_media = df_esportes['odd_minima'].mean()
        st.metric("Odd Média", f"{odd_media:.2f}")

st.markdown("---")

# Gráficos
col1, col2 = st.columns(2)

with col1:
    st.subheader("📊 Comparação de Odds")
    if not df_esportes.empty:
        fig_odds = criar_grafico_odds(df_esportes.head(10))
        st.plotly_chart(fig_odds, use_container_width=True)
    else:
        st.info("Nenhum dado disponível")

with col2:
    st.subheader("🎯 Distribuição de Probabilidades")
    if not df_esportes.empty:
        fig_prob = criar_grafico_probabilidade(df_esportes.head(5))
        st.plotly_chart(fig_prob, use_container_width=True)
    else:
        st.info("Nenhum dado disponível")

st.markdown("---")

# Tabela de jogos
st.subheader("📋 Jogos Disponíveis")

if not df_esportes.empty:
    # Formatar tabela
    df_display = df_esportes.copy()
    df_display = df_display[['esporte', 'evento', 'mercado', 'palpite', 'probabilidade', 'odd_minima', 'valor_esperado', 'data_evento']]
    df_display.columns = ['Esporte', 'Jogo', 'Campeonato', 'Palpite', 'Probabilidade', 'Odd Mínima', 'Valor Esperado', 'Data']
    
    # Colorir valor esperado
    def colorir_ev(val):
        if '+EV' in str(val):
            return 'background-color: #00ff0033'
        elif '-EV' in str(val):
            return 'background-color: #ff000033'
        return ''
    
    styled_df = df_display.style.applymap(colorir_ev, subset=['Valor Esperado'])
    st.dataframe(styled_df, use_container_width=True, hide_index=True)
else:
    st.info("Nenhum jogo disponível no momento. Execute o motor.py para atualizar os dados.")

st.markdown("---")

# Análise detalhada
st.subheader("🔍 Análise Detalhada")

if not df_esportes.empty:
    jogo_selecionado = st.selectbox(
        "Selecione um jogo para análise detalhada",
        df_esportes['evento'].tolist()
    )
    
    jogo_detalhes = df_esportes[df_esportes['evento'] == jogo_selecionado].iloc[0]
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.info(f"🏆 {jogo_detalhes['mercado']}")
        st.write(f"⏰ {jogo_detalhes['data_evento']}")
    
    with col2:
        st.metric("Probabilidade", jogo_detalhes['probabilidade'])
        st.metric("Odd Mínima", f"{jogo_detalhes['odd_minima']:.2f}")
    
    with col3:
        st.metric("Valor Esperado", jogo_detalhes['valor_esperado'])
        st.write(f"📊 {jogo_detalhes['palpite']}")
    
    # Recomendação
    st.markdown("---")
    st.subheader("💡 Recomendação do Algoritmo")
    
    if '+EV' in jogo_detalhes['valor_esperado']:
        st.success("✅ Este jogo apresenta Valor Esperado Positivo. Pode ser uma boa oportunidade.")
    elif '-EV' in jogo_detalhes['valor_esperado']:
        st.warning("⚠️ Este jogo apresenta Valor Esperado Negativo. Não recomendado.")
    else:
        st.info("⏳ Valor Esperado Neutro. Aguarde mais informações.")

st.markdown("---")
st.markdown("""
<div style='text-align: center; color: #6b7280;'>
    <p>⚠️ Este sistema é apenas para fins estatísticos e educacionais. Apostas esportivas envolvem riscos.</p>
</div>
""", unsafe_allow_html=True)
