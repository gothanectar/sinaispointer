import { Redis } from '@upstash/redis';
import axios from 'axios';

// Inicialização automática das chaves de ambiente injetadas pela Vercel/Upstash
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const TELEGRAM_TOKEN = '8872961272:AAEKSG7S7Y4WYcRdw93V_TnlVsg7u1SR6rw';
const TELEGRAM_CHAT_ID = '@TradepulseBotFx'; // Canal do usuário
const SYMBOL = 'PAXGUSDT';

export default async function handler(req, res) {
    try {
        // 1. Coleta os dados de velas de 15 minutos via API pública da Binance
        const binanceUrl = `https://api.binance.com/api/v3/klines?symbol=${SYMBOL}&interval=15m&limit=50`;
        const response = await axios.get(binanceUrl);
        
        const velas = response.data.map(v => ({
            timestamp: Number(v[0]),
            open: parseFloat(v[1]),
            high: parseFloat(v[2]),
            low: parseFloat(v[3]),
            close: parseFloat(v[4])
        }));

        const velaAtual = velas[velas.length - 1];
        const precoAtual = velaAtual.close;

        // 2. MONITOR DE STATUS: Verifica e atualiza posições abertas no banco de dados
        let historicoSinais = (await redis.get('historico_sinais')) || [];
        let alterouHistorico = false;

        historicoSinais = historicoSinais.map(sinal => {
            if (sinal.status === 'ABERTO') {
                alterouHistorico = true;
                if (sinal.tipo === 'COMPRA') {
                    if (precoAtual >= sinal.tp3) sinal.status = 'GAIN (TP3)';
                    else if (precoAtual >= sinal.tp2) sinal.status = 'GAIN (TP2)';
                    else if (precoAtual >= sinal.tp1) sinal.status = 'GAIN (TP1)';
                    else if (precoAtual <= sinal.sl) sinal.status = 'LOSS';
                } else if (sinal.tipo === 'VENDA') {
                    if (precoAtual <= sinal.tp3) sinal.status = 'GAIN (TP3)';
                    else if (precoAtual <= sinal.tp2) sinal.status = 'GAIN (TP2)';
                    else if (precoAtual <= sinal.tp1) sinal.status = 'GAIN (TP1)';
                    else if (precoAtual >= sinal.sl) sinal.status = 'LOSS';
                }
            }
            return sinal;
        });

        // 3. ALGORITMO INTEGRADO DE SMART MONEY (SMC)
        let novoSinal = null;
        const v1 = velas[velas.length - 3];
        const v2 = velas[velas.length - 2];
        const v3 = velas[velas.length - 1];

        // Rastreamento de Fair Value Gap (FVG) Bullish
        if (v3.low > v1.high && v2.close > v2.open && precoAtual <= v3.low) {
            novoSinal = { tipo: 'COMPRA', entrada: precoAtual, sl: v1.high * 0.999, fvg_id: v2.timestamp };
        }
        // Rastreamento de Fair Value Gap (FVG) Bearish
        else if (v3.high < v1.low && v2.close < v2.open && precoAtual >= v3.high) {
            novoSinal = { tipo: 'VENDA', entrada: precoAtual, sl: v1.low * 1.001, fvg_id: v2.timestamp };
        }

        // 4. EVITA OVERTRADING E CONFIGURA OS SINAIS DO TELEGRAM
        if (novoSinal) {
            const jaExiste = historicoSinais.some(s => s.fvg_id === novoSinal.fvg_id);
            
            if (!jaExiste) {
                const risco = Math.abs(novoSinal.entrada - novoSinal.sl);
                const tp1 = novoSinal.tipo === 'COMPRA' ? novoSinal.entrada + risco : novoSinal.entrada - risco;
                const tp2 = novoSinal.tipo === 'COMPRA' ? novoSinal.entrada + (risco * 2) : novoSinal.entrada - (risco * 2);
                const tp3 = novoSinal.tipo === 'COMPRA' ? novoSinal.entrada + (risco * 3) : novoSinal.entrada - (risco * 3);

                const sinalCompleto = {
                    id: Date.now(),
                    fvg_id: novoSinal.fvg_id,
                    tipo: novoSinal.tipo,
                    entrada: novoSinal.entrada,
                    sl: novoSinal.sl,
                    tp1, tp2, tp3,
                    status: 'ABERTO',
                    horario: new Date().toLocaleTimeString('pt-BR')
                };

                historicoSinais.unshift(sinalCompleto);
                if (historicoSinais.length > 25) historicoSinais.pop(); // Limita o tamanho do banco
                alterouHistorico = true;

                // Mensagem formatada enviada ao Telegram com botões inline interativos
                const textoTelegram = 
`🚨 *SINAL AUTOMÁTICO 24H* 🚨
Ativo: *${SYMBOL}* | Período: *15m*

📥 *ENTRADA:* ${sinalCompleto.entrada.toFixed(2)}
🔴 *STOP LOSS:* ${sinalCompleto.sl.toFixed(2)}

🎯 *TAKE PROFIT 1:* ${tp1.toFixed(2)}
🎯 *TAKE PROFIT 2:* ${tp2.toFixed(2)}
🎯 *TAKE PROFIT 3:* ${tp3.toFixed(2)}

📡 _Monitoramento em Nuvem ativo sem interrupções._`;
                
                await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
                    chat_id: TELEGRAM_CHAT_ID,
                    text: textoTelegram,
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: '📊 Ver Gráfico no Site', url: 'https://ponteiro40.vercel.app' },
                                { text: '📱 Canal do Telegram', url: 'https://t.me' }
                            ]
                        ]
                    }
                });
            }
        }

        if (alterouHistorico) {
            await redis.set('historico_sinais', historicoSinais);
        }

        return res.status(200).json({ success: true, precoAtual });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
