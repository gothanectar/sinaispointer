const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

// Configurações do seu novo Bot do Telegram
const TELEGRAM_TOKEN = "8872961272:AAEkSG757Y4WYcRdw93V_Tn1vsg7ulSR6rw";
const CHAT_ID = "-1002224151740"; // Seu ID de canal ou chat (Ajuste se necessário)

app.use(express.json());

// Rota padrão para a Render saber que o servidor está vivo e online
app.get('/', (req, res) => {
    res.send('🟢 Servidor SMC Ativo na Render - Monitorando XAUUSD');
});

// Função Principal que executa os cálculos do SMC
// Função Principal que executa os cálculos do SMC
async function rodarAnaliseSMC() {
    try {
        console.log('🔄 Iniciando ciclo de análise SMC...');
        
                // CORRIGIDO: URL oficial da API de klines (velas) da Binance
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

        // 🧠 2. Exemplo de teste do cálculo automático de TP/SL de SMC (Simulando uma Compra)
        if (velas && velas.length > 0) {
            const ultimaVela = velas[velas.length - 1];
            const precoAtualOuro = parseFloat(ultimaVela[4]); // Pega o preço de fechamento atual
            const blocoDefendidoOB = precoAtualOuro - 4.50; // Simula uma Order Block $4.50 abaixo do preço
            
            const alvos = calcularAlvosSMC('COMPRA', precoAtualOuro, blocoDefendidoOB);
            console.log(`🎯 Teste de Alvos Dinâmicos -> Entrada: $${precoAtualOuro.toFixed(2)} | SL: $${alvos.sl} | TP1: $${alvos.tp1} | TP2: $${alvos.tp2} | TP3: $${alvos.tp3}`);
        }

        // Lógica de monitoramento de FVG, OB, BOS e ChoCH simulada ou puxada do seu script principal
        // Aqui o sistema faz o cruzamento matemático das velas estruturadas

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
    // Força o fuso horário para o de Brasília (UTC-3) para não dar erro na nuvem da Render (Europa)
    const opcoes = { timeZone: 'America/Sao_Paulo', hour: '2-digit', hour12: false };
    const horaBrasilia = parseInt(new Intl.DateTimeFormat('pt-BR', opcoes).format(agora));

    // Sessão de Tóquio/Ásia: 20:00 às 04:00 (Foco em consolidação e caça de liquidez)
    if (horaBrasilia >= 20 || horaBrasilia < 4) {
        return "SESSÃO DA ÁSIA (Consolidação/Liquidez)";
    }
    // Sessão de Londres: 04:00 às 12:00 (Início da tendência forte do Ouro)
    else if (horaBrasilia >= 4 && horaBrasilia < 8) {
        return "SESSÃO DE LONDRES (Alta Volatilidade)";
    }
    // Sessão de Nova York + Londres (Overlap): 08:00 às 12:00 (O pico mais violento do dia)
    else if (horaBrasilia >= 8 && horaBrasilia < 12) {
        return "OVERLAP: LONDRES & NOVA YORK (Volume Máximo)";
    }
    // Sessão de Nova York Solo: 12:00 às 17:00 (Continuação ou Reversão do dia)
    else if (horaBrasilia >= 12 && horaBrasilia < 17) {
        return "SESSÃO DE NOVA YORK (Volume Americano)";
    }
    // Fechamento/Inércia do mercado
    else {
        return "MERCADO LENTO (Fim de Dia)";
    }
}

// 🧠 FUNÇÃO 2: Cálculo Dinâmico de Alvos (SMC Proporcional) baseado no Risco
function calcularAlvosSMC(tipoOperacao, precoEntrada, blocoExtremo) {
    // Calcula o risco com base no tamanho do bloco de FVG ou Order Block defendido
    let risco = Math.abs(precoEntrada - blocoExtremo);
    
    // Filtro de segurança: se o bloco for muito pequeno, define um risco mínimo de $2.50 no Ouro
    if (risco < 2.50) risco = 2.50;

    let stopLoss, tp1, tp2, tp3;

    if (tipoOperacao === 'COMPRA') {
        stopLoss = precoEntrada - risco;
        tp1 = precoEntrada + (risco * 1.0); // Realiza parcial e protege a entrada (Break Even)
        tp2 = precoEntrada + (risco * 2.0); // Alvo intermediário da estrutura
        tp3 = precoEntrada + (risco * 3.5); // Surfa a tendência institucional longa
    } else { // VENDA
        stopLoss = precoEntrada + risco;
        tp1 = precoEntrada - (risco * 1.0);
        tp2 = precoEntrada - (risco * 2.0);
        tp3 = precoEntrada - (risco * 3.5);
    }

    // Formata todos os números para 2 casas decimais padrão do Ouro ($4200.00)
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
