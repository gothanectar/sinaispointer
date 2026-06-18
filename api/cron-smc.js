const { Redis } = require('@upstash/redis');
const axios = require('axios');

// Verificar se variáveis de ambiente estão configuradas
if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
  console.error('Variáveis de ambiente do Upstash Redis não configuradas');
}

// Inicialização automática das chaves de ambiente injetadas pela Vercel/Upstash
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const TELEGRAM_TOKEN = '8872961272:AAEKSG7S7Y4WYcRdw93V_TnlVsg7u1SR6rw';
const TELEGRAM_CHAT_ID = '6297482127'; 
const SYMBOL = 'PAXGUSDT';

// Função auxiliar para processar a lógica SMC de forma isolada por timeframe
function analisarTimeframeSMC(velas, precoAtual, timeframe) {
    let novoSinal = null;
    const v1 = velas[velas.length - 3];
    const v2 = velas[velas.length - 2];
    const v3 = velas[velas.length - 1];
    const v4 = velas[velas.length - 4];

    // 1. Rastreamento de Fair Value Gap (FVG) Bullish
    if (v3.low > v1.high && v2.close > v2.open && precoAtual <= v3.low) {
        novoSinal = { tipo: 'COMPRA', entrada: precoAtual, sl: v1.high * 0.999, fvg_id: `${timeframe}_FVG_${v2.timestamp}`, fonte: 'FVG' };
    }
    // 2. Rastreamento de Fair Value Gap (FVG) Bearish
    else if (v3.high < v1.low && v2.close < v2.open && precoAtual >= v3.high) {
        novoSinal = { tipo: 'VENDA', entrada: precoAtual, sl: v1.low * 1.001, fvg_id: `${timeframe}_FVG_${v2.timestamp}`, fonte: 'FVG' };
    }
    // 3. Rastreamento de Order Block (OB) Bullish - última vela de movimento forte antes de reversão
    else if (v2.close > v2.open && v2.close - v2.open > (v2.high - v2.low) * 0.6 && v3.close < v3.open && precoAtual >= v2.low && precoAtual <= v2.high) {
        novoSinal = { tipo: 'COMPRA', entrada: precoAtual, sl: v2.low * 0.999, fvg_id: `${timeframe}_OB_${v2.timestamp}`, fonte: 'OB' };
    }
    // 4. Rastreamento de Order Block (OB) Bearish
    else if (v2.close < v2.open && v2.open - v2.close > (v2.high - v2.low) * 0.6 && v3.close > v3.open && precoAtual >= v2.low && precoAtual <= v2.high) {
        novoSinal = { tipo: 'VENDA', entrada: precoAtual, sl: v2.high * 1.001, fvg_id: `${timeframe}_OB_${v2.timestamp}`, fonte: 'OB' };
    }
    // 5. Rastreamento de Break of Structure (BOS) Bullish - quebra de estrutura de baixa
    else if (v3.high > v1.high && v2.close > v2.open && precoAtual <= v3.high && precoAtual >= v3.low) {
        novoSinal = { tipo: 'COMPRA', entrada: precoAtual, sl: v3.low * 0.999, fvg_id: `${timeframe}_BOS_${v3.timestamp}`, fonte: 'BOS' };
    }
    // 6. Rastreamento de Break of Structure (BOS) Bearish - quebra de estrutura de alta
    else if (v3.low < v1.low && v2.close < v2.open && precoAtual >= v3.low && precoAtual <= v3.high) {
        novoSinal = { tipo: 'VENDA', entrada: precoAtual, sl: v3.high * 1.001, fvg_id: `${timeframe}_BOS_${v3.timestamp}`, fonte: 'BOS' };
    }
    // 7. Rastreamento de Change of Character (ChoCH) Bullish - mudança de caráter de baixa para alta
    else if (v3.close > v1.high && v2.close > v2.open && v3.close > v3.open && precoAtual <= v3.close && precoAtual >= v3.open) {
        novoSinal = { tipo: 'COMPRA', entrada: precoAtual, sl: v3.low * 0.999, fvg_id: `${timeframe}_ChoCH_${v3.timestamp}`, fonte: 'ChoCH' };
    }
    // 8. Rastreamento de Change of Character (ChoCH) Bearish - mudança de caráter de alta para baixa
    else if (v3.close < v1.low && v2.close < v2.open && v3.close < v3.open && precoAtual >= v3.close && precoAtual <= v3.open) {
        novoSinal = { tipo: 'VENDA', entrada: precoAtual, sl: v3.high * 1.001, fvg_id: `${timeframe}_ChoCH_${v3.timestamp}`, fonte: 'ChoCH' };
    }
    return novoSinal;
}

