const express = require('express');
const axios = require('axios');
const redis = require('redis');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// ==================== CONFIGURAÇÕES ====================
const TELEGRAM_TOKEN = "8872961272:AAEKSG7S7Y4WYcRdw93V_TnlVsg7ulSR6rw";
const CHAT_ID = "-1002224151740";        // Canal
const MEU_ID_PRIVADO = "6297482127";

const urlTelegram = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;

const redisClient = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.connect()
    .then(() => console.log('📦 Redis conectado com sucesso!'))
    .catch(err => console.error('❌ Redis:', err.message));

// ==================== RECEBER SINAL DO MT5 ====================
app.post('/nova-ordem', async (req, res) => {
    try {
        const { symbol, action, price, sl, tp1, tp2, tp3 } = req.body;

        console.log(`🚨 NOVO SINAL RECEBIDO DO MT5: ${action} ${symbol} @ ${price}`);

        const textoTelegram = 
`🚨 **SINAL SMC - ${action}** 🚨

📈 **Ativo:** ${symbol}
💰 **Entrada:** $${price.toFixed(2)}
🛡️ **Stop Loss:** $${sl.toFixed(2)}
🎯 **TP1:** $${tp1.toFixed(2)}
🎯 **TP2:** $${(tp2 || price * 1.02).toFixed(2)}
🎯 **TP3:** $${(tp3 || price * 1.035).toFixed(2)}

🔄 Enviado automaticamente pelo Robô MT5`;

        // Enviar para Telegram
        await enviarTelegram(CHAT_ID, textoTelegram);
        await enviarTelegram(MEU_ID_PRIVADO, textoTelegram);

        // Salvar no Redis
        if (redisClient.isOpen) {
            await redisClient.set('ultimo_sinal', JSON.stringify({
                symbol,
                action,
                price,
                sl,
                tp1,
                tp2,
                tp3,
                timestamp: Date.now()
            }));
        }

        res.json({ status: "ok", message: "Sinal processado" });
    } catch (error) {
        console.error("❌ Erro ao processar sinal:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// Função auxiliar para enviar no Telegram
async function enviarTelegram(chat_id, texto) {
    try {
        await axios.post(urlTelegram, {
            chat_id: chat_id,
            text: texto,
            parse_mode: 'Markdown'
        });
        console.log(`✅ Sinal enviado para ${chat_id}`);
    } catch (err) {
        console.error(`❌ Erro Telegram ${chat_id}:`, err.response?.data || err.message);
    }
}

// Rota de teste
app.get('/', (req, res) => {
    res.send('🟢 Servidor SMC Pro Ativo - Aguardando sinais do MT5');
});

// Inicia servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT} - Pronto para receber sinais do MT5`);
});