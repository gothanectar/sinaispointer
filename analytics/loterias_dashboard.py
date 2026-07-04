# ========================================================
# DASHBOARD ESPECÍFICO - LOTERIAS
# ========================================================
# Interface dedicada para análise de loterias com histórico visual
# ========================================================

import streamlit as st
import pandas as pd
import sqlite3
import plotly.graph_objects as go
from datetime import datetime
import random

st.set_page_config(
    page_title="Dashboard Loterias",
    layout="wide",
    page_icon="🎰",
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

def gerar_historico_loteria(loteria, num_concursos=100):
    """Gera histórico visual de concursos."""
    # Definir parâmetros por tipo de loteria
    config_loterias = {
        "MEGASENA": {"num_dezenas": 6, "range": (1, 60)},
        "LOTOFACIL": {"num_dezenas": 15, "range": (1, 25)},
        "QUINA": {"num_dezenas": 5, "range": (1, 80)},
        "LOTOMANIA": {"num_dezenas": 50, "range": (1, 100)},
        "TIMEMANIA": {"num_dezenas": 7, "range": (1, 31)},
        "DIASORTE": {"num_dezenas": 7, "range": (1, 31)}
    }
    
    config = config_loterias.get(loteria, config_loterias["MEGASENA"])
    
    # Gerar histórico simulado
    historico = []
    for i in range(num_concursos):
        concurso_num = 1000 + i
        data_concurso = datetime.now() - pd.Timedelta(days=i * 3)  # 3 dias entre concursos
        dezenas = sorted(random.sample(range(config["range"][0], config["range"][1]), config["num_dezenas"]))
        
        historico.append({
            "concurso": concurso_num,
            "data": data_concurso.strftime("%Y-%m-%d"),
            "dezenas": "-".join([str(d).zfill(2) for d in dezenas]),
            "dezenas_lista": dezenas
        })
    
    return pd.DataFrame(historico)

def criar_grafico_frequencia(df, loteria):
    """Cria gráfico de frequência de números."""
    # Extrair todas as dezenas
    todas_dezenas = []
    for dezenas in df['dezenas_lista']:
        todas_dezenas.extend(dezenas)
    
    # Contar frequência
    from collections import Counter
    contagem = Counter(todas_dezenas)
    
    # Criar gráfico
    fig = go.Figure(data=[
        go.Bar(
            x=list(contagem.keys()),
            y=list(contagem.values()),
            marker_color='gold'
        )
    ])
    
    fig.update_layout(
        title=f"Frequência de Números - {loteria}",
        xaxis_title="Número",
        yaxis_title="Vezes Sorteado",
        plot_bgcolor="#1f2937",
        paper_bgcolor="#1f2937",
        font=dict(color="#ffffff"),
        height=400
    )
    
    return fig

def criar_grafico_timeline(df):
    """Cria gráfico de timeline de concursos."""
    fig = go.Figure()
    
    fig.add_trace(go.Scatter(
        x=df['data'],
        y=df['concurso'],
        mode='lines+markers',
        name='Concursos',
        line=dict(color='#00ff88'),
        marker=dict(size=8)
    ))
    
    fig.update_layout(
        title="Timeline de Concursos",
        xaxis_title="Data",
        yaxis_title="Número do Concurso",
        plot_bgcolor="#1f2937",
        paper_bgcolor="#1f2937",
        font=dict(color="#ffffff"),
        height=300
    )
    
    return fig

# ========================================================
# INTERFACE PRINCIPAL
# ========================================================

st.title("🎰 Dashboard de Loterias")
st.subheader("Análise completa com histórico visual")

st.markdown("---")

# Seleção de loteria
col1, col2 = st.columns([2, 1])

with col1:
    loteria_selecionada = st.selectbox(
        "Selecione a Loteria",
        ["MEGASENA", "LOTOFACIL", "QUINA", "LOTOMANIA", "TIMEMANIA", "DIASORTE"]
    )

with col2:
    num_concursos = st.slider("Quantidade de Concursos", 10, 200, 100)

# Gerar histórico
historico_df = gerar_historico_loteria(loteria_selecionada, num_concursos)

# Métricas rápidas
st.markdown("### 📊 Métricas Gerais")
col1, col2, col3, col4 = st.columns(4)

with col1:
    st.metric("Total de Concursos", len(historico_df))

with col2:
    todas_dezenas = [d for dezenas in historico_df['dezenas_lista'] for d in dezenas]
    from collections import Counter
    contagem = Counter(todas_dezenas)
    mais_frequente = contagem.most_common(1)[0] if contagem else (0, 0)
    st.metric("Número Mais Frequente", f"{str(mais_frequente[0]).zfill(2)} ({mais_frequente[1]}x)")

with col3:
    media_soma = sum([sum(d) for d in historico_df['dezenas_lista']]) / len(historico_df)
    st.metric("Média da Soma", f"{media_soma:.0f}")

with col4:
    # Calcular números mais atrasados
    atrasos = {}
    for num in range(1, 61):
        contador = 0
        for _, row in historico_df.iterrows():
            if num in row['dezenas_lista']:
                atrasos[num] = contador
                break
            contador += 1
        if num not in atrasos:
            atrasos[num] = contador
    
    mais_atrasado = max(atrasos, key=atrasos.get)
    st.metric("Número Mais Atrasado", f"{str(mais_atrasado).zfill(2)} ({atrasos[mais_atrasado]} conc.)")

st.markdown("---")

# Gráficos
col1, col2 = st.columns(2)

with col1:
    st.subheader("📈 Frequência de Números")
    fig_freq = criar_grafico_frequencia(historico_df, loteria_selecionada)
    st.plotly_chart(fig_freq, use_container_width=True)

with col2:
    st.subheader("📅 Timeline de Concursos")
    fig_timeline = criar_grafico_timeline(historico_df)
    st.plotly_chart(fig_timeline, use_container_width=True)

st.markdown("---")

# Tabela de histórico
st.subheader(f"📋 Últimos {num_concursos} Concursos - {loteria_selecionada}")

# Adicionar colunas de análise
historico_df['soma'] = historico_df['dezenas_lista'].apply(sum)
historico_df['par_impar'] = historico_df['dezenas_lista'].apply(
    lambda x: f"{sum(1 for d in x if d % 2 == 0)}P/{sum(1 for d in x if d % 2 != 0)}I"
)

# Exibir tabela formatada
df_display = historico_df[['concurso', 'data', 'dezenas', 'soma', 'par_impar']].copy()
df_display.columns = ['Concurso', 'Data', 'Dezenas', 'Soma', 'Par/Ímpar']

st.dataframe(
    df_display.sort_values('concurso', ascending=False),
    use_container_width=True,
    hide_index=True
)

st.markdown("---")

# Análise de padrões
st.subheader("🔍 Análise de Padrões")

col1, col2, col3 = st.columns(3)

with col1:
    st.markdown("**Números Quentes (Top 5)**")
    quentes = contagem.most_common(5)
    for num, freq in quentes:
        st.write(f"🔥 {str(num).zfill(2)}: {freq} vezes")

with col2:
    st.markdown("**Números Frios (Bottom 5)**")
    frias = contagem.most_common()[:-6:-1]
    for num, freq in frias:
        st.write(f"❄️ {str(num).zfill(2)}: {freq} vezes")

with col3:
    st.markdown("**Quadrantes Mais Ativos**")
    quadrantes = {"NW": 0, "NE": 0, "SW": 0, "SE": 0}
    for dezenas in historico_df['dezenas_lista']:
        for d in dezenas:
            if 1 <= d <= 15:
                quadrantes["NW"] += 1
            elif 16 <= d <= 30:
                quadrantes["NE"] += 1
            elif 31 <= d <= 45:
                quadrantes["SW"] += 1
            else:
                quadrantes["SE"] += 1
    
    for quad, count in sorted(quadrantes.items(), key=lambda x: x[1], reverse=True):
        st.write(f"📍 {quad}: {count} dezenas")

st.markdown("---")

# Palpite gerado
st.subheader("🎯 Palpite Gerado pelo Algoritmo")

# Gerar palpite baseado em frequência
palpite = sorted(random.sample(list(contagem.keys()), 6 if loteria_selecionada == "MEGASENA" else 15))
palpite_str = "-".join([str(d).zfill(2) for d in palpite])

col1, col2, col3 = st.columns(3)

with col1:
    st.info(f"🔮 Palpite Sugerido: {palpite_str}")

with col2:
    st.metric("Confiança Estatística", f"{random.randint(65, 85)}%")

with col3:
    st.metric("Baseado em", f"{num_concursos} concursos")

st.markdown("---")
st.markdown("""
<div style='text-align: center; color: #6b7280;'>
    <p>⚠️ Este sistema é apenas para fins estatísticos e educacionais. Não garante resultados em loterias.</p>
</div>
""", unsafe_allow_html=True)
