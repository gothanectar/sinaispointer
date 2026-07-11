# ========================================================
# PARTE 1: CONFIGURAÇÕES GLOBAIS E IDENTIDADE VISUAL
# ========================================================
import streamlit as st
import pandas as pd
import sqlite3
import plotly.graph_objects as go
from datetime import datetime
import os
import random
from collections import Counter

# Inicialização da Página
st.set_page_config(
    page_title="Dashboard Loterias",
    layout="wide",
    page_icon="🎰",
    initial_sidebar_state="expanded"
)

# Injetar links de navegação superiores (Design Original TradePulse)
st.markdown("""
<div style="background: rgba(0, 0, 0, 0.3); padding: 15px; border-radius: 10px; margin-bottom: 20px; border: 1px solid rgba(255, 215, 0, 0.2);">
    <div style="display: flex; gap: 20px; align-items: center; flex-wrap: wrap;">
        <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #ffd700, #ffaa00); border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                <span style="color: black; font-weight: bold; font-size: 18px;">TP</span>
            </div>
            <span style="font-size: 20px; font-weight: bold;">Trade<span style="color: #ffd700;">Pulse</span></span>
        </div>
        <div style="flex: 1;"></div>
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
            <a href="/" style="color: #888; text-decoration: none; padding: 8px 16px; border-radius: 8px; transition: all 0.3s;">📈 Trading</a>
            <a href="/sports-dashboard.html" style="color: #888; text-decoration: none; padding: 8px 16px; border-radius: 8px; transition: all 0.3s;">⚽ Apostas Esportivas</a>
            <a href="/analytics" style="color: #ffd700; text-decoration: none; padding: 8px 16px; border-radius: 8px; background: rgba(255, 215, 0, 0.15); border: 1px solid rgba(255, 215, 0, 0.2);">📊 Analytics</a>
            <a href="/tradepulse-download.html" style="color: #888; text-decoration: none; padding: 8px 16px; border-radius: 8px; transition: all 0.3s;">🤖 Download Robôs</a>
            <a href="/tradepulse-docs.html" style="color: #888; text-decoration: none; padding: 8px 16px; border-radius: 8px; transition: all 0.3s;">📖 Documentação</a>
            <a href="/prediction-market/frontend/index.html" style="color: #888; text-decoration: none; padding: 8px 16px; border-radius: 8px; transition: all 0.3s;" target="_blank">🍔 Prediction Market</a>
        </div>
    </div>
</div>
""", unsafe_allow_html=True)

DB_NAME = "plataforma_analytics.db"

def carregar_dados(query, params=None):
    """Carrega dados do banco de dados SQLite original."""
    try:
        conn = sqlite3.connect(DB_NAME)
        df = pd.read_sql_query(query, conn, params=params)
        conn.close()
        return df
    except Exception as e:
        st.error(f"Erro ao carregar dados do banco: {e}")
        return pd.DataFrame()
# ========================================================
# PARTE 2: MAPEADOR E SCANNER INTELIGENTE DE DIRETÓRIOS
# ========================================================
def gerar_historico_loteria(loteria, num_concursos=100):
    """Lê os dados históricos reais diretamente de planilhas Excel (.xlsx) de forma posicional automática."""
    caminho_script = os.path.dirname(os.path.abspath(__file__))
    
    # Ajusta dinamicamente se o terminal estiver rodando de dentro da pasta analytics
    if os.path.basename(caminho_script) == "analytics":
        pasta_planilhas = os.path.join(os.path.dirname(caminho_script), "historicoresultadosloteriasnacionais")
    else:
        pasta_planilhas = os.path.join(caminho_script, "historicoresultadosloteriasnacionais")
        
    caminho_completo = None

    # Varre a pasta física procurando um arquivo .xlsx que comece com o nome selecionado
    if os.path.exists(pasta_planilhas):
        for arq in os.listdir(pasta_planilhas):
            if arq.lower().replace("_", "").replace("-", "").startswith(loteria.lower()) and arq.endswith('.xlsx'):
                caminho_completo = os.path.join(pasta_planilhas, arq)
                break

    if not caminho_completo or not os.path.exists(caminho_completo):
        return pd.DataFrame(columns=["concurso", "data", "dezenas", "dezenas_lista"])
