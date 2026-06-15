// ========================================================
// SMC ADVANCED ENGINE v2.0 - FVG, OB, LIQUIDEZ E CHoCH
// ========================================================
const ATIVO_SMC = 'PAXGUSDT'; // Ouro pareado em dólar na Binance
const TIMEFRAME_SMC = '15m';
let historicoVelasSMC = [];
let objetosDesenhadosSMC = [];
let graficoSMC = null;
let serieVelasSMC = null;

// ========================================================
// INICIALIZAÇÃO DO GRÁFICO SMC AVANÇADO
// ========================================================
async function iniciarSMCAdvanced() {
    const containerGrafico = document.getElementById('smc-advanced-container');
    
    if (!containerGrafico) {
        console.error('Container SMC Advanced não encontrado');
        return;
    }

    if (typeof LightweightCharts === 'undefined') {
        console.error('LightweightCharts não está carregado');
        return;
    }

    // Criar gráfico
    graficoSMC = LightweightCharts.createChart(containerGrafico, {
        layout: { 
            background: { type: 'solid', color: '#0c0d14' }, 
            textColor: '#8b92b6', 
            fontSize: 11 
        },
        grid: { 
            vertLines: { color: 'rgba(42, 46, 57, 0.08)' }, 
            horzLines: { color: 'rgba(42, 46, 57, 0.08)' } 
        },
        crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
        timeScale: { 
            borderColor: 'rgba(255,255,255,0.05)', 
            timeVisible: true,
            secondsVisible: false
        },
        width: containerGrafico.clientWidth,
        height: 500
    });

    // Série Principal de Candlesticks
    serieVelasSMC = graficoSMC.addCandlestickSeries({
        upColor: '#00ff88', 
        downColor: '#ff3355', 
        borderVisible: false, 
        wickUpColor: '#00ff88', 
        wickDownColor: '#ff3355'
    });

    // Ajuste automático de tamanho de tela
    window.addEventListener('resize', () => {
        graficoSMC.resize(containerGrafico.clientWidth, 500);
    });

    // Carregar dados
    await carregarHistoricoSMC();
    conectarWebSocketSMC();
}

// ========================================================
// MOTOR MATEMÁTICO: DETECÇÃO DE SMC AVANÇADO
// ========================================================
function processarIndicadoresSMC(velas) {
    if (!graficoSMC || velas.length < 10) return;

    // 1. Limpa desenhos anteriores para não dar lag no gráfico
    objetosDesenhadosSMC.forEach(obj => {
        try {
            graficoSMC.removeSeries(obj);
        } catch(e) {}
    });
    objetosDesenhadosSMC = [];

    // --- 1. FAIR VALUE GAPS (FVG) ---
    for (let i = 2; i < velas.length; i++) {
        const v1 = velas[i - 2]; 
        const v2 = velas[i - 1]; 
        const v3 = velas[i];
        
        if (v3.low > v1.high && v2.close > v2.open) { // Bullish FVG
            const fvgBox = graficoSMC.addAreaSeries({ 
                topColor: 'rgba(0, 255, 136, 0.12)', 
                bottomColor: 'rgba(0, 0, 0, 0)', 
                lineColor: '#00ff88', 
                lineWidth: 1, 
                lineStyle: LightweightCharts.LineStyle.Dashed 
            });
            const timestampSegundos = Math.floor(v2.time / 1000);
            fvgBox.setData([
                { time: timestampSegundos, value: v3.low }, 
                { time: timestampSegundos + (15 * 60 * 4), value: v1.high }
            ]);
            objetosDesenhadosSMC.push(fvgBox);
        }
        
        if (v3.high < v1.low && v2.close < v2.open) { // Bearish FVG
            const fvgBox = graficoSMC.addAreaSeries({ 
                topColor: 'rgba(255, 51, 85, 0.12)', 
                bottomColor: 'rgba(0, 0, 0, 0)', 
                lineColor: '#ff3355', 
                lineWidth: 1, 
                lineStyle: LightweightCharts.LineStyle.Dashed 
            });
            const timestampSegundos = Math.floor(v2.time / 1000);
            fvgBox.setData([
                { time: timestampSegundos, value: v1.low }, 
                { time: timestampSegundos + (15 * 60 * 4), value: v3.high }
            ]);
            objetosDesenhadosSMC.push(fvgBox);
        }
    }

    // --- 2. ORDER BLOCKS (OB) & CHoCH (Change of Character) ---
    let ultimoTopo = velas[0].high;
    let ultimaMinima = velas[0].low;
    let tendenciaAtual = 'ALTA';

    for (let i = 4; i < velas.length; i++) {
        const v = velas[i];
        const vAnterior = velas[i - 1];

        // Atualiza topos e mínimas locais
        if (v.high > ultimoTopo) ultimoTopo = v.high;
        if (v.low < ultimaMinima) ultimaMinima = v.low;

        // Identificação de Quebra de Tendência Emocional (CHoCH)
        if (tendenciaAtual === 'ALTA' && v.close < vAnterior.low && v.close < ultimaMinima) {
            tendenciaAtual = 'BAIXA';
            marcarLinhaEstruturaSMC(v.time, v.low, 'CHoCH 📉', '#ffaa00');
        } else if (tendenciaAtual === 'BAIXA' && v.close > vAnterior.high && v.close > ultimoTopo) {
            tendenciaAtual = 'ALTA';
            marcarLinhaEstruturaSMC(v.time, v.high, 'CHoCH 📈', '#00bfff');
        }

        // Desenhar caixas de Order Blocks Institucionais ativos
        if (v.close > v.open && (v.close - v.open) > (vAnterior.high - vAnterior.low) * 1.6) {
            const obSuporte = graficoSMC.addLineSeries({ 
                color: 'rgba(0, 191, 255, 0.6)', 
                lineWidth: 2, 
                lineStyle: LightweightCharts.LineStyle.Solid,
                title: 'OB Bullish' 
            });
            const timestampSegundos = Math.floor(velas[i-1].time / 1000);
            const timestampFim = Math.floor(v.time / 1000) + (15 * 60 * 8);
            obSuporte.setData([
                { time: timestampSegundos, value: velas[i-1].low }, 
                { time: timestampFim, value: velas[i-1].low }
            ]);
            objetosDesenhadosSMC.push(obSuporte);
        }
    }

    // --- 3. ZONAS DE LIQUIDEZ RESTRITA (LIQ / EQUAL HIGHS-LOWS) ---
    for (let i = 3; i < velas.length - 3; i++) {
        // Encontra piscinas de liquidez onde o varejo coloca stop loss parecidos
        if (Math.abs(velas[i].high - velas[i-1].high) < 0.15) {
            marcarLinhaEstruturaSMC(velas[i].time, velas[i].high, 'LIQ 💵', 'rgba(255, 255, 255, 0.4)', LightweightCharts.LineStyle.Dotted);
        }
    }
}

