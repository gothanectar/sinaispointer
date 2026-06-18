// ========================================================
// MULTI-TIMEFRAME CHARTS - GRADE DE TIMEFRAMES
// ========================================================
const SYMBOL_MULTI = 'PAXGUSDT';
const TIMEFRAMES = ['5m', '30m', '1h', '4h', '1d', '1w'];
const charts = {};

// ========================================================
// INICIALIZAR GRÁFICOS MULTI-TIMEFRAME
// ========================================================
async function inicializarMultiTimeframeCharts() {
    console.log('Iniciando gráficos multi-timeframe...');
    
    if (typeof LightweightCharts === 'undefined') {
        console.error('LightweightCharts não está carregado');
        return;
    }

    for (const tf of TIMEFRAMES) {
        const containerId = `chart-xauusd-${tf}`;
        const container = document.getElementById(containerId);
        
        if (!container) {
            console.log(`Container ${containerId} não encontrado`);
            continue;
        }

        try {
            // Criar gráfico
            const chart = LightweightCharts.createChart(container, {
                width: container.clientWidth,
                height: 250,
                layout: { 
                    background: { type: 'solid', color: '#0c0d14' }, 
                    textColor: '#8b92b6' 
                },
                grid: { 
                    vertLines: { color: 'rgba(42, 46, 57, 0.08)' }, 
                    horzLines: { color: 'rgba(42, 46, 57, 0.08)' } 
                },
                timeScale: { 
                    timeVisible: true,
                    secondsVisible: false
                },
                rightPriceScale: {
                    borderColor: 'rgba(255,255,255,0.05)'
                }
            });

            const candlestickSeries = chart.addSeries(LightweightCharts.CandlestickSeries, {
                upColor: '#00ff88',
                downColor: '#ff3355',
                borderVisible: false,
                wickUpColor: '#00ff88',
                wickDownColor: '#ff3355'
            });

            charts[tf] = { chart, candlestickSeries };

            // Carregar dados
            await carregarDadosTimeframe(tf, candlestickSeries, chart);

            // Responsivo
            window.addEventListener('resize', () => {
                chart.resize(container.clientWidth, 250);
            });

        } catch (error) {
            console.error(`Erro ao inicializar gráfico ${tf}:`, error);
        }
    }
}

// ========================================================
// CARREGAR DADOS PARA TIMEFRAME ESPECÍFICO
// ========================================================
async function carregarDadosTimeframe(timeframe, series, chart) {
    const url = `https://api.binance.com/api/v3/klines?symbol=${SYMBOL_MULTI}&interval=${timeframe}&limit=100`;
    
    try {
        const response = await fetch(url);
        const dados = await response.json();
        
        const chartData = dados.map(v => ({
            time: Math.floor(v[0] / 1000),
            open: parseFloat(v[1]),
            high: parseFloat(v[2]),
            low: parseFloat(v[3]),
            close: parseFloat(v[4])
        }));

        series.setData(chartData);
        chart.timeScale().fitContent();
        
        console.log(`Dados carregados para timeframe ${timeframe}`);
    } catch (error) {
        console.error(`Erro ao carregar dados para ${timeframe}:`, error);
    }
}

// ========================================================
// INICIALIZAÇÃO
// ========================================================
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(inicializarMultiTimeframeCharts, 1000);
});