module.exports = async function handler(req, res) {
    try {
        // 1. Coleta dados de 5m, 15m e 4h em paralelo para máxima velocidade e performance na nuvem
        // Usando api1.binance.com com headers User-Agent oficial da Binance
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'application/json',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Referer': 'https://www.binance.com/'
        };
        const [res5m, res15m, res4h] = await Promise.all([
            axios.get(`https://api.binance.com/api/v3/klines?symbol=${SYMBOL}&interval=5m&limit=50`, { headers }),
            axios.get(`https://api.binance.com/api/v3/klines?symbol=${SYMBOL}&interval=15m&limit=50`, { headers }),
            axios.get(`https://api.binance.com/api/v3/klines?symbol=${SYMBOL}&interval=4h&limit=50`, { headers })
        ]);

        // Formatação dos arrays de velas
        const velas5m = res5m.data.map(v => ({ timestamp: Number(v[0]), open: parseFloat(v[1]), high: parseFloat(v[2]), low: parseFloat(v[3]), close: parseFloat(v[4]) }));
        const velas15m = res15m.data.map(v => ({ timestamp: Number(v[0]), open: parseFloat(v[1]), high: parseFloat(v[2]), low: parseFloat(v[3]), close: parseFloat(v[4]) }));
        const velas4h = res4h.data.map(v => ({ timestamp: Number(v[0]), open: parseFloat(v[1]), high: parseFloat(v[2]), low: parseFloat(v[3]), close: parseFloat(v[4]) }));

        // O preço spot atualizado é extraído do tick de 5 minutos mais recente
        const precoAtual = velas5m[velas5m.length - 1].close; 

        // 2. MONITOR DE STATUS: Lê o Upstash Redis e checa posições "ABERTO" para liquidar em ganho ou perda
        let dadosBanco = await redis.get('historico_sinais');
        let historicoSinais = dadosBanco ? JSON.parse(dadosBanco) : [];
        let alterouHistorico = false;

        historicoSinais = historicoSinais.map(sinal => {
            if (sinal.status === 'ABERTO') {
                alterouHistorico = true;
                if (sinal.tipo === 'COMPRA') {
                    if (precoAtual >= sinal.tp1) sinal.status = 'GAIN (TP1)';
                    else if (precoAtual <= sinal.sl) sinal.status = 'LOSS';
                } else if (sinal.tipo === 'VENDA') {
                    if (precoAtual <= sinal.tp1) sinal.status = 'GAIN (TP1)';
                    else if (precoAtual >= sinal.sl) sinal.status = 'LOSS';
                }
            }
            return sinal;
        });

        // 3. EXECUTA O ALGORITMO NAS TRÊS JANELAS DE TEMPO INDEPENDENTES
        const sinal5m = analisarTimeframeSMC(velas5m, precoAtual, '5m');
        const sinal15m = analisarTimeframeSMC(velas15m, precoAtual, '15m');
        const sinal4h = analisarTimeframeSMC(velas4h, precoAtual, '4h');

        // Cria a fila de processamento de sinais detectados na execução do minuto atual
        const sinaisEncontrados = [];
        if (sinal5m) sinaisEncontrados.push({ ...sinal5m, timeframe: '5m' });
        if (sinal15m) sinaisEncontrados.push({ ...sinal15m, timeframe: '15m' });
        if (sinal4h) sinaisEncontrados.push({ ...sinal4h, timeframe: '4h' });

        // 4. PROCESSA, ARMAZENA E DISPARA PARA O TELEGRAM CADA SINAL COM SUA TAG
        for (const sinal of sinaisEncontrados) {
            const jaExiste = historicoSinais.some(s => s.fvg_id === sinal.fvg_id);
            
            if (!jaExiste) {
                const risco = Math.abs(sinal.entrada - sinal.sl);
                const tp1 = sinal.tipo === 'COMPRA' ? sinal.entrada + risco : sinal.entrada - risco;
                
                const agora = new Date();
                const dataFormatada = agora.toLocaleDateString('pt-BR');
                const horaFormatada = agora.toLocaleTimeString('pt-BR');

                // Define o emoji identificador de peso do sinal
                let emojiPeso = "⚡"; 
                if (sinal.timeframe === '15m') emojiPeso = "🚀";
                if (sinal.timeframe === '4h') emojiPeso = "👑 BANCO/INSTITUCIONAL";

                const sinalCompleto = {
                    id: Date.now() + Math.random(), 
                    fvg_id: sinal.fvg_id,
                    tipo: sinal.tipo,
                    timeframe: sinal.timeframe, 
                    fonte: sinal.fonte, // Usa a fonte detectada (FVG, OB, BOS, ChoCH)
                    entrada: sinal.entrada,
                    sl: sinal.sl,
                    tp1: tp1,
                    status: 'ABERTO',
                    horario: `${dataFormatada} às ${horaFormatada}` 
                };

                historicoSinais.unshift(sinalCompleto);
                alterouHistorico = true;

                // Mensagem formatada enviada ao Telegram contendo a tag exata do período gráfico
                const textoTelegram = 
`${emojiPeso} *NOVO SINAL DETECTADO (${sinal.timeframe})* ${emojiPeso}
Ativo: *${SYMBOL}* | Período Gráfico: *Sinal de ${sinal.timeframe}*
📊 *Fonte:* ${sinalCompleto.fonte}

📥 *AÇÃO:* ${sinalCompleto.tipo}
💵 *PREÇO ENTRADA:* ${sinalCompleto.entrada.toFixed(2)}
🛑 *STOP LOSS (SL):* ${sinalCompleto.sl.toFixed(2)}
🎯 *TAKE PROFIT (TP1):* ${tp1.toFixed(2)}

📅 *Data:* ${dataFormatada}
🕒 *Horário Abertura:* ${horaFormatada}

📡 _Varredura Multi-Timeframe Automatizada TradePulse_`;
                
                await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
                    chat_id: TELEGRAM_CHAT_ID,
                    text: textoTelegram,
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: '📊 Ver Gráfico no Site', url: 'https://sinaispointer.vercel.app' },
                                { text: '📱 Canal do Telegram', url: 'https://t.me' }
                            ]
                        ]
                    }
                });
            }
        }

        // Garante o teto máximo de registros salvos na tabela de desempenho do Redis
        if (historicoSinais.length > 35) historicoSinais = historicoSinais.slice(0, 35);

        if (alterouHistorico) {
            await redis.set('historico_sinais', JSON.stringify(historicoSinais));
        }

        return res.status(200).json({ ok: true, sinais_novos: sinaisEncontrados.length });

    } catch (error) {
        console.error("Erro no motor operacional:", error);
        console.error("Detalhes do erro:", error.message);
        console.error("Stack trace:", error.stack);
        return res.status(200).json({ ok: false, msg: "Filtro executado" });
    }
}
