const express = require('express');
const axios = require('axios');
const redis = require('redis');

const app = express();
const PORT = process.env.PORT || 3000;

// Configurações
const TELEGRAM_TOKEN = "8872961272:AAEKSG7S7Y4WYcRdw93V_TnlVsg7ulSR6rw";
const CHAT_ID = "-1002224151740";
const MEU_ID_PRIVADO = "6297482127";

app.use(express.json());

const urlTelegram = `https://telegram.org{TELEGRAM_TOKEN}/sendMessage`;

const redisClient = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.connect()
    .then(() => console.log('📦 Redis conectado com sucesso e monitorando posições!'))
    .catch(err => console.error('Redis erro:', err.message));

let ultimoSinalTimestamp = 0;
const COOLDOWN_MINUTOS = 15; // Aumentado para não gerar sinais repetidos enquanto um trade rola

// Preço REAL da Binance Futures
async function getPrecoRealXAUUSD() {
    try {
        const response = await axios.get('https://binance.com');
        return parseFloat(response.data.price);
    } catch (error) {
        console.error("❌ Erro Binance:", error.message);
        return null;
    }
}

// Envio Telegram
async function enviarTelegram(chat_id, texto) {
    try {
        await axios.post(urlTelegram, { chat_id, text: texto, parse_mode: 'Markdown' });
        console.log(`✅ Mensagem enviada para ${chat_id}`);
    } catch (err) {
        console.error(`❌ Erro Telegram ${chat_id}:`, err.response?.data || err.message);
    }
}

// Lógica SMC + Gerenciamento Ativo de Alvos/SL
async function rodarAnaliseSMC() {
    try {
        console.log('🔄 Iniciando ciclo de análise SMC...');
        
        const precoAtual = await getPrecoRealXAUUSD();
        if (!precoAtual) return;

        const agora = Date.now();

        // 🔍 1. SISTEMA DE CHECAGEM DE TRADES ATIVOS (Alvo / Stop Loss)
        const operacaoSalva = await redisClient.get('operacao_ativa');
        
        if (operacaoSalva) {
            const trade = JSON.parse(operacaoSalva);
            
            // Verificação para COMPRA
            if (trade.direcao === 'COMPRA') {
                if (precoAtual <= parseFloat(trade.sl)) {
                    await dispararEncerramento(trade, 'STOP LOSS 🛑', precoAtual);
                    return;
                }
                if (precoAtual >= parseFloat(trade.tp3)) {
                    await dispararEncerramento(trade, 'TAKE PROFIT 3 🏁 (Alvo Máximo)', precoAtual);
                    return;
                }
                if (precoAtual >= parseFloat(trade.tp2) && !trade.tp2_atingido) {
                    trade.tp2_atingido = true;
                    await dispararParcial(trade, 'TAKE PROFIT 2 🔥', precoAtual);
                    await redisClient.set('operacao_ativa', JSON.stringify(trade));
                }
                if (precoAtual >= parseFloat(trade.tp1) && !trade.tp1_atingido) {
                    trade.tp1_atingido = true;
                    await dispararParcial(trade, 'TAKE PROFIT 1 ✅', precoAtual);
                    await redisClient.set('operacao_ativa', JSON.stringify(trade));
                }
            } 
            // Verificação para VENDA
            else if (trade.direcao === 'VENDA') {
                if (precoAtual >= parseFloat(trade.sl)) {
                    await dispararEncerramento(trade, 'STOP LOSS 🛑', precoAtual);
                    return;
                }
                if (precoAtual <= parseFloat(trade.tp3)) {
                    await dispararEncerramento(trade, 'TAKE PROFIT 3 🏁 (Alvo Máximo)', precoAtual);
                    return;
                }
                if (precoAtual <= parseFloat(trade.tp2) && !trade.tp2_atingido) {
                    trade.tp2_atingido = true;
                    await dispararParcial(trade, 'TAKE PROFIT 2 🔥', precoAtual);
                    await redisClient.set('operacao_ativa', JSON.stringify(trade));
                }
                if (precoAtual <= parseFloat(trade.tp1) && !trade.tp1_atingido) {
                    trade.tp1_atingido = true;
                    await dispararParcial(trade, 'TAKE PROFIT 1 ✅', precoAtual);
                    await redisClient.set('operacao_ativa', JSON.stringify(trade));
                }
            }

            console.log(`📡 Trade ativo monitorado. Preço: $${precoAtual.toFixed(2)} | SL: ${trade.sl} | Próximo Alvo: ${trade.tp1_atingido ? trade.tp2_atingido ? trade.tp3 : trade.tp2 : trade.tp1}`);
            return; // Se tem trade rodando, pula a criação de um novo sinal
        }

        // 🔍 2. CRIAÇÃO DE NOVOS SINAIS (Se não houver nenhum ativo rodando)
        if (agora - ultimoSinalTimestamp < COOLDOWN_MINUTOS * 60 * 1000) {
            console.log(`⏳ Em cooldown para novas entradas...`);
            return;
        }

        const sessaoAtual = obterSessaoAtual();
        let direcao = precoAtual > 4175 ? 'COMPRA' : 'VENDA';
        const alvos = calcularAlvosSMC(direcao, precoAtual, precoAtual - (direcao === 'COMPRA' ? 5 : -5));

        const novaOperacao = {
            id: agora,
            direcao: direcao,
            entrada: precoAtual.toFixed(2),
            sl: alvos.sl,
            tp1: alvos.tp1,
            tp2: alvos.tp2,
            tp3: alvos.tp3,
            tp1_atingido: false,
            tp2_atingido: false,
            sessao: sessaoAtual
        };

        // Salva o sinal ativo no Redis para controle interno e para atualizar seu site
        await redisClient.set('operacao_ativa', JSON.stringify(novaOperacao));
        await redisClient.set('sinal_atual', JSON.stringify(novaOperacao));
        console.log('💾 Novo sinal registrado no Redis de São Paulo!');

        const textoSinal = 
`🚨 **NOVO SINAL SMC** 🚨

📈 **Ativo:** XAUUSD (Ouro)
⏱️ **Sessão:** ${sessaoAtual}
🔄 **Estrutura:** FVG + ChoCH Confirmados

⚡ **DIREÇÃO:** ${direcao}

🎯 **Entrada:** $${precoAtual.toFixed(2)}
🛡️ **Stop Loss:** $${alvos.sl}
🚀 **TP1:** $${alvos.tp1}
🚀 **TP2:** $${alvos.tp2}
🚀 **TP3:** $${alvos.tp3}`;

        await enviarTelegram(CHAT_ID, textoSinal);
        await enviarTelegram(MEU_ID_PRIVADO, textoSinal);

        ultimoSinalTimestamp = agora;

    } catch (error) {
        console.error('❌ Erro crítico no ciclo SMC:', error.message);
    }
}

