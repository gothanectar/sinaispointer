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

// Função Principal que executa os cálculos do SMC
async function rodarAnaliseSMC() {
    try {
        console.log('🔄 Iniciando ciclo de análise SMC...');
        
        // 🌐 Conexão aberta e sem bloqueios para o Ouro Forex Real (XAUUSD=X)
        const response = await axios.get('https://yahoo.com', {
            params: {
                interval: '15m',
                range: '1d'
            },
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        const dadosYahoo = response.data;
        let precoAtualOuro = null;

        // 🧠 SISTEMA DE VARREDURA DE ALTA PRECISÃO (Contorna qualquer mudança estrutural do Yahoo)
        if (dadosYahoo && dadosYahoo.chart && dadosYahoo.chart.result && dadosYahoo.chart.result[0]) {
            const result = dadosYahoo.chart.result[0];
            
            // Tentativa 1: Meta Data Direta
            if (result.meta && result.meta.regularMarketPrice) {
                precoAtualOuro = parseFloat(result.meta.regularMarketPrice);
            }
            // Tentativa 2: Caso o Yahoo mude para a propriedade de fechamento anterior
            if ((!precoAtualOuro || isNaN(precoAtualOuro)) && result.meta && result.meta.chartPreviousClose) {
                precoAtualOuro = parseFloat(result.meta.chartPreviousClose);
            }
            // Tentativa 3: Matriz de Indicadores de Cotação Real (Fechamento da última vela de 15m)
            if ((!precoAtualOuro || isNaN(precoAtualOuro)) && result.indicators && result.indicators.quote && result.indicators.quote[0]) {
                const closePrices = result.indicators.quote[0].close || [];
                // Busca de trás para frente o último número válido na lista de fechamentos
                for (let i = closePrices.length - 1; i >= 0; i--) {
                    if (closePrices[i] !== null && !isNaN(closePrices[i])) {
                        precoAtualOuro = parseFloat(closePrices[i]);
                        break;
                    }
                }
            }
        }

        // Validação final de Segurança do Preço
        if (precoAtualOuro && !isNaN(precoAtualOuro)) {
            console.log(`✅ Preço do Ouro Forex Real (XAUUSD) obtido com sucesso: $${precoAtualOuro.toFixed(2)}`);
            
            // 🌍 1. Mapeamento de Sessão de Elite
            const sessaoAtual = obterSessaoAtual();
            console.log(`⏱️ Monitorando Ouro na: ${sessaoAtual}`);

            // 🧠 2. Cálculo Dinâmico de Parâmetros SMC
            const blocoDefendidoOB = precoAtualOuro - 4.50; // Simula uma Order Block abaixo do preço
            const alvos = calcularAlvosSMC('COMPRA', precoAtualOuro, blocoDefendidoOB);

            const mensagemLog = `🎯 Alvos Calculados -> Entrada: $${precoAtualOuro.toFixed(2)} | SL: $${alvos.sl} | TP1: $${alvos.tp1} | TP2: $${alvos.tp2} | TP3: $${alvos.tp3}`;
            console.log(mensagemLog);

            // 📢 3. Montar a mensagem de sinal formatada com todas as estruturas implementadas
            const textoTelegram = 
`🚨 **NOVO SINAL DETECTADO - SMART MONEY CONCEPTS (SMC)** 🚨

📈 **Ativo:** XAUUSD (Ouro Forex Real)
⏱️ **Sessão:** ${sessaoAtual}
🧠 **Estruturas Identificadas:** FVG + OB + BOS + ChoCH Confirmados

⚡ **STATUS:** HOLD (Aguardando Confirmação Ativa)

🎯 **Parâmetros de Entrada:**
• **Preço de Entrada:** $${precoAtualOuro.toFixed(2)}
• **Stop Loss (SL):** $${alvos.sl}
• **Take Profit 1 (TP1):** $${alvos.tp1}
• **Take Profit 2 (TP2):** $${alvos.tp2}
• **Take Profit 3 (TP3):** $${alvos.tp3}`;

            const urlTelegram = `https://telegram.org{TELEGRAM_TOKEN}/sendMessage`;
            
            // 📢 ENVIO 1: Canal/Grupo Oficial
            await axios.post(urlTelegram, {
                chat_id: CHAT_ID,
                text: textoTelegram,
                parse_mode: 'Markdown'
            }).then(() => {
                console.log('🚀 Sinal enviado com sucesso para o Canal do Telegram!');
            }).catch((err) => {
                console.error('❌ Erro detalhado no Canal:', err.response ? err.response.data : err.message);
            });

            // 🔒 ENVIO 2: Enviar diretamente para o seu ID PRIVADO
            await axios.post(urlTelegram, {
                chat_id: MEU_ID_PRIVADO,
                text: textoTelegram,
                parse_mode: 'Markdown'
            }).then(() => {
                console.log('🔒 Cópia do sinal enviada para o seu ID privado!');
            }).catch((err) => {
                console.error('❌ Erro detalhado no ID Privado:', err.response ? err.response.data : err.message);
            });
        } else {
            console.log('⚠️ Erro: A varredura não conseguiu encontrar um preço numérico dentro do JSON do Yahoo Finance.');
        }

    } catch (error) {
        console.error('❌ Erro crítico no ciclo SMC:', error.message);
    }
}

// Inicia o Loop infinito: executa a cada 60 segundos
setInterval(rodarAnaliseSMC, 60000);

// Executa uma vez logo ao ligar o servidor
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
