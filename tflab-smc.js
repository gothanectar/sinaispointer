// ==========================================
// CONFIGURAÇÕES GERAIS DO ATIVO (TF LAB MULTI-TIMEFRAME)
// ==========================================
const SYMBOL = 'PAXGUSDT'; // Ouro tokenizado na Binance
let current_timeframe = '15m'; // Timeframe padrão inicial

let candlestickHistory = [];
let detectedFVGs = [];
let detectedOBs = [];
let activeWebSocket = null; // Guarda a conexão para poder fechar ao trocar de TF
let chart = null;
let candlestickSeries = null;
let elementosGraficosAtivos = []; // Guarda as referências das caixas desenhadas

// Mapeamento dos botões para o padrão aceito pela API da Binance
const TIMEFRAME_MAP = {
    '5': '5m',
    '15': '15m',
    '30': '30m',
    '1h': '1h',
    '4h': '4h',
    '1d': '1d'
};

// ==========================================
// 1. ALGORITMO DE SMART MONEY (SMC)
// ==========================================
function calcularSmartMoney(velas) {
    if (velas.length < 3) return;

    let fvgs = [];
    let obs = [];

    // --- CÁLCULO DE FAIR VALUE GAPS (FVG) ---
    for (let i = 2; i < velas.length; i++) {
        const v1 = velas[i - 2];
        const v2 = velas[i - 1];
        const v3 = velas[i];

        if (v3.low > v1.high && v2.close > v2.open) {
            fvgs.push({
                tipo: 'BULLISH',
                topo: v3.low,
                fundo: v1.high,
                timestamp: v2.timestamp
            });
        }
        
        if (v3.high < v1.low && v2.close < v2.open) {
            fvgs.push({
                tipo: 'BEARISH',
                topo: v1.low,
                fundo: v3.high,
                timestamp: v2.timestamp
            });
        }
    }

    // --- CÁLCULO DE ORDER BLOCKS (OB) ---
    for (let i = 4; i < velas.length; i++) {
        const vAnterior = velas[i - 1];
        const vForte = velas[i];

        if (vForte.close > vForte.open && (vForte.close - vForte.open) > (vAnterior.high - vAnterior.low) * 1.5) {
            for (let j = i - 1; j >= i - 3; j--) {
                if (velas[j] && velas[j].close < velas[j].open) {
                    obs.push({
                        tipo: 'BULLISH OB (SUPORTE)',
                        topo: velas[j].high,
                        fundo: velas[j].low
                    });
                    break;
                }
            }
        }

        if (vForte.close < vForte.open && (vForte.open - vForte.close) > (vAnterior.high - vAnterior.low) * 1.5) {
            for (let j = i - 1; j >= i - 3; j--) {
                if (velas[j] && velas[j].close > velas[j].open) {
                    obs.push({
                        tipo: 'BEARISH OB (RESISTÊNCIA)',
                        topo: velas[j].high,
                        fundo: velas[j].low
                    });
                    break;
                }
            }
        }
    }

    detectedFVGs = fvgs.slice(-4).reverse();
    detectedOBs = obs.slice(-4).reverse();

    atualizarPainelTFLab();
    atualizarGrafico();
    desenharZonasNoGrafico();
}