# ========================================================
# PARTE 3: EXTRATOR POSICIONAL DA MATRIZ DA PLANILHA
# ========================================================
    try:
        # Lê a planilha Excel de forma bruta ignorando os rótulos de texto textuais
        df_excel = pd.read_excel(caminho_completo, header=None)
        
        historico = []
        for i in range(len(df_excel)):
            try:
                # Transforma a linha física em uma lista de valores válidos (pula células vazias)
                valores_linha = [x for x in list(df_excel.iloc[i].values) if pd.notna(x)]
                if len(valores_linha) < 4: 
                    continue
                
                # Coleta e limpa caracteres do Concurso (Sempre o primeiro elemento - Índice 0)
                limpo_concurso = "".join([c for c in str(valores_linha[0]).strip().split('.')[0] if c.isdigit()])
                if not limpo_concurso: 
                    continue
                num_concurso = int(limpo_concurso)
                
                # Coleta e limpa o formato de Data (Segundo elemento - Índice 1)
                val_data = valores_linha[1]
                dt_concurso = val_data.strftime("%Y-%m-%d") if isinstance(val_data, datetime) else str(val_data).strip()
                if not dt_concurso or "concurso" in dt_concurso.lower():
                    continue
                
                # Coleta os números inteiros restantes na linha como as dezenas
                dezenas_lista = []
                for val in valores_linha[2:]:
                    limpo_bola = "".join([c for c in str(val).strip().split('.')[0] if c.isdigit()])
                    if limpo_bola:
                        num_bola = int(limpo_bola)
                        if 1 <= num_bola <= 100: 
                            dezenas_lista.append(num_bola)
                
                if len(dezenas_lista) < 3: 
                    continue
                    
                historico.append({
                    "concurso": num_concurso,
                    "data": dt_concurso,
                    "dezenas": "-".join([str(d).zfill(2) for d in sorted(dezenas_lista)]),
                    "dezenas_lista": sorted(dezenas_lista)
                })
            except Exception: 
                continue
                
        df_resultado = pd.DataFrame(historico)
        if not df_resultado.empty:
            df_resultado = df_resultado.sort_values(by="concurso", ascending=False).head(num_concursos).reset_index(drop=True)
        return df_resultado

    except Exception as e:
        st.error(f"Erro ao ler a planilha Excel da {loteria}: {e}")
        return pd.DataFrame(columns=["concurso", "data", "dezenas", "dezenas_lista"])
# ========================================================
# PARTE 4: ENGENHARIA DE RENDERIZAÇÃO DE GRÁFICOS (PLOTLY)
# ========================================================
def criar_grafico_frequencia(df, loteria, max_num):
    """Gera o gráfico de barras vertical de ocorrências."""
    todas_dezenas = [d for dezenas in df['dezenas_lista'] for d in dezenas]
    contagem = Counter(todas_dezenas)
    
    todos_possiveis = list(range(1, max_num + 1))
    valores = [contagem.get(num, 0) for num in todos_possiveis]
    
    fig = go.Figure(data=[
        go.Bar(
            x=[str(n).zfill(2) for n in todos_possiveis],
            y=valores,
            marker_color='gold'
        )
    ])
    fig.update_layout(
        title=f"Frequência de Números - {loteria}",
        xaxis_title="Número", yaxis_title="Vezes Sorteado",
        plot_bgcolor="#1f2937", paper_bgcolor="#1f2937",
        font=dict(color="#ffffff"), height=400
    )
    return fig

def criar_grafico_timeline(df):
    """Gera o gráfico scatter de linha cronológica."""
    fig = go.Figure()
    df_timeline = df.iloc[::-1]
    fig.add_trace(go.Scatter(
        x=df_timeline['data'], y=df_timeline['concurso'],
        mode='lines+markers', name='Concursos',
        line=dict(color='#00ff88'), marker=dict(size=8)
    ))
    fig.update_layout(
        title="Timeline de Concursos",
        xaxis_title="Data", yaxis_title="Número do Concurso",
        plot_bgcolor="#1f2937", paper_bgcolor="#1f2937",
        font=dict(color="#ffffff"), height=300
    )
    return fig
# ========================================================
# PARTE 5: ELEMENTOS DO TOPO DO PAINEL E MÉTRICAS EM TEMPO REAL
# ========================================================
st.title("🎰 Dashboard de Loterias")
st.subheader("Análise completa com histórico visual")
st.markdown("---")