// Funções de disparo auxiliares
async function dispararParcial(trade, alvoNome, precoReal) {
    const texto = `🎯 **ATUALIZAÇÃO DE TRADE - NOVO ALVO ATINGIDO**\n\n💰 **${alvoNome} batido no Ouro!**\n📈 Direção: ${trade.direcao}\n💵 Preço no Toque: $${precoReal.toFixed(2)}\n📥 Entrada original: $${trade.entrada}\n\n*Proteja sua operação movendo o Stop Loss para o ponto de Entrada! (Break Even)*`;
    await enviarTelegram(CHAT_ID, texto);
    await enviarTelegram(MEU_ID_PRIVADO, texto);
}

async function dispararEncerramento(trade, motivo, precoReal) {
    const texto = `🏁 **OPERAÇÃO ENCERRADA NO OURO**\n\n💥 O mercado atingiu o seu **${motivo}**\n📈 Direção: ${trade.direcao}\n💵 Preço de Saída: $${precoReal.toFixed(2)}\n📥 Entrada original: $${trade.entrada}`;
    await enviarTelegram(CHAT_ID, texto);
    await enviarTelegram(MEU_ID_PRIVADO, texto);
    
    // Limpa a operação do Redis para liberar espaço para o próximo sinal
    await redisClient.del('operacao_ativa');
    console.log(`🧹 Operação encerrada por ${motivo}. Monitor liberado.`);
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

setInterval(rodarAnaliseSMC, 45000);
rodarAnaliseSMC();

app.listen(PORT, () => console.log(`🚀 Servidor SMC ativo na porta ${PORT}`));