// ==========================================
// 3. DESENHAR ZONAS NO GRÁFICO (FVG E OB)
// ==========================================
function desenharZonasNoGrafico() {
    if (!chart) return;

    // Limpa os desenhos antigos do gráfico para não encavalar
    elementosGraficosAtivos.forEach(elemento => {
        try {
            chart.removeSeries(elemento);
        } catch(e) {}
    });
    elementosGraficosAtivos = [];

    // --- DESENHAR FAIR VALUE GAPS (CAIXAS TRANSLÚCIDAS) ---
    detectedFVGs.forEach(fvg => {
        const serieFVG = chart.addAreaSeries({
            topColor: fvg.tipo === 'BULLISH' ? 'rgba(0, 255, 136, 0.2)' : 'rgba(255, 51, 85, 0.2)',
            bottomColor: 'rgba(0, 0, 0, 0)',
            lineColor: fvg.tipo === 'BULLISH' ? '#00ff88' : '#ff3355',
            lineWidth: 1,
            lineStyle: LightweightCharts.LineStyle.Dashed,
        });

        // Define as coordenadas de preço (Teto e Chão) do Gap
        const timestampSegundos = Math.floor(fvg.timestamp / 1000);
        const dadosDesenho = [
            { time: timestampSegundos, value: fvg.topo },
            { time: timestampSegundos + (15 * 60 * 4), value: fvg.fundo } // Estende o bloco 4 velas para a frente
        ];

        try {
            serieFVG.setData(dadosDesenho);
            elementosGraficosAtivos.push(serieFVG);
        } catch (e) {
            // Ignora se o timestamp ainda não estiver renderizado no gráfico principal
        }
    });

    // --- DESENHAR ORDER BLOCKS (LINHAS SÓLIDAS DE SUPORTE/RESISTÊNCIA) ---
    detectedOBs.forEach(ob => {
        const corOB = ob.tipo.includes('BULLISH') ? '#00bfff' : '#ffaa00';

        // Cria a linha superior do bloco de ordens
        const linhaTopoOB = chart.addLineSeries({
            color: corOB,
            lineWidth: 2,
            lineStyle: LightweightCharts.LineStyle.Solid,
        });

        // Cria a linha inferior do bloco de ordens
        const linhaFundoOB = chart.addLineSeries({
            color: corOB,
            lineWidth: 1,
            lineStyle: LightweightCharts.LineStyle.Dotted,
        });

        // Define onde a linha começa no tempo
        const timestampSegundos = Math.floor(ob.timestamp / 1000);
        const dadosTopo = [
            { time: timestampSegundos, value: ob.topo },
            { time: timestampSegundos + (15 * 60 * 10), value: ob.topo } // Estende por 10 velas para frente
        ];
        
        const dadosFundo = [
            { time: timestampSegundos, value: ob.fundo },
            { time: timestampSegundos + (15 * 60 * 10), value: ob.fundo }
        ];

        try {
            linhaTopoOB.setData(dadosTopo);
            linhaFundoOB.setData(dadosFundo);
            elementosGraficosAtivos.push(linhaTopoOB, linhaFundoOB);
        } catch (e) {
            // Ignora se o timestamp ainda não estiver renderizado
        }
    });
}