col1, col2 = st.columns(2)
with col1:
    loteria_selecionada = st.selectbox(
        "Selecione a Loteria", 
        ["MEGASENA", "LOTOFACIL", "QUINA", "LOTOMANIA", "TIMEMANIA", "DIASORTE"], 
        key="sel_loteria_suprema"
    )
with col2:
    num_concursos = st.slider(
        "Quantidade de Concursos", 
        10, 500, 100, 
        key="sld_concursos_supremo"
    )

# Executa a carga posicional
historico_df = gerar_historico_loteria(loteria_selecionada, num_concursos)

if not historico_df.empty:
    todas_dezenas = [d for dezenas in historico_df['dezenas_lista'] for d in dezenas]
    contagem = Counter(todas_dezenas)

    CONFIG_LOCAL_BOLAS = {
        "MEGASENA": {"max_num": 60, "num_dezenas": 6},
        "LOTOFACIL": {"max_num": 25, "num_dezenas": 15},
        "QUINA": {"max_num": 80, "num_dezenas": 5},
        "LOTOMANIA": {"max_num": 100, "num_dezenas": 50},
        "TIMEMANIA": {"max_num": 80, "num_dezenas": 7},
        "DIASORTE": {"max_num": 31, "num_dezenas": 7}
    }
    config_jogo = CONFIG_LOCAL_BOLAS.get(loteria_selecionada, {"max_num": 60, "num_dezenas": 6})
    num_bolas = config_jogo["num_dezenas"]
    max_num = config_jogo["max_num"]
    divisor = max_num / 4

    st.markdown("### 📊 Métricas Gerais")
    c_m1, c_m2, c_m3, c_m4 = st.columns(4)
    with c_m1: 
        st.metric("Total de Concursos Lidos", len(historico_df))
    with c_m2: 
        mf = contagem.most_common(1)[0][0] if contagem else 0
        mf_v = contagem.most_common(1)[0][1] if contagem else 0
        st.metric("Número Mais Frequente", f"{str(mf).zfill(2)} ({mf_v}x)")
    with c_m3: 
        st.metric("Média da Soma", f"{sum([sum(d) for d in historico_df['dezenas_lista']]) / len(historico_df):.0f}")
    with c_m4:
        atrasos_m4 = {}
        for num in range(1, max_num + 1):
            contador = 0
            achou = False
            for _, row in historico_df.iterrows():
                if num in row['dezenas_lista']:
                    atrasos_m4[num] = contador
                    achou = True
                    break
                contador += 1
            if not achou: atrasos_m4[num] = contador
        mais_atrasado = max(atrasos_m4, key=atrasos_m4.get) if atrasos_m4 else 0
        st.metric("Número Mais Atrasado", f"{str(mais_atrasado).zfill(2)} ({atrasos_m4.get(mais_atrasado, 0)} conc.)")
# ========================================================
# PARTE 6: EXIBIÇÃO DE GRÁFICOS E TABELA ANALÍTICA DE CONCURSOS
# ========================================================
    st.markdown("---")
    g1, g2 = st.columns(2)
    with g1: 
        st.plotly_chart(criar_grafico_frequencia(historico_df, loteria_selecionada, max_num), use_container_width=True, key="plotly_freq_grafico")
    with g2: 
        st.plotly_chart(criar_grafico_timeline(historico_df), use_container_width=True, key="plotly_time_grafico")

    st.markdown("---")
    st.subheader(f"📋 Últimos 50 Concursos - {loteria_selecionada}")
    
    # Injeção das colunas matemáticas originais
    historico_df['soma'] = historico_df['dezenas_lista'].apply(sum)
    historico_df['par_impar'] = historico_df['dezenas_lista'].apply(lambda x: f"{sum(1 for d in x if d % 2 == 0)}P/{sum(1 for d in x if d % 2 != 0)}I")
    historico_df['sequencias'] = historico_df['dezenas_lista'].apply(lambda x: len([i for i in range(len(x)-1) if x[i+1] - x[i] == 1]))
    historico_df['repeticoes'] = historico_df['dezenas_lista'].apply(lambda x: len(x) - len(set(x)))
    
    df_display = historico_df[['concurso', 'data', 'dezenas', 'soma', 'par_impar', 'sequencias', 'repeticoes']].copy()
    df_display.columns = ['Concurso', 'Data', 'Dezenas', 'Soma', 'Par/Ímpar', 'Sequências', 'Repetições']
    st.dataframe(df_display.sort_values('Concurso', ascending=False).head(50), use_container_width=True, hide_index=True)
