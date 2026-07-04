# ========================================================
# CALCULADORA DE GESTÃO DE RISCO
# ========================================================
# Ferramenta profissional para cálculo de position sizing
# e gerenciamento de risco em trading
# ========================================================

import streamlit as st
import pandas as pd

def calcular_position_size(capital, risco_percentual, stop_loss_pontos, valor_ponto):
    """
    Calcula o tamanho da posição baseado no risco.
    
    Args:
        capital: Capital total disponível
        risco_percentual: Porcentagem de risco por trade (ex: 1.5)
        stop_loss_pontos: Distância do stop loss em pontos
        valor_ponto: Valor monetário de cada ponto
    
    Returns:
        Tamanho da posição (lotes/contratos)
    """
    risco_dinheiro = capital * (risco_percentual / 100)
    risco_por_ponto = risco_dinheiro / stop_loss_pontos
    position_size = risco_por_ponto / valor_ponto
    
    return position_size

def calcular_r_recompensa_risco(entrada, stop_loss, take_profit):
    """
    Calcula a relação risco/recompensa.
    
    Args:
        entrada: Preço de entrada
        stop_loss: Preço do stop loss
        take_profit: Preço do take profit
    
    Returns:
        Relação R/R
    """
    risco = abs(entrada - stop_loss)
    recompensa = abs(take_profit - entrada)
    
    if risco == 0:
        return 0
    
    return recompensa / risco

def calcular_drawdown_maximo(historico_capital):
    """
    Calcula o drawdown máximo do histórico.
    
    Args:
        historico_capital: Lista ou array com histórico de capital
    
    Returns:
        Drawdown máximo em porcentagem
    """
    capital_series = pd.Series(historico_capital)
    rolling_max = capital_series.cummax()
    drawdown = (capital_series - rolling_max) / rolling_max * 100
    
    return drawdown.min()

def calcular_kelly_criterion(win_rate, media_ganho, media_perda):
    """
    Calcula o critério de Kelly para tamanho ótimo de aposta.
    
    Args:
        win_rate: Taxa de acerto (ex: 0.60 para 60%)
        media_ganho: Média de ganhos em porcentagem
        media_perda: Média de perdas em porcentagem (valor positivo)
    
    Returns:
        Porcentagem ótima do capital para apostar
    """
    if media_perda == 0:
        return 0
    
    kelly = (win_rate * media_ganho - (1 - win_rate) * media_perda) / media_ganho
    return max(0, kelly)  # Kelly negativo não faz sentido

