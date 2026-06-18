// ========================================================
// SMC ADVANCED ENGINE v2.0 - FVG, OB, LIQUIDEZ E CHoCH
// ========================================================
const ATIVO_SMC = 'PAXGUSDT'; // Ouro pareado em dólar na Binance
let current_timeframe_smc = '15m'; // Timeframe padrão inicial
let historicoVelasSMC = [];
let objetosDesenhadosSMC = [];
let graficoSMC = null;
let serieVelasSMC = null;
let detectedFVGsSMC = [];
let detectedOBsSMC = [];
let activeWebSocketSMC = null; // Guarda a conexão para poder fechar ao trocar de TF

// Mapeamento dos botões para o padrão aceito pela API da Binance
const TIMEFRAME_MAP_SMC = {
    '1m': '1m',
    '5m': '5m',
    '15m': '15m',
    '30m': '30m',
    '1h': '1h',
    '4h': '4h',
    '1d': '1d',
    '1w': '1w',
    '1M': '1M'
};

// ========================================================
// INICIALIZAÇÃO DO GRÁFICO SMC AVANÇADO
// ========================================================
async function iniciarSMCAdvanced() {
    console.log('Iniciando SMC Advanced...');
    
    const containerGrafico = document.getElementById('smc-advanced-container');
    
    if (!containerGrafico) {
        console.error('Container SMC Advanced não encontrado');
        return;
    }
    
    if (typeof LightweightCharts === 'undefined') {
        console.error('LightweightCharts não está carregado');
        return;
    }
    
    console.log('Container encontrado, criando gráfico...');

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

    // Série Principal de Candlesticks - usando a API correta
    serieVelasSMC = graficoSMC.addSeries(LightweightCharts.CandlestickSeries, {
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
    console.log('Processando indicadores SMC...', velas.length);
    if (!graficoSMC || velas.length < 10) {
        console.log('Condição não atendida para processar indicadores');
        return;
    }

    // 1. Limpa desenhos anteriores para não dar lag no gráfico
    objetosDesenhadosSMC.forEach(obj => {
        try {
            graficoSMC.removeSeries(obj);
        } catch(e) {}
    });
    objetosDesenhadosSMC = [];

    // --- 1. FAIR VALUE GAPS (FVG) ---
    detectedFVGsSMC = [];
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
            
            detectedFVGsSMC.push({
                tipo: 'BULLISH',
                topo: v3.low,
                fundo: v1.high,
                timestamp: v2.time
            });
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
            
            detectedFVGsSMC.push({
                tipo: 'BEARISH',
                topo: v1.low,
                fundo: v3.high,
                timestamp: v2.time
            });
        }
    }

    // --- 2. ORDER BLOCKS (OB) & CHoCH (Change of Character) ---
    detectedOBsSMC = [];
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
            
            detectedOBsSMC.push({
                tipo: 'BULLISH OB (SUPORTE)',
                topo: velas[i-1].high,
                fundo: velas[i-1].low,
                timestamp: velas[i-1].time
            });
        }
        
        // Order Blocks Bearish
        if (v.close < v.open && (v.open - v.close) > (vAnterior.high - vAnterior.low) * 1.6) {
            const obResistencia = graficoSMC.addLineSeries({ 
                color: 'rgba(255, 170, 0, 0.6)', 
                lineWidth: 2, 
                lineStyle: LightweightCharts.LineStyle.Solid,
                title: 'OB Bearish' 
            });
            const timestampSegundos = Math.floor(velas[i-1].time / 1000);
            const timestampFim = Math.floor(v.time / 1000) + (15 * 60 * 8);
            obResistencia.setData([
                { time: timestampSegundos, value: velas[i-1].high }, 
                { time: timestampFim, value: velas[i-1].high }
            ]);
            objetosDesenhadosSMC.push(obResistencia);
            
            detectedOBsSMC.push({
                tipo: 'BEARISH OB (RESISTÊNCIA)',
                topo: velas[i-1].high,
                fundo: velas[i-1].low,
                timestamp: velas[i-1].time
            });
        }
    }

    // --- 3. ZONAS DE LIQUIDEZ RESTRITA (LIQ / EQUAL HIGHS-LOWS) ---
    for (let i = 3; i < velas.length - 3; i++) {
        // Encontra piscinas de liquidez onde o varejo coloca stop loss parecidos
        if (Math.abs(velas[i].high - velas[i-1].high) < 0.15) {
            marcarLinhaEstruturaSMC(velas[i].time, velas[i].high, 'LIQ 💵', 'rgba(255, 255, 255, 0.4)', LightweightCharts.LineStyle.Dotted);
        }
    }
    
    // Atualizar tabela de bullish/bearish
    atualizarTabelaSMC();
}