# ========================================================
# PARTE 7: DETECTOR DE FLUXOS, COMPORTAMENTOS E QUADRANTES
# ========================================================
    st.markdown("---")
    st.subheader("🔍 Análise de Padrões")
    p1, p2, p3 = st.columns(3)
    with p1:
        st.markdown("**Números Quentes (Top 5)**")
        for num, freq in contagem.most_common(5): 
            st.write(f"🔥 {str(num).zfill(2)}: {freq} vezes")
    with p2:
        st.markdown("**Números Frios (Bottom 5)**")
        frias = contagem.most_common()[:-6:-1] if len(contagem) >= 5 else contagem.most_common()
        for num, freq in frias: 
            st.write(f"❄️ {str(num).zfill(2)}: {freq} vezes")
    with p3:
        st.markdown("**Quadrantes Mais Ativos**")
        quadrantes = {"NW": 0, "NE": 0, "SW": 0, "SE": 0}
        for dezenas in historico_df['dezenas_lista']:
            for d in dezenas:
                if 1 <= d <= divisor: quadrantes["NW"] += 1
                elif divisor < d <= (divisor * 2): quadrantes["NE"] += 1
                elif (divisor * 2) < d <= (divisor * 3): quadrantes["SW"] += 1
                else: quadrantes["SE"] += 1
        for quad, count in sorted(quadrantes.items(), key=lambda x: x, reverse=True): 
            st.write(f"📍 {quad}: {count} dezenas")

    st.markdown("---")
    st.subheader("📊 Estatísticas Avançadas")
    a1, a2, a3, a4 = st.columns(4)
    with a1: 
        st.metric("Média de Pares", f"{historico_df['par_impar'].apply(lambda x: int(x.split('P')[0])).mean():.1f}")
    with a2: 
        st.metric("Média de Soma", f"{historico_df['soma'].mean():.0f}")
    with a3: 
        st.metric("Desvio Padrão Soma", f"{historico_df['soma'].std():.1f}" if len(historico_df) > 1 else "0.0")
    with a4: 
        st.metric("Média Sequências", f"{historico_df['sequencias'].mean():.1f}")
# ========================================================
# PARTE 8: MONITORAÇÃO DE INTERVALOS E FILAS DE ATRASOS
# ========================================================
    st.markdown("---")
    st.subheader("⏰ Análise de Atrasos Detalhada")
    atrasos_detalhados = []
    for num in range(1, max_num + 1):
        contador = 0
        achou = False
        for _, row in historico_df.iterrows():
            if num in row['dezenas_lista']:
                atrasos_detalhados.append({'Número': str(num).zfill(2), 'Atraso': contador, 'Último Sorteio': row['data']})
                achou = True
                break
            contador += 1
        if not achou: 
            atrasos_detalhados.append({'Número': str(num).zfill(2), 'Atraso': contador, 'Último Sorteio': 'Nunca'})
            
    df_atrasos = pd.DataFrame(atrasos_detalhados).sort_values('Atraso', ascending=False)
    col_t1, col_t2 = st.columns(2)
    with col_t1: 
        st.markdown("**Top 10 Números Mais Atrasados**")
        st.dataframe(df_atrasos.head(10), use_container_width=True, hide_index=True)
    with col_t2: 
        st.markdown("**Top 10 Números Menos Atrasados**")
        st.dataframe(df_atrasos.tail(10), use_container_width=True, hide_index=True)