// ==========================================
// 2. RENDERIZAÇÃO DA INTERFACE COM SELETOR DINÂMICO
// ==========================================
function atualizarPainelTFLab() {
    const boxTFLab = document.querySelector('#tflab-smc-xauusd') || document.body; 
    let painelSMC = document.getElementById('smc-analytics-panel');
    
    if (!painelSMC) {
        painelSMC = document.createElement('div');
        painelSMC.id = 'smc-analytics-panel';
        painelSMC.style.marginTop = '15px';
        painelSMC.style.padding = '14px';
        painelSMC.style.borderRadius = '8px';
        painelSMC.style.background = 'rgba(20, 20, 30, 0.75)';
        painelSMC.style.border = '1px solid rgba(255, 255, 255, 0.1)';
        painelSMC.style.fontFamily = 'sans-serif';
        boxTFLab.appendChild(painelSMC);
    }

    // Cria a barra de botões seletores caso ela ainda não exista
    let seletorHTML = `
        <div style="display: flex; gap: 5px; margin-bottom: 12px; background: rgba(0,0,0,0.2); padding: 4px; border-radius: 6px;">
            ${Object.keys(TIMEFRAME_MAP).map(tf => {
                const isActive = TIMEFRAME_MAP[tf] === current_timeframe;
                return `
                    <button onclick="mudarTimeframeTFLab('${TIMEFRAME_MAP[tf]}')" style="
                        flex: 1; 
                        background: ${isActive ? '#00ff88' : 'transparent'}; 
                        color: ${isActive ? '#000' : '#888'}; 
                        border: none; 
                        padding: 4px 0; 
                        border-radius: 4px; 
                        font-weight: bold; 
                        font-size: 11px; 
                        cursor: pointer;
                        transition: all 0.2s;
                    ">${tf}</button>
                `;
            }).join('')}
        </div>
    `;

    let htmlFVG = detectedFVGs.map(f => `
        <div style="display:flex; justify-content:space-between; margin-bottom: 6px; font-size:12px; border-left: 3px solid ${f.tipo === 'BULLISH' ? '#00ff88' : '#ff3355'}; padding-left: 8px;">
            <span style="color:${f.tipo === 'BULLISH' ? '#00ff88' : '#ff3355'}; font-weight:bold;">FVG ${f.tipo}</span>
            <span style="color:#bbb;">$${f.fundo.toFixed(2)} - $${f.topo.toFixed(2)}</span>
        </div>
    `).join('') || '<p style="color:#666; font-size:12px; margin:5px 0;">Nenhum FVG no timeframe atual</p>';

    let htmlOB = detectedOBs.map(o => `
        <div style="display:flex; justify-content:space-between; margin-bottom: 6px; font-size:12px; border-left: 3px solid ${o.tipo.includes('BULLISH') ? '#00bfff' : '#ffaa00'}; padding-left: 8px;">
            <span style="color:${o.tipo.includes('BULLISH') ? '#00bfff' : '#ffaa00'}; font-weight:bold;">${o.tipo.split(' ')[0]} OB</span>
            <span style="color:#bbb;">$${o.fundo.toFixed(2)} - $${o.topo.toFixed(2)}</span>
        </div>
    `).join('') || '<p style="color:#666; font-size:12px; margin:5px 0;">Aguardando Order Block institucional</p>';

    const ultimaVela = candlestickHistory[candlestickHistory.length - 1];
    const precoAtual = ultimaVela ? ultimaVela.close : 0;

    painelSMC.innerHTML = `
        <div style="border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 8px; margin-bottom: 10px; display:flex; justify-content:space-between; align-items:center;">
            <h4 style="margin:0; color:#fff; font-size:13px; letter-spacing: 0.5px;">⚡ TF LAB SMC (GOLD)</h4>
            <span style="font-size:11px; color:#00ff88; font-weight:bold;">● Live: $${precoAtual.toFixed(2)}</span>
        </div>
        
        ${seletorHTML}

        <div style="margin-bottom: 12px;">
            <div style="font-size:10px; color:#555; font-weight:bold; text-transform:uppercase; margin-bottom:6px; letter-spacing:0.5px;">Zonas de Ineficiência (FVG)</div>
            ${htmlFVG}
        </div>
        <div>
            <div style="font-size:10px; color:#555; font-weight:bold; text-transform:uppercase; margin-bottom:6px; letter-spacing:0.5px;">Blocos de Ordens (OB)</div>
            ${htmlOB}
        </div>
    `;
}

// ==========================================
// 3. ATUALIZAÇÃO DO GRÁFICO LIGHTWEIGHT CHARTS
// ==========================================
function atualizarGrafico() {
    const chartContainer = document.getElementById('smc-chart');
    
    if (!chartContainer) {
        console.error('🧠 TF Lab SMC - Container do gráfico não encontrado');
        return;
    }

    if (typeof LightweightCharts === 'undefined') {
        console.error('🧠 TF Lab SMC - LightweightCharts não está carregado');
        return;
    }

    if (!chart) {
        chart = LightweightCharts.createChart(chartContainer, {
            width: chartContainer.clientWidth,
            height: 400,
            layout: { backgroundColor: '#1a1a1e', textColor: '#ccc' },
            grid: { vertLines: { color: '#222' }, horzLines: { color: '#222' } },
            crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
            timeScale: { timeVisible: true, secondsVisible: false }
        });
        
        candlestickSeries = chart.addSeries(LightweightCharts.CandlestickSeries, {
            upColor: '#00ff88',
            downColor: '#ff4444',
            borderVisible: false,
            wickUpColor: '#00ff88',
            wickDownColor: '#ff4444'
        });
    }

    // Converter dados para formato do Lightweight Charts
    const chartData = candlestickHistory.map(v => ({
        time: Math.floor(v.timestamp / 1000),
        open: v.open,
        high: v.high,
        low: v.low,
        close: v.close
    }));

    candlestickSeries.setData(chartData);
    chart.timeScale().fitContent();
}

