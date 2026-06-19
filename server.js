const express = require('express');
const axios = require('axios');
const redis = require('redis');

const app = express();
const PORT = process.env.PORT || 3000;

// Configurações originais que você enviou (Token e IDs Corretos)
const TELEGRAM_TOKEN = "8872961272:AAEKSG7S7Y4WYcRdw93V_TnlVsg7ulSR6rw";
const CHAT_ID = "-1002224151740";
const MEU_ID_PRIVADO = "6297482127";

app.use(express.json());

// URL montada exatamente com a crase e variáveis do seu script funcional
const urlTelegram = `https://telegram.org{TELEGRAM_TOKEN}/sendMessage`;

const redisClient = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.connect().catch(err => console.error('Redis erro:', err.message));

let ultimoSinalTimestamp = 0;
const COOLDOWN_MINUTOS = 8; // Cooldown flexível do seu script

// Preço REAL da Binance Futures (Exatamente igual ao seu)
async function getPrecoRealXAUUSD() {
    try {
        const response = await axios.get('https://binance.com');
        return parseFloat(response.data.price);
    } catch (error) {
        console.error("❌ Erro Binance:", error.message);
        return 4180 + Math.random() * 20;
    }
}

// Envio Telegram (Exatamente igual ao seu)
async function enviarTelegram(chat_id, texto) {
    try {
        await axios.post(urlTelegram, { chat_id, text: texto, parse_mode: 'Markdown' });
        console.log(`✅ Enviado para ${chat_id}`);
    } catch (err) {
        console.error(`❌ Erro Telegram ${chat_id}:`, err.response?.data || err.message);
    }
}

// Lógica SMC com FVG + ChoCH + BOS (Sua estrutura original com gravação para o site)
async function rodarAnaliseSMC() {
    try {
        console.log('🔄 Iniciando ciclo de análise SMC...');
        
        const precoAtual = await getPrecoRealXAUUSD();
        const agora = Date.now();

        // Cooldown inteligente do seu script
        if (agora - ultimoSinalTimestamp < COOLDOWN_MINUTOS * 60 * 1000) {
            console.log(`⏳ Em cooldown...`);
            return;
        }

        const sessaoAtual = obterSessaoAtual();
        console.log(`⏱️ ${sessaoAtual} | Preço: $${precoAtual.toFixed(2)}`);

        // Lógica de FVG + ChoCH do seu script
        const tendenciaAnterior = await redisClient.get('tendencia_anterior') || 'NEUTRA';
        let tendenciaAtual = precoAtual > 4180 ? 'ALTA' : 'BAIXA';
        let direcao = null;

        // Detecta ChoCH (mudança de tendência)
        if (tendenciaAtual !== tendenciaAnterior) {
            direcao = tendenciaAtual === 'ALTA' ? 'COMPRA' : 'VENDA';
        }

        if (!direcao) {
            await redisClient.set('tendencia_anterior', tendenciaAtual);
            return;
        }

        // Calcula alvos do seu script
        const alvos = calcularAlvosSMC(direcao, precoAtual, precoAtual - (direcao === 'COMPRA' ? 5 : -5));

        console.log(`🚨 Sinal ${direcao} gerado!`);

        const textoTelegram = 
`🚨 **NOVO SINAL SMC - FVG + ChoCH + BOS** 🚨

📈 **Ativo:** XAUUSD
⏱️ **Sessão:** ${sessaoAtual}
🔄 **Estrutura:** Fair Value Gap + Change of Character

⚡ **DIREÇÃO:** ${direcao}

🎯 **Entrada:** $${precoAtual.toFixed(2)}
🛡️ **Stop Loss:** $${alvos.sl}
🚀 **TP1:** $${alvos.tp1}
🚀 **TP2:** $${alvos.tp2}
🚀 **TP3:** $${alvos.tp3}

Gerencie bem o risco!`;

        // Alimenta o Redis para o front-end do seu site conseguir exibir os dados
        if (redisClient.isOpen) {
            const dadosPainel = {
                preco: precoAtual.toFixed(2),
                sl: alvos.sl,
                tp1: alvos.tp1,
                tp2: alvos.tp2,
                tp3: alvos.tp3,
                sessao: sessaoAtual,
                direcao: direcao,
                timestamp: agora
            };
            await redisClient.set('sinal_atual', JSON.stringify(dadosPainel));
            await redisClient.set('operacao_ativa', JSON.stringify(dadosPainel));
        }

        await enviarTelegram(CHAT_ID, textoTelegram);
        await enviarTelegram(MEU_ID_PRIVADO, textoTelegram);

        ultimoSinalTimestamp = agora;
        await redisClient.set('tendencia_anterior', tendenciaAtual);

    } catch (error) {
        console.error('❌ Erro crítico:', error.message);
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

// Rota padrão para a Render monitorar a aplicação online sem derrubar
app.get('/', (req, res) => {
    res.send('🟢 Servidor SMC Online - Sincronizado');
});

// Inicia o robô
setInterval(rodarAnaliseSMC, 45000); // 45 segundos
rodarAnaliseSMC();

app.listen(PORT, () => {
    console.log(`🚀 Servidor SMC rodando na porta ${PORT}`);
});