// ========================================================
// ATUALIZAR TABELA DE BULLISH/BEARISH
// ========================================================
function atualizarTabelaSMC() {
    console.log('Atualizando tabela SMC...');
    const painelSMC = document.getElementById('smc-advanced-panel');
    if (!painelSMC) {
        console.error('Painel SMC não encontrado');
        return;
    }
    
    console.log('FVGs detectados:', detectedFVGsSMC.length);
    console.log('OBs detectados:', detectedOBsSMC.length);
    
    let htmlFVG = detectedFVGsSMC.slice(-4).reverse().map(f => `
        <div style="display:flex; justify-content:space-between; margin-bottom: 6px; font-size:12px; border-left: 3px solid ${f.tipo === 'BULLISH' ? '#00ff88' : '#ff3355'}; padding-left: 8px;">
            <span style="color:${f.tipo === 'BULLISH' ? '#00ff88' : '#ff3355'}; font-weight:bold;">FVG ${f.tipo}</span>
            <span style="color:#bbb;">$${f.fundo.toFixed(2)} - $${f.topo.toFixed(2)}</span>
        </div>
    `).join('') || '<p style="color:#666; font-size:12px; margin:5px 0;">Nenhum FVG no timeframe atual</p>';

    let htmlOB = detectedOBsSMC.slice(-4).reverse().map(o => `
        <div style="display:flex; justify-content:space-between; margin-bottom: 6px; font-size:12px; border-left: 3px solid ${o.tipo.includes('BULLISH') ? '#00bfff' : '#ffaa00'}; padding-left: 8px;">
            <span style="color:${o.tipo.includes('BULLISH') ? '#00bfff' : '#ffaa00'}; font-weight:bold;">${o.tipo.split(' ')[0]} OB</span>
            <span style="color:#bbb;">$${o.fundo.toFixed(2)} - $${o.topo.toFixed(2)}</span>
        </div>
    `).join('') || '<p style="color:#666; font-size:12px; margin:5px 0;">Aguardando Order Block institucional</p>';

    const ultimaVela = historicoVelasSMC[historicoVelasSMC.length - 1];
    const precoAtual = ultimaVela ? ultimaVela.close : 0;

    painelSMC.innerHTML = `
        <div style="border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 8px; margin-bottom: 10px; display:flex; justify-content:space-between; align-items:center;">
            <h4 style="margin:0; color:#fff; font-size:13px; letter-spacing: 0.5px;">⚡ SMC ADVANCED (GOLD)</h4>
            <span style="font-size:11px; color:#00ff88; font-weight:bold;">● Live: $${precoAtual.toFixed(2)}</span>
        </div>
        
        <div style="margin-bottom: 12px;">
            <div style="font-size:10px; color:#555; font-weight:bold; text-transform:uppercase; margin-bottom:6px; letter-spacing:0.5px;">Zonas de Ineficiência (FVG)</div>
            ${htmlFVG}
        </div>
        
        <div style="margin-bottom: 12px;">
            <div style="font-size:10px; color:#555; font-weight:bold; text-transform:uppercase; margin-bottom:6px; letter-spacing:0.5px;">Order Blocks Institucionais</div>
            ${htmlOB}
        </div>
        
        <div style="font-size:10px; color:#444; margin-top:10px;">
            <span style="color:#00ff88;">●</span> Bullish (Compra) &nbsp; 
            <span style="color:#ff3355;">●</span> Bearish (Venda) &nbsp; 
            <span style="color:#00bfff;">●</span> Suporte &nbsp; 
            <span style="color:#ffaa00;">●</span> Resistência
        </div>
    `;
    
    console.log('Tabela atualizada com sucesso');
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
    const url = `https://api.binance.com/api/v3/klines?symbol=${ATIVO_SMC}&interval=${current_timeframe_smc}&limit=180`;
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
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${ATIVO_SMC.toLowerCase()}@kline_${current_timeframe_smc}`);
    activeWebSocketSMC = ws;

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
        // Só tenta reconectar automaticamente se a conexão não foi fechada de propósito para trocar de TF
        if (activeWebSocketSMC && activeWebSocketSMC.url.includes(`@kline_${current_timeframe_smc}`)) {
            setTimeout(conectarWebSocketSMC, 5000);
        }
    };
}

// Função para mudar timeframe
function mudarTimeframeSMC(timeframe) {
    if (current_timeframe_smc === timeframe) return;
    
    // Fechar conexão WebSocket atual
    if (activeWebSocketSMC) {
        activeWebSocketSMC.close();
        activeWebSocketSMC = null;
    }
    
    // Atualizar timeframe atual
    current_timeframe_smc = timeframe;
    
    // Limpar arrays de indicadores
    detectedFVGsSMC = [];
    detectedOBsSMC = [];
    
    // Recarregar dados com novo timeframe
    carregarHistoricoSMC();
    conectarWebSocketSMC();
    
    // Atualizar botões ativos
    document.querySelectorAll('.smc-timeframe-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.timeframe === timeframe) {
            btn.classList.add('active');
        }
    });
}

// Disparo automático na inicialização da página
window.addEventListener('DOMContentLoaded', iniciarSMCAdvanced);

// Adicionar event listeners nos botões de timeframe
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        document.querySelectorAll('.smc-timeframe-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const timeframe = btn.dataset.timeframe;
                mudarTimeframeSMC(timeframe);
            });
        });
    }, 1000);
});