# ========================================================
# PARTE 9: CENTRAL DE ENGENHARIA COMBINATÓRIA MULTINÍVEL DETALHADA
# ========================================================
    st.markdown("---")
    st.subheader("🚀 Seleção de Engenharia Preditiva Avançada")
    nivel_analise = st.select_slider(
        "Arraste a bolinha vermelha para selecionar o nível analítico desejado:",
        options=["INTERESTELAR RADIAL", "QUANTUM MAX", "FRONTEIRA SUPREMA RECH"],
        value="INTERESTELAR RADIAL",
        key="slider_niveis_unificado"
    )

    dezenas_por_quadrante = {"NW": [], "NE": [], "SW": [], "SE": []}
    for n in range(1, max_num + 1):
        if 1 <= n <= divisor: dezenas_por_quadrante["NW"].append(n)
        elif divisor < n <= (divisor * 2): dezenas_por_quadrante["NE"].append(n)
        elif (divisor * 2) < n <= (divisor * 3): dezenas_por_quadrante["SW"].append(n)
        else: dezenas_por_quadrante["SE"].append(n)

    ultimo_concurso_dezenas = historico_df.loc[0, 'dezenas_lista']
    ultimo_concurso_num = historico_df.loc[0, 'concurso']
    contagem_ultimo_quadrante = {"NW": 0, "NE": 0, "SW": 0, "SE": 0}
    for d in ultimo_concurso_dezenas:
        if 1 <= d <= divisor: contagem_ultimo_quadrante["NW"] += 1
        elif divisor < d <= (divisor * 2): contagem_ultimo_quadrante["NE"] += 1
        elif (divisor * 2) < d <= (divisor * 3): contagem_ultimo_quadrante["SW"] += 1
        else: contagem_ultimo_quadrante["SE"] += 1
    quadrantes_ordenados = sorted(contagem_ultimo_quadrante.items(), key=lambda x: x[1], reverse=True)
    quadrante_mais_quente = quadrantes_ordenados[0][0]
    quadrante_mais_frio = quadrantes_ordenados[-1][0]

    # 🌟 CORREÇÃO DEFINITIVA DO ESCORAGEM: Inicialização explícita do dicionário antes do loop
    scores = {}
    valores_frequencia = list(contagem.values()) if contagem else [1]
    max_freq, min_freq = max(valores_frequencia), min(valores_frequencia)
    range_freq = (max_freq - min_freq) if (max_freq - min_freq) > 0 else 1
    max_atraso_val = max([x['Atraso'] for x in atrasos_detalhados]) if atrasos_detalhados else 1
    range_atraso = max_atraso_val if max_atraso_val > 0 else 1
    
    for num in range(1, max_num + 1):
        num_str = str(num).zfill(2)
        score_freq = (contagem.get(num, 0) - min_freq) / range_freq
        atraso_atual = next((x['Atraso'] for x in atrasos_detalhados if x['Número'] == num_str), 0)
        scores[num] = (score_freq * 0.50) + ((atraso_atual / range_atraso) * 0.50)

    def calcular_aderencia_tri_nivel(palpite_lista, df_historico, tipo_estrategia):
        score_medio = sum([scores.get(n, 0.70) for n in palpite_lista]) / len(palpite_lista)
        concursos_cobertos = sum([1 for _, r in df_historico.iterrows() if len(set(palpite_lista).intersection(r['dezenas_lista'])) >= 1])
        fator_cobertura = concursos_cobertos / len(df_historico) if len(df_historico) > 0 else 0.7
        if nivel_analise == "INTERESTELAR RADIAL":
            base_fixa, fator_mult, piso, teto = 40, 40, 85.12, 102.45
            bonus = random.uniform(11.2, 14.5) if tipo_estrategia == "radial" else random.uniform(6.8, 9.4) if tipo_estrategia == "quente" else random.uniform(2.5, 5.1)
        elif nivel_analise == "QUANTUM MAX":
            base_fixa, fator_mult, piso, teto = 45, 38, 92.35, 105.00
            bonus = random.uniform(18.4, 21.2) if tipo_estrategia == "radial" else random.uniform(13.1, 15.8) if tipo_estrategia == "quente" else random.uniform(8.5, 11.2)
        else:
            base_fixa, fator_mult, piso, teto = 52, 42, 105.15, 118.00
            bonus = random.uniform(21.4, 23.8) if tipo_estrategia == "radial" else random.uniform(18.2, 20.5) if tipo_estrategia == "quente" else random.uniform(14.3, 16.7)
        prob_final = (score_medio * fator_mult) + (fator_cobertura * 15) + base_fixa + bonus
        return min(max(prob_final, piso), teto)

# ========================================================
# PARTE 10: PROCESSAMENTO E APRESENTAÇÃO SUPREMA DA CENTRAL
# ========================================================
    metade_bolas = max(1, num_bolas // 2)
    
    # Validação e amostragem de segurança para evitar quebras de amostragem
    c_quentes = sorted(dezenas_por_quadrante[quadrante_mais_quente], key=lambda x: scores.get(x, 0), reverse=True)
    o_quadrantes = [n for k, v in dezenas_por_quadrante.items() if k != quadrante_mais_quente for n in v]
    c_aux_quentes = sorted(o_quadrantes, key=lambda x: scores.get(x, 0), reverse=True)
    pool_q = c_quentes[:metade_bolas * 2] + c_aux_quentes[:(num_bolas - metade_bolas) * 2]
    palpite_quente = sorted(random.sample(pool_q if len(pool_q) >= num_bolas else list(range(1, max_num+1)), num_bolas))
    prob_quente = calcular_aderencia_tri_nivel(palpite_quente, historico_df, "quente")

    c_frios = sorted(dezenas_por_quadrante[quadrante_mais_frio], key=lambda x: scores.get(x, 0), reverse=True)
    o_frios = [n for k, v in dezenas_por_quadrante.items() if k != quadrante_mais_frio for n in v]
    c_aux_frios = sorted(o_frios, key=lambda x: scores.get(x, 0), reverse=True)
    pool_f = c_frios[:metade_bolas * 2] + c_aux_frios[:(num_bolas - metade_bolas) * 2]
    palpite_frio = sorted(random.sample(pool_f if len(pool_f) >= num_bolas else list(range(1, max_num+1)), num_bolas))
    prob_frio = calcular_aderencia_tri_nivel(palpite_frio, historico_df, "frio")

    pool_radial = []
    for quad in ["NW", "NE", "SW", "SE"]: 
        pool_radial.extend(sorted(dezenas_por_quadrante[quad], key=lambda x: (scores.get(x, 0) + (0.25 if x % 2 == 0 else 0.10)), reverse=True)[:max(2, (num_bolas // 3))])
    if len(pool_radial) < num_bolas: 
        pool_radial = sorted(list(range(1, max_num + 1)), key=lambda x: scores.get(x, 0), reverse=True)[:num_bolas * 2]
    palpite_radial = sorted(random.sample(pool_radial, num_bolas))
    prob_radial = calcular_aderencia_tri_nivel(palpite_radial, historico_df, "radial")

    # Apresentação Visual Customizada Tradepulse
    st.markdown(f"### 🔮 Resultados Gerados no Modo: **{nivel_analise}**")
    r1, r2, r3 = st.columns(3)
    l_metrica = "Indicador RECH Máximo" if nivel_analise == "FRONTEIRA SUPREMA RECH" else "Aderência Preditiva Max" if nivel_analise == "QUANTUM MAX" else "Aderência Expandida"

    with r1:
        st.markdown(f"#### 🔥 1. Fluxo de Tendência\n*Foco no Quadrante **{quadrante_mais_quente}***")
        st.success(f"🔮 **{'-'.join([str(d).zfill(2) for d in palpite_quente])}**")
        st.metric(l_metrica, f"{prob_quente:.2f}%")
    with r2:
        st.markdown(f"#### 🔄 2. Contratendência Vetorial\n*Foco no Quadrante **{quadrante_mais_frio}***")
        st.info(f"🔮 **{'-'.join([str(d).zfill(2) for d in palpite_frio])}**")
        st.metric(l_metrica, f"{prob_frio:.2f}%")
    with r3:
        st.markdown("#### 🌌 3. Modulação Harmônica\n*Dispersão e Simetria Espacial Completa*")
        st.warning(f"🔮 **{'-'.join([str(d).zfill(2) for d in palpite_radial])}**")
        st.metric(l_metrica, f"{prob_radial:.2f}%")

    st.markdown("---")
    with st.expander("📊 Inspecionar Vetores Algorítmicos Ativos"):
        st.write(f"Último Concurso Analisado: Nº **{ultimo_concurso_num}** | Dezenas Encontradas: `{ultimo_concurso_dezenas}`")
        st.write(f"🧬 Vetor NW: {contagem_ultimo_quadrante['NW']} | Vetor NE: {contagem_ultimo_quadrante['NE']} | Vetor SW: {contagem_ultimo_quadrante['SW']} | Vetor SE: {contagem_ultimo_quadrante['SE']}")

    st.markdown("<div style='text-align: center; color: #6b7280; font-size: 11px; margin-top: 25px;'><p>⚠️ Este ecossistema computacional processa correlações probabilísticas multidimensionais. Jogos lotéricos operam sob regimes de aleatoriedade pura. Modelos matemáticos servem estritamente para simulações e entretenimento analítico.</p></div>", unsafe_allow_html=True)
else:
    st.info("Por favor, adicione as planilhas Excel (.xlsx) válidas com os nomes correspondentes dentro da pasta './historicoresultadosloteriasnacionais'.")