def interface_calculadora_risco():
    """Interface Streamlit para calculadora de risco."""
    st.title("🎯 Calculadora de Gestão de Risco")
    st.markdown("---")
    
    # Abas
    tab1, tab2, tab3, tab4 = st.tabs([
        "Position Sizing", 
        "Risco/Recompensa", 
        "Drawdown", 
        "Kelly Criterion"
    ])
    
    # Tab 1: Position Sizing
    with tab1:
        st.subheader("📊 Calculadora de Position Size")
        
        col1, col2 = st.columns(2)
        
        with col1:
            capital = st.number_input("Capital Total ($)", value=10000.0, min_value=0.0)
            risco_percentual = st.number_input("Risco por Trade (%)", value=1.5, min_value=0.1, max_value=10.0)
        
        with col2:
            stop_loss_pontos = st.number_input("Stop Loss (pontos)", value=50, min_value=1)
            valor_ponto = st.number_input("Valor por Ponto ($)", value=1.0, min_value=0.01)
        
        if st.button("Calcular Position Size"):
            position_size = calcular_position_size(capital, risco_percentual, stop_loss_pontos, valor_ponto)
            risco_dinheiro = capital * (risco_percentual / 100)
            
            st.success(f"🎯 Tamanho da Posição: {position_size:.2f} lotes/contratos")
            st.info(f"💰 Risco em Dinheiro: ${risco_dinheiro:.2f}")
            st.warning(f"⚠️ Stop Loss em Dinheiro: ${risco_dinheiro:.2f}")
    
    # Tab 2: Risco/Recompensa
    with tab2:
        st.subheader("⚖️ Calculadora de Risco/Recompensa")
        
        col1, col2 = st.columns(2)
        
        with col1:
            entrada = st.number_input("Preço de Entrada", value=1.0850)
            stop_loss = st.number_input("Stop Loss", value=1.0800)
        
        with col2:
            take_profit = st.number_input("Take Profit", value=1.0950)
        
        if st.button("Calcular R/R"):
            rr = calcular_r_recompensa_risco(entrada, stop_loss, take_profit)
            risco_pontos = abs(entrada - stop_loss)
            recompensa_pontos = abs(take_profit - entrada)
            
            st.metric("Relação Risco/Recompensa", f"1:{rr:.2f}")
            
            if rr >= 2:
                st.success("✅ Excelente relação R/R (≥ 1:2)")
            elif rr >= 1.5:
                st.info("⚠️ Boa relação R/R (≥ 1:1.5)")
            else:
                st.error("❌ Relação R/R baixa (< 1:1.5)")
            
            st.info(f"Risco: {risco_pontos:.4f} pontos")
            st.info(f"Recompensa: {recompensa_pontos:.4f} pontos")
    
    # Tab 3: Drawdown
    with tab3:
        st.subheader("📉 Calculadora de Drawdown")
        
        # Input de histórico
        historico_input = st.text_area(
            "Cole seu histórico de capital (um valor por linha)",
            value="100150\n100300\n100100\n99800\n99500\n100200\n100500\n100800"
        )
        
        if st.button("Calcular Drawdown"):
            try:
                historico = [float(x.strip()) for x in historico_input.split('\n') if x.strip()]
                dd_max = calcular_drawdown_maximo(historico)
                
                st.metric("Drawdown Máximo", f"{dd_max:.2f}%")
                
                if dd_max > -20:
                    st.error("⚠️ Drawdown muito alto! Considere reduzir tamanho das posições.")
                elif dd_max > -10:
                    st.warning("⚠️ Drawdown moderado. Monitore cuidadosamente.")
                else:
                    st.success("✅ Drawdown dentro de limites aceitáveis.")
                
                # Gráfico
                import plotly.graph_objects as go
                fig = go.Figure()
                fig.add_trace(go.Scatter(
                    y=historico,
                    mode='lines',
                    name='Capital',
                    line=dict(color='#00ff88')
                ))
                fig.update_layout(
                    title="Histórico de Capital",
                    yaxis_title="Capital ($)",
                    plot_bgcolor="#1f2937",
                    paper_bgcolor="#1f2937",
                    font=dict(color="#ffffff")
                )
                st.plotly_chart(fig, use_container_width=True)
                
            except Exception as e:
                st.error(f"Erro ao processar dados: {e}")
    
    # Tab 4: Kelly Criterion
    with tab4:
        st.subheader("🎲 Kelly Criterion")
        
        col1, col2 = st.columns(2)
        
        with col1:
            win_rate = st.number_input("Taxa de Acerto (%)", value=60.0, min_value=0.0, max_value=100.0)
            media_ganho = st.number_input("Média de Ganho (%)", value=2.0, min_value=0.0)
        
        with col2:
            media_perda = st.number_input("Média de Perda (%)", value=1.0, min_value=0.0)
        
        if st.button("Calcular Kelly"):
            win_rate_decimal = win_rate / 100
            kelly = calcular_kelly_criterion(win_rate_decimal, media_ganho, media_perda)
            
            st.metric("Kelly Criterion", f"{kelly:.2f}% do capital")
            
            # Recomendação
            kelly_seguro = kelly * 0.5  # Half-Kelly é mais seguro
            
            st.info(f"🎯 Kelly Seguro (Half-Kelly): {kelly_seguro:.2f}% do capital")
            
            if kelly > 10:
                st.warning("⚠️ Kelly muito alto. Considere usar Half-Kelly.")
            elif kelly < 0:
                st.error("❌ Sistema negativo. Não opere.")
            else:
                st.success("✅ Sistema positivo. Pode operar.")

if __name__ == "__main__":
    interface_calculadora_risco()
