const express = require('express');
const axios = require('axios');
const redis = require('redis');

const app = express();
const PORT = process.env.PORT || 3000;

// Configurações do seu bot (Mantenha as suas credenciais seguras)
const TELEGRAM_TOKEN = "8872961272:AAEKSG7S7Y4WYcRdw93V_TnlVsg7ulSR6rw";
const CHAT_ID = "-1002224151740";
const MEU_ID_PRIVADO = "6297482127";

app.use(express.json()); // Essencial para ler o JSON que o MT5 envia

const urlTelegram = `https://telegram.org{TELEGRAM_TOKEN}/sendMessage`;

// Inicialização do Redis (opcional para logs, mas mantido da estrutura da Grok)
const redisClient = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});
redisClient.connect().catch(err => console.error('Redis erro:', err.message));

// Função auxiliar para envio de mensagens
async function enviarTelegram(chat_id, texto) {
    try {
        await axios.post(urlTelegram, { chat_id, text: texto, parse_mode: 'Markdown' });
        console.log(`✅ Enviado para o Telegram (${chat_id})`);
    } catch (err) {
        console.error(`❌ Erro Telegram ${chat_id}:`, err.response?.data || err.message);
    }
}

// 🌐 ROTA QUE RECEBE OS SINAIS REAIS DO METATRADER 5
app.post('/nova-ordem', async (req, res) => {
    try {
        // Coleta os dados puramente REAIS calculados pelo robô do MT5
        const { symbol, action, price, sl } = req.body;

        if (!symbol || !action || !price || !sl) {
            return res.status(400).send("Dados incompletos enviados pelo MT5.");
        }

        console.log(`📥 Sinal Real recebido do MT5: ${action} em ${symbol} a $${price}`);

        const sessaoAtual = obterSessaoAtual();
        
        // Calcula os TPs matemáticos proporcionais ao risco real do stop técnico
        const direcaoSinal = action === 'BUY' ? 'COMPRA' : 'VENDA';
        const alvos = calcularAlvosSMC(direcaoSinal, price, sl);

        // Monta o layout de mensagem profissional
        const textoTelegram = 
`🚨 **NOVA OPERAÇÃO EXECUTADA NO MT5** 🚨

📈 **Ativo:** ${symbol}
⏱️ **Sessão:** ${sessaoAtual}
🔄 **Estrutura:** Fair Value Gap + Order Block Real

⚡ **DIREÇÃO:** ${action === 'BUY' ? '🟢 COMPRA (BUY)' : '🔴 VENDA (SELL)'}

🎯 **Preço de Entrada:** $${price.toFixed(2)}
🛡️ **Stop Loss Técnico:** $${parseFloat(sl).toFixed(2)}

🚀 **Alvo Parcial 1 (1:1):** $${alvos.tp1}
🚀 **Alvo Parcial 2 (1:2):** $${alvos.tp2}
🚀 **Alvo Principal 3 (1:3):** $${alvos.tp3}

_Operação aberta de forma automática via Expert Advisor._`;

        // Dispara simultaneamente para o grupo e para o seu privado
        await enviarTelegram(CHAT_ID, textoTelegram);
        await enviarTelegram(MEU_ID_PRIVADO, textoTelegram);

        // Responde ao MetaTrader com sucesso (Status 200) para ele saber que deu certo
        res.status(200).send("Sinal processado e enviado para o ecossistema!");

    } catch (error) {
        console.error('❌ Erro no processamento da rota:', error.message);
        res.status(500).send("Erro interno no servidor.");
    }
});

// Identifica dinamicamente a sessão do mercado financeiro mundial
function obterSessaoAtual() {
    const agora = new Date();
    const opcoes = { timeZone: 'America/Sao_Paulo', hour: '2-digit', hour12: false };
    const hora = parseInt(new Intl.DateTimeFormat('pt-BR', opcoes).format(agora));

    if (hora >= 20 || hora < 4) return "SESSÃO DA ÁSIA";
    else if (hora >= 4 && hora < 8) return "SESSÃO DE LONDRES";
    else if (hora >= 8 && hora < 12) return "OVERLAP LONDRES/NY";
    else if (hora >= 12 && hora < 17) return "SESSÃO DE NOVA YORK";
    else return "MERCADO LENTO";
}

// Cria alvos baseados na volatilidade e risco real capturado no gráfico do MT5
function calcularAlvosSMC(direcao, precoEntrada, stopLoss) {
    let risco = Math.abs(precoEntrada - stopLoss);
    if (risco < 2) risco = 2; // Filtro mínimo de pontos para o Ouro

    if (direcao === 'COMPRA') {
        return {
            tp1: (precoEntrada + risco * 1.0).toFixed(2),
            tp2: (precoEntrada + risco * 2.0).toFixed(2),
            tp3: (precoEntrada + risco * 3.0).toFixed(2)
        };
    } else {
        return {
            tp1: (precoEntrada - risco * 1.0).toFixed(2),
            tp2: (precoEntrada - risco * 2.0).toFixed(2),
            tp3: (precoEntrada - risco * 3.0).toFixed(2)
        };
    }
}

// Inicializa a escuta do servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor pronto e aguardando ordens do MT5 na porta ${PORT}`);
});