// ==========================================
// 4. LOGICA DE ALTERAÇÃO EM TEMPO REAL
// ==========================================
async function mudarTimeframeTFLab(novoTimeframe) {
    if (current_timeframe === novoTimeframe) return;
    
    current_timeframe = novoTimeframe;
    console.log(`Alterando TF Lab para: ${current_timeframe}`);

    // Desconecta o WebSocket antigo imediatamente para evitar conflito de dados
    if (activeWebSocket) {
        activeWebSocket.onclose = null; // Remove o auto-reconnect temporariamente
        activeWebSocket.close();
    }

    // Limpa o histórico antigo para renderizar o novo sem "fantasmas"
    candlestickHistory = [];
    detectedFVGs = [];
    detectedOBs = [];
    atualizarPainelTFLab();

    // Reinicia o fluxo com o novo tempo
    await carregarHistoricoBinance();
    conectarWebSocketBinance();
}

// Expõe a função globalmente para o clique nos botões funcionar
window.mudarTimeframeTFLab = mudarTimeframeTFLab;

// ==========================================
// 5. CONEXÕES DE DADOS (BINANCE REST + WS)
// ==========================================
async function carregarHistoricoBinance() {
    const url = `https://api.binance.com/api/v3/klines?symbol=${SYMBOL}&interval=${current_timeframe}&limit=150`;
    try {
        const response = await fetch(url);
        const dadosRaw = await response.json();
        
        candlestickHistory = dadosRaw.map(v => ({
            timestamp: v[0],
            open: parseFloat(v[1]),
            high: parseFloat(v[2]),
            low: parseFloat(v[3]),
            close: parseFloat(v[4]),
            volume: parseFloat(v[5]),
            isClosed: true
        }));

        calcularSmartMoney(candlestickHistory);
    } catch (e) {
        console.error("Erro na busca de dados históricos:", e);
    }
}

function conectarWebSocketBinance() {
    const wsUrl = `wss://stream.binance.com:9443/ws/${SYMBOL.toLowerCase()}@kline_${current_timeframe}`;
    activeWebSocket = new WebSocket(wsUrl);

    activeWebSocket.onmessage = (event) => {
        const dados = JSON.parse(event.data);
        const kline = dados.k;

        // Garante que a mensagem recebida pertence ao timeframe atual ativo
        if (kline.i !== current_timeframe) return;

        const velaAtualizada = {
            timestamp: kline.t,
            open: parseFloat(kline.o),
            high: parseFloat(kline.h),
            low: parseFloat(kline.l),
            close: parseFloat(kline.c),
            volume: parseFloat(kline.v),
            isClosed: kline.x 
        };

        if (candlestickHistory.length > 0 && candlestickHistory[candlestickHistory.length - 1].timestamp === velaAtualizada.timestamp) {
            candlestickHistory[candlestickHistory.length - 1] = velaAtualizada;
        } else {
            candlestickHistory.push(velaAtualizada);
            if (candlestickHistory.length > 200) candlestickHistory.shift();
        }

        calcularSmartMoney(candlestickHistory);
    };

    activeWebSocket.onclose = () => {
        // Só tenta reconectar automaticamente se a conexão não foi fechada de propósito para trocar de TF
        if (activeWebSocket && activeWebSocket.url.includes(`@kline_${current_timeframe}`)) {
            setTimeout(conectarWebSocketBinance, 5000);
        }
    };
}

// ==========================================
// 6. INICIALIZAÇÃO
// ==========================================
async function iniciarTFLabSMC() {
    // Criar container do gráfico se não existir
    const boxTFLab = document.querySelector('#tflab-smc-xauusd');
    if (boxTFLab && !document.getElementById('smc-chart')) {
        const chartDiv = document.createElement('div');
        chartDiv.id = 'smc-chart';
        chartDiv.style.height = '400px';
        chartDiv.style.width = '100%';
        chartDiv.style.background = '#1a1a1e';
        chartDiv.style.border = '1px solid #333';
        chartDiv.style.borderRadius = '8px';
        chartDiv.style.marginTop = '15px';
        boxTFLab.appendChild(chartDiv);
    }
    
    await carregarHistoricoBinance();
    conectarWebSocketBinance();
}

// Executa assim que a janela carregar totalmente
window.addEventListener('DOMContentLoaded', iniciarTFLabSMC);
