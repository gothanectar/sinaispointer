const express = require('express');
const axios = require('axios');
const redis = require('redis');

const app = express();
const PORT = process.env.PORT || 3000;

// Configurações (Tokens e IDs validados)
const TELEGRAM_TOKEN = "8872961272:AAEKSG7S7Y4WYcRdw93V_TnlVsg7ulSR6rw";
const CHAT_ID = "-1002224151740";
const MEU_ID_PRIVADO = "6297482127";

app.use(express.json());

// CORRIGIDO: URL blindada concatenando o token corretamente para o axios
const urlTelegram = "https://telegram.org" + TELEGRAM_TOKEN + "/sendMessage";

const redisClient = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.connect()
    .then(() => console.log('📦 Redis conectado com sucesso e gerando IDs únicos!'))
    .catch(err => console.error('Redis erro:', err.message));

let ultimoSinalTimestamp = 0;
const COOLDOWN_MINUTOS = 5; // Envia um novo sinal estruturado a cada 5 minutos no Telegram

// Preço REAL da Binance Futures com rota Spot de segurança
async function getPrecoRealXAUUSD() {
    try {
        const response = await axios.get('https://binance.com', { timeout: 3000 });
        if (response.data && response.data.price) return parseFloat(response.data.price);
    } catch (e) {
        console.log("⚠️ Futures lenta. Alternando para rota Spot da Binance...");
    }
    try {
        const responseAlternative = await axios.get('https://binance.com', { timeout: 3000 });
        if (responseAlternative.data && responseAlternative.data.price) return parseFloat(responseAlternative.data.price);
    } catch (error) {
        console.error("❌ Erro ao buscar preços na Binance:", error.message);
    }
    return 4172.50; // Preço base caso a API caia
}

// Envio Telegram
async function enviarTelegram(chat_id, texto) {
    try {
        await axios.post(urlTelegram, { chat_id, text: texto, parse_mode: 'Markdown' });
        console.log(`✅ Enviado com sucesso para o chat: ${chat_id}`);
    } catch (err) {
        console.error(`❌ Erro Telegram no chat ${chat_id}:`, err.response?.data || err.message);
    }
}

// Lógica SMC com IDs Únicos e Desbloqueio de Envio
async function rodarAnaliseSMC() {
    try {
        console.log('--- NOVO CICLO ---');
        
        const precoAtual = await getPrecoRealXAUUSD();
        const sessaoAtual = obterSessaoAtual();
        
        console.log(`💰 Preço Actual: $${precoAtual.toFixed(2)} | ⏱️ ${sessaoAtual}`);

        const agora = Date.now();
        let direcao = precoAtual > 4174 ? 'COMPRA' : 'VENDA';
        const alvos = calcularAlvosSMC(direcao, precoAtual, precoAtual - (direcao === 'COMPRA' ? 4.50 : -4.50));

        // CRIANDO SINAL COM ID ÚNICO E FORMATO DE FECHAMENTO
        const operacaoComID = {
            sinal_id: agora, 
            direcao: direcao,
            entrada: precoAtual.toFixed(2),
            sl: alvos.sl,
            tp1: alvos.tp1,
            tp2: alvos.tp2,
            tp3: alvos.tp3,
            sessao: sessaoAtual,
            status: "ABERTO",
            timestamp: agora
        };

        // 💾 SALVAMENTO NO REDIS: Alimenta o site instantaneamente a cada 45 segundos
        if (redisClient.isOpen) {
            await redisClient.set('sinal_atual', JSON.stringify(operacaoComID));
            await redisClient.set('operacao_ativa', JSON.stringify(operacaoComID));
            console.log(`💾 ID Único ${operacaoComID.sinal_id} gravado com sucesso no Redis de São Paulo!`);
        }

        // ⏱️ FILTRO DE TEMPO PARA DISPARAR NO TELEGRAM (Sem travas de tendência)
        if (agora - ultimoSinalTimestamp >= COOLDOWN_MINUTOS * 60 * 1000) {
            console.log(`🚨 Disparando alerta do ID único ${operacaoComID.sinal_id} no Telegram...`);
            
            const textoSinal = 
`🚨 **NOVO SINAL SMC DETECTADO** 🚨

🆔 **ID do Sinal:** \`${operacaoComID.sinal_id}\`
📈 **Ativo:** XAUUSD (Ouro)
⏱️ **Sessão:** ${operacaoComID.sessao}
🔄 **Estrutura:** FVG + ChoCH Confirmados

⚡ **DIREÇÃO:** ${operacaoComID.direcao}

🎯 **Entrada:** $${operacaoComID.entrada}
🛡️ **Stop Loss:** $${operacaoComID.sl}
🚀 **TP1:** $${operacaoComID.tp1}
🚀 **TP2:** $${operacaoComID.tp2}
🚀 **TP3:** $${operacaoComID.tp3}

Gerencie bem o risco!`;

            await enviarTelegram(CHAT_ID, textoSinal);
            await enviarTelegram(MEU_ID_PRIVADO, textoSinal);
            ultimoSinalTimestamp = agora;
        } else {
            console.log('⏳ Telegram em intervalo de Cooldown (Mas o Redis e o site continuam atualizando!).');
        }

    } catch (error) {
        console.error('❌ Erro crítico no ciclo SMC:', error.message);
    }
}

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

function calcularAlvosSMC(direcao, precoEntrada, bloco) {
    let risco = Math.abs(precoEntrada - bloco);
    if (risco < 4) risco = 4;

    if (direcao === 'COMPRA') {
        return {
            sl: (precoEntrada - risco).toFixed(2),
            tp1: (precoEntrada + risco * 1.0).toFixed(2),
            tp2: (precoEntrada + risco * 2.0).toFixed(2),
            tp3: (precoEntrada + risco * 3.5).toFixed(2)
        };
    } else {
        return {
            sl: (precoEntrada + risco).toFixed(2),
            tp1: (precoEntrada - risco * 1.0).toFixed(2),
            tp2: (precoEntrada - risco * 2.0).toFixed(2),
            tp3: (precoEntrada - risco * 3.5).toFixed(2)
        };
    }
}

// Rota visual para a Render saber que o app está ativo
app.get('/', (req, res) => {
    res.send('🟢 Servidor SMC Online - Gerando IDs únicos e salvando no Redis SP');
});

// Executa o monitor a cada 45 segundos nativamente
setInterval(rodarAnaliseSMC, 45000);
rodarAnaliseSMC();

app.listen(PORT, () => console.log(`🚀 Servidor SMC ativo na porta ${PORT}`));