// Auxiliar para esticar textos e marcações horizontais na tela
function marcarLinhaEstruturaSMC(tempo, preco, texto, cor, estilo = LightweightCharts.LineStyle.Solid) {
    const linha = graficoSMC.addLineSeries({ 
        color: cor, 
        lineWidth: 1, 
        lineStyle: estilo, 
        title: texto 
    });
    const timestampSegundos = Math.floor(tempo / 1000);
    linha.setData([
        { time: timestampSegundos, value: preco }, 
        { time: timestampSegundos + (15 * 60 * 6), value: preco }
    ]);
    objetosDesenhadosSMC.push(linha);
}

// ========================================================
// REQUISIÇÕES DE MERCADO INTEGRADAS (BINANCE GRATUITA)
// ========================================================
async function carregarHistoricoSMC() {
    const url = `https://api.binance.com/api/v3/klines?symbol=${ATIVO_SMC}&interval=${TIMEFRAME_SMC}&limit=180`;
    try {
        const response = await fetch(url);
        const dados = await response.json();
        
        historicoVelasSMC = dados.map(v => ({
            time: v[0],
            open: parseFloat(v[1]), 
            high: parseFloat(v[2]), 
            low: parseFloat(v[3]), 
            close: parseFloat(v[4])
        }));

        // Converter para formato do Lightweight Charts
        const chartData = historicoVelasSMC.map(v => ({
            time: Math.floor(v.time / 1000),
            open: v.open,
            high: v.high,
            low: v.low,
            close: v.close
        }));

        serieVelasSMC.setData(chartData);
        processarIndicadoresSMC(historicoVelasSMC);
        graficoSMC.timeScale().fitContent();
        
        // Atualizar preço no placar
        const ultimaVela = historicoVelasSMC[historicoVelasSMC.length - 1];
        const priceIndicator = document.getElementById('smc-live-price');
        if (priceIndicator && ultimaVela) {
            priceIndicator.innerText = `$${ultimaVela.close.toFixed(2)}`;
        }
    } catch (e) {
        console.error("Falha ao alimentar motor SMC:", e);
    }
}

function conectarWebSocketSMC() {
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${ATIVO_SMC.toLowerCase()}@kline_${TIMEFRAME_SMC}`);

    ws.onmessage = (event) => {
        const dados = JSON.parse(event.data);
        const kline = dados.k;

        const velaLive = {
            time: kline.t,
            open: parseFloat(kline.o), 
            high: parseFloat(kline.h), 
            low: parseFloat(kline.l), 
            close: parseFloat(kline.c)
        };

        // Atualiza preço no placar flutuante
        const priceIndicator = document.getElementById('smc-live-price');
        if (priceIndicator) {
            priceIndicator.innerText = `$${velaLive.close.toFixed(2)}`;
        }

        if (historicoVelasSMC.length > 0 && historicoVelasSMC[historicoVelasSMC.length - 1].time === velaLive.time) {
            historicoVelasSMC[historicoVelasSMC.length - 1] = velaLive;
        } else {
            historicoVelasSMC.push(velaLive);
            if (historicoVelasSMC.length > 250) historicoVelasSMC.shift();
        }

        // Aplica atualizações em tempo real na tela do usuário
        const chartUpdate = {
            time: Math.floor(velaLive.time / 1000),
            open: velaLive.open,
            high: velaLive.high,
            low: velaLive.low,
            close: velaLive.close
        };
        serieVelasSMC.update(chartUpdate);
        processarIndicadoresSMC(historicoVelasSMC);
    };

    ws.onclose = () => {
        setTimeout(conectarWebSocketSMC, 5000);
    };
}

// Disparo automático na inicialização da página
window.addEventListener('DOMContentLoaded', iniciarSMCAdvanced);
