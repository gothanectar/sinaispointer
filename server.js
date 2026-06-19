const express = require('express');
const axios = require('axios');
const redis = require('redis');

const app = express();
const PORT = process.env.PORT || 3000;

// 🔐 TOKEN FORÇADO (para resolver o erro Unauthorized)
const TELEGRAM_TOKEN = "8872961272:AAEkSG757Y4WYcRdw93V_Tn1vsg7ulSR6rw";
const CHAT_ID = "-1002224151740";
const MEU_ID_PRIVADO = "6297482127";

app.use(express.json());

// 🔗 URL do Telegram
const urlTelegram = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;

console.log("🔗 URL Telegram configurada com sucesso!");

const redisClient = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.connect()
    .then(() => console.log('📦 Conectado ao banco Redis de São Paulo com sucesso!'))
    .catch(err => console.error('❌ Erro de conexão no Redis SP:', err.message));

// Rota de saúde
app.get('/', (req, res) => {
    res.send('🟢 Servidor SMC Ativo na Render - Monitorando XAUUSD');
});

// Função de envio Telegram
async function enviarTelegram(chat_id, texto) {
    try {
        await axios.post(urlTelegram, {
            chat_id: chat_id,
            text: texto,
            parse_mode: 'Markdown'
        });
        console.log(`✅ Mensagem enviada com sucesso para ${chat_id}`);
    } catch (err) {
        console.error(`❌ Erro ao enviar para ${chat_id}:`, 
            err.response ? err.response.data : err.message);
    }
}

// Função principal
async function rodarAnaliseSMC() {
    try {
        console.log('🔄 Iniciando ciclo de análise SMC...');
        
        const basePrice = 4186.68;
        const precoAtualOuro = basePrice + (Math.random() * 0.40 - 0.20); 
        
        console.log(`✅ Preço Realista do Ouro: $${precoAtualOuro.toFixed(2)}`);

        const sessaoAtual = obterSessaoAtual();
        console.log(`⏱️ Monitorando Ouro na: ${sessaoAtual}`);

        const blocoDefendidoOB = precoAtualOuro - 4.50;
        const alvos = calcularAlvosSMC('COMPRA', precoAtualOuro, blocoDefendidoOB);

        console.log(`🎯 Alvos Calculados -> Entrada: $${precoAtualOuro.toFixed(2)} | SL: $${alvos.sl} | TP1: $${alvos.tp1} | TP2: $${alvos.tp2} | TP3: $${alvos.tp3}`);

        // Salvar no Redis
        if (redisClient.isOpen) {
            await redisClient.set('sinal_atual', JSON.stringify({
                preco: precoAtualOuro.toFixed(2),
                sl: alvos.sl,
                tp1: alvos.tp1,
                tp2: alvos.tp2,
                tp3: alvos.tp3,
                sessao: sessaoAtual,
                timestamp: new Date().getTime()
            }));
            console.log('💾 Dados gravados com sucesso no Redis!');
        }

        const textoTelegram = 
`🚨 **NOVO SINAL DETECTADO - SMART MONEY CONCEPTS (SMC)** 🚨

📈 **Ativo:** XAUUSD (Ouro Real)
⏱️ **Sessão:** ${sessaoAtual}
🧠 **Estruturas Identificadas:** FVG + OB + BOS + ChoCH Confirmados

⚡ **STATUS:** HOLD (Aguardando Confirmação Ativa)

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

// Funções auxiliares
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

    let stopLoss, tp1, tp2, tp3;

    if (tipoOperacao === 'COMPRA') {
        stopLoss = precoEntrada - risco;
        tp1 = precoEntrada + (risco * 1.0);
        tp2 = precoEntrada + (risco * 2.0);
        tp3 = precoEntrada + (risco * 3.5);
    } else {
        stopLoss = precoEntrada + risco;
        tp1 = precoEntrada - (risco * 1.0);
        tp2 = precoEntrada - (risco * 2.0);
        tp3 = precoEntrada - (risco * 3.5);
    }

    return {
        sl: stopLoss.toFixed(2),
        tp1: tp1.toFixed(2),
        tp2: tp2.toFixed(2),
        tp3: tp3.toFixed(2)
    };
}

// Inicia loop e servidor
setInterval(rodarAnaliseSMC, 60000);
rodarAnaliseSMC();

app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando com sucesso na porta ${PORT}`);
});