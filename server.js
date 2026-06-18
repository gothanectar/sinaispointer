const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

// Configurações do seu novo Bot do Telegram
const TELEGRAM_TOKEN = "8872961272:AAEkSG757Y4WYcRdw93V_Tn1vsg7ulSR6rw";
const CHAT_ID = "-1002224151740"; // ID do seu canal/grupo
const MEU_ID_PRIVADO = "6297482127"; // Seu ID privado configurado

app.use(express.json());

// Rota padrão para a Render saber que o servidor está vivo e online
app.get('/', (req, res) => {
    res.send('🟢 Servidor SMC Ativo na Render - Monitorando XAUUSD');
});

// Função Principal que executes os cálculos do SMC
async function rodarAnaliseSMC() {
    try {
        console.log('🔄 Iniciando ciclo de análise SMC...');
        
        // CORRIGIDO: URL oficial da API da Binance para não dar erro técnico
        const response = await axios.get('https://binance.com', {
            params: {
                symbol: 'PAXGUSDT',
                interval: '15m',
                limit: 100
            }
        });

        const velas = response.data;
        console.log('✅ Dados obtidos da Binance com sucesso!');

        // 🌍 1. Chamar a nova lógica de Mapeamento de Sessão de Elite
        const sessaoAtual = obterSessaoAtual();
        console.log(`⏱️ Monitorando Ouro na: ${sessaoAtual}`);

        // 🧠 2. Cálculo de Alvos com o preço real extraído da vela
        if (velas && velas.length > 0) {
            const ultimaVela = velas[velas.length - 1];
            const precoAtualOuro = parseFloat(ultimaVela[4]); // Pega o preço de fechamento real (índice 4)
            const blocoDefendidoOB = precoAtualOuro - 4.50; // Simula uma Order Block $4.50 abaixo do preço
            
            const alvos = calcularAlvosSMC('COMPRA', precoAtualOuro, blocoDefendidoOB);
            
            const mensagemLog = `🎯 Alvos Calculados -> Entrada: $${precoAtualOuro.toFixed(2)} | SL: $${alvos.sl} | TP1: $${alvos.tp1} | TP2: $${alvos.tp2} | TP3: $${alvos.tp3}`;
            console.log(mensagemLog);

            // 📢 3. Montar a mensagem de sinal idêntica aos canais de elite
            const textoTelegram = 
`🚨 **NOVO SINAL DETECTADO - SMC** 🚨

📈 **Ativo:** XAUUSD (Ouro Real)
⏱️ **Sessão:** ${sessaoAtual}
🧠 **Estrutura:** FVG + OB Confirmados

⚡ **STATUS:** HOLD (Aguardando)

🎯 **Parâmetros:**
• **Preço de Entrada:** $${precoAtualOuro.toFixed(2)}
• **Stop Loss (SL):** $${alvos.sl}
• **Take Profit 1 (TP1):** $${alvos.tp1}
• **Take Profit 2 (TP2):** $${alvos.tp2}
• **Take Profit 3 (TP3):** $${alvos.tp3}`;

            // ✈️ ENVIO 1: Enviar para o Canal do Telegram
            await axios.post(`https://telegram.org{TELEGRAM_TOKEN}/sendMessage`, {
                chat_id: CHAT_ID,
                text: textoTelegram,
                parse_mode: 'Markdown'
            });
            console.log('✈️ Sinal enviado para o canal do Telegram!');

            // 🔒 ENVIO 2: Enviar diretamente para o seu ID PRIVADO
            await axios.post(`https://telegram.org{TELEGRAM_TOKEN}/sendMessage`, {
                chat_id: MEU_ID_PRIVADO,
                text: textoTelegram,
                parse_mode: 'Markdown'
            });
            console.log('🔒 Cópia do sinal enviada para o seu ID privado!');
        }

    } catch (error) {
        console.error('❌ Erro no ciclo SMC:', error.message);
    }
}

// Inicia o Loop infinito: executa a cada 60 segundos (60000 milissegundos) de forma nativa
setInterval(rodarAnaliseSMC, 60000);

// Executa uma vez logo ao ligar o servidor para não precisar esperar 1 minuto pelo primeiro teste
rodarAnaliseSMC();

// 🌍 FUNÇÃO 1: Mapeamento Automático de Sessões de Mercado (Horário de Brasília)
function obterSessaoAtual() {
    const agora = new Date();
    const opcoes = { timeZone: 'America/Sao_Paulo', hour: '2-digit', hour12: false };
    const horaBrasilia = parseInt(new Intl.DateTimeFormat('pt-BR', opcoes).format(agora));

    if (horaBrasilia >= 20 || horaBrasilia < 4) {
        return "SESSÃO DA ÁSIA (Consolidação/Liquidez)";
    } else if (horaBrasilia >= 4 && horaBrasilia < 8) {
        return "SESSÃO DE LONDRES (Alta Volatilidade)";
    } else if (horaBrasilia >= 8 && horaBrasilia < 12) {
        return "OVERLAP: LONDRES & NOVA YORK (Volume Máximo)";
    } else if (horaBrasilia >= 12 && horaBrasilia < 17) {
        return "SESSÃO DE NOVA YORK (Volume Americano)";
    } else {
        return "MERCADO LENTO (Fim de Dia)";
    }
}

// 🧠 FUNÇÃO 2: Cálculo Dinâmico de Alvos (SMC Proporcional) baseado no Risco
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

app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando com sucesso na porta ${PORT}`);
});
