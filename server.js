const express = require('express');
const axios = require('axios');
const redis = require('redis');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Configurações
const TELEGRAM_TOKEN = "8872961272:AAEKSG7S7Y4WYcRdw93V_TnlVsg7ulSR6rw";
const CHAT_ID = "-1002224151740";
const MEU_ID_PRIVADO = "6297482127";

const urlTelegram = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;

const redisClient = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.connect().catch(err => console.error('Redis erro:', err.message));

// ==================== RECEBER SINAL DO MT5 ====================
app.post('/nova-ordem', async (req, res) => {
    try {
        const { symbol, action, price, sl, tp1, tp2, tp3 } = req.body;

        console.log(`🚨 Sinal recebido: ${action} ${symbol} @ ${price}`);

        const emoji = action === "COMPRA" ? "🟢" : "🔴";
        const cor = action === "COMPRA" ? "✅ COMPRA" : "❌ VENDA";

        const textoTelegram = 
`${emoji} **NOVO SINAL SMC - ${cor}** ${emoji}

📊 **Ativo:** ${symbol}
⏰ **Horário:** ${new Date().toLocaleTimeString('pt-BR')}

💰 **Entrada:** $${price.toFixed(2)}
🛡️ **Stop Loss:** $${sl.toFixed(2)}
🚀 **Take Profit 1:** $${tp1.toFixed(2)}
🚀 **Take Profit 2:** $${tp2.toFixed(2)}
🚀 **Take Profit 3:** $${tp3.toFixed(2)}

⚡ Gerencie seu risco com disciplina!`;

        // Enviar mensagens
        await enviarTelegram(CHAT_ID, textoTelegram);
        await enviarTelegram(MEU_ID_PRIVADO, textoTelegram);

        res.json({ status: "ok" });
    } catch (error) {
        console.error("Erro:", error.message);
        res.status(500).json({ error: error.message });
    }
});

async function enviarTelegram(chat_id, texto) {
    try {
        await axios.post(urlTelegram, {
            chat_id: chat_id,
            text: texto,
            parse_mode: 'Markdown'
        });
    } catch (err) {
        console.error(`Erro Telegram ${chat_id}:`, err.response?.data || err.message);
    }
}

// Rota de status
app.get('/', (req, res) => {
    res.send('🟢 Servidor SMC Pro Ativo - Aguardando sinais do MT5');
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});