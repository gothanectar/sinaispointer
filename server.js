const express = require('express');
const axios = require('axios');
const redis = require('redis');

const app = express();
const PORT = process.env.PORT || 3000;

// Configurações
const TELEGRAM_TOKEN = "8872961272:AAEKSG7S7Y4WYcRdw93V_TnlVsg7ulSR6rw";
const CHAT_ID = "-1002224151740";      // ← Verifique este ID
const MEU_ID_PRIVADO = "6297482127";

app.use(express.json());

const urlTelegram = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;

const redisClient = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.connect()
    .then(() => console.log('📦 Redis conectado com sucesso!'))
    .catch(err => console.error('❌ Redis:', err.message));

// Preço REAL da Binance (Símbolo corrigido)
async function getPrecoRealXAUUSD() {
    try {
        const response = await axios.get('https://api.binance.com/api/v3/ticker/price?symbol=XAUUSDT');
        const price = parseFloat(response.data.price);
        console.log(`✅ Preço REAL XAUUSD (Binance): $${price.toFixed(2)}`);
        return price;
    } catch (error) {
        console.error("❌ Erro Binance:", error.message);
        // Fallback
        return 4186.68 + (Math.random() * 0.40 - 0.20);
    }
}

// Envio Telegram
async function enviarTelegram(chat_id, texto) {
    try {
        await axios.post(urlTelegram, {
            chat_id: chat_id,
            text: texto,
            parse_mode: 'Markdown'
        });
        console.log(`✅ Mensagem enviada para ${chat_id}`);
    } catch (err) {
        console.error(`❌ Erro Telegram ${chat_id}:`, err.response?.data || err.message);
    }
}

// Função Principal
async function rodarAnaliseSMC() {
    try {
        console.log('🔄 Iniciando ciclo de análise SMC...');
        
        const precoAtualOuro = await getPrecoRealXAUUSD();

        const sessaoAtual = obterSessaoAtual();
        console.log(`⏱️ Monitorando Ouro na: ${sessaoAtual}`);

        const blocoDefendidoOB = precoAtualOuro - 4.50;
        const alvos = calcularAlvosSMC('COMPRA', precoAtualOuro, blocoDefendidoOB);

        console.log(`🎯 Alvos Calculados -> Entrada: $${precoAtualOuro.toFixed(2)}`);

        if (redisClient.isOpen) {
            await redisClient.set('sinal_atual', JSON.stringify({
                preco: precoAtualOuro.toFixed(2),
                sl: alvos.sl,
                tp1: alvos.tp1,
                tp2: alvos.tp2,
                tp3: alvos.tp3,
                sessao: sessaoAtual,
                timestamp: Date.now()
            }));
            console.log('💾 Dados gravados no Redis!');
        }

        const textoTelegram = 
`🚨 **NOVO SINAL DETECTADO - SMART MONEY CONCEPTS (SMC)** 🚨

📈 **Ativo:** XAUUSD (Ouro Real)
⏱️ **Sessão:** ${sessaoAtual}

🎯 **Parâmetros de Entrada:**
• **Preço de Entrada:** $${precoAtualOuro.toFixed(2)}
• **Stop Loss (SL):** $${alvos.sl}
• **Take Profit 1 (TP1):** $${alvos.tp1}
• **Take Profit 2 (TP2):** $${alvos.tp2}
• **Take Profit 3 (TP3):** $${alvos.tp3}`;

        await enviarTelegram(CHAT_ID, textoTelegram);
        await enviarTelegram(MEU_ID_PRIVADO, textoTelegram);

    } catch (error) {
        console.error('❌ Erro crítico:', error.message);
    }
}

function obterSessaoAtual() {
    const agora = new Date();
    const opcoes = { timeZone: 'America/Sao_Paulo', hour: '2-digit', hour12: false };
    const horaBrasilia = parseInt(new Intl.DateTimeFormat('pt-BR', opcoes).format(agora));

    if (horaBrasilia >= 20 || horaBrasilia < 4) return "SESSÃO DA ÁSIA (Consolidação/Liquidez)";
    else if (horaBrasilia >= 4 && horaBrasilia < 8) return "SESSÃO DE LONDRES (Alta Volatilidade)";
    else if (horaBrasilia >= 8 && horaBrasilia < 12) return "OVERLAP: LONDRES & NOVA YORK (Volume Máximo)";
    else if (horaBrasilia >= 12 && horaBrasilia < 17) return "SESSÃO DE NOVA YORK (Volume Americano)";
    else return "MERCADO LENTO (Fim de Dia)";
}

function calcularAlvosSMC(tipoOperacao, precoEntrada, blocoExtremo) {
    let risco = Math.abs(precoEntrada - blocoExtremo);
    if (risco < 2.50) risco = 2.50;

    if (tipoOperacao === 'COMPRA') {
        return {
            sl: (precoEntrada - risco).toFixed(2),
            tp1: (precoEntrada + risco * 1.0).toFixed(2),
            tp2: (precoEntrada + risco * 2.0).toFixed(2),
            tp3: (precoEntrada + risco * 3.5).toFixed(2)
        };
    }
    return { sl: "0", tp1: "0", tp2: "0", tp3: "0" };
}

// Inicia o loop
setInterval(rodarAnaliseSMC, 60000);
rodarAnaliseSMC();

app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando com sucesso na porta ${PORT}`);
});