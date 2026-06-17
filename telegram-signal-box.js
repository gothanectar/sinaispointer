// ========================================================
// TELEGRAM SIGNAL BOX v1.0 - Sistema Isolado de Sinais
// ========================================================

// Configurações do Telegram
const TELEGRAM_CONFIG = {
    botToken: '8872961272:AAEKSG7S7Y4WYcRdw93V_TnlVsg7u1SR6rw',
    chatId: '@TradepulseBotFx', // Canal do usuário
    enabled: true // Sempre ativo para teste
};

// Estado do sistema
let signalState = {
    lastSignalTime: 0,
    signalLockTime: 0, // 0 = sem limite para teste
    lastSoundTime: 0,
    soundLockTime: 30000, // 30 segundos entre avisos sonoros
    soundEnabled: true,
    signals: [],
    isProcessing: false,
    currentSignal: null, // Sinal atual com SL e TPs
    signalActive: false, // Se o sinal ainda está ativo (não atingiu SL/TP)
    monitoringInterval: null, // Intervalo para monitoramento de TP/SL
    idsSinaisProcessados: new Set() // Lista de proteção contra loops de repetição
};

// Variáveis locais para ler sinais dos gráficos (não conflita com variáveis globais)
let telegramFVGs = [];
let telegramOBs = [];

// ========================================================
// CRIAÇÃO DO BOX DE TELEGRAM
// ========================================================
function criarTelegramSignalBox() {
    console.log('🔧 Iniciando criação do Telegram Signal Box...');
    
    // Verificar se o box já existe
    if (document.getElementById('telegram-signal-box')) {
        console.log('⚠️ Box de Telegram já existe');
        return;
    }

    const box = document.createElement('div');
    box.id = 'telegram-signal-box';
    console.log('📦 Elemento div criado');
    
    box.innerHTML = `
        <div class="telegram-box-container">
            <div class="telegram-header">
                <h3>📱 Telegram Signal Box</h3>
                <div class="telegram-controls">
                    <button id="telegram-sound-toggle" class="telegram-btn sound-on">🔊</button>
                    <button id="telegram-enable-toggle" class="telegram-btn enable-off">📴</button>
                </div>
            </div>
            
            <div class="telegram-status">
                <div class="status-indicator" id="telegram-status-indicator"></div>
                <span id="telegram-status-text">Sistema inativo</span>
            </div>

            <div class="telegram-config">
                <label for="telegram-chat-id">Chat ID do Telegram:</label>
                <input type="text" id="telegram-chat-id" placeholder="@seu_canal" value="${TELEGRAM_CONFIG.chatId}">
                <button id="telegram-save-config" class="telegram-btn save">Salvar</button>
            </div>

            <div class="telegram-signals-log">
                <h4>📋 Histórico de Sinais</h4>
                <div id="telegram-signals-list">
                    <p class="no-signals">Nenhum sinal enviado ainda</p>
                </div>
            </div>

            <div class="telegram-current-signal">
                <h4>🎯 Sinal Atual</h4>
                <div id="telegram-current-signal-details">
                    <p class="no-signal">Aguardando sinal...</p>
                </div>
            </div>

            <div class="telegram-info">
                <p>⏰ Horário de operação: 06:00 - 18:00</p>
                <p>🔒 Limite: 1 sinal por hora</p>
                <p>📊 Ativo: PAXGUSDT (Ouro)</p>
            </div>
        </div>
    `;
    console.log('📝 HTML interno definido');

    // Verificar se document.body existe
    if (!document.body) {
        console.error('❌ document.body não existe!');
        return;
    }
    console.log('✅ document.body existe');

    // Adicionar estilos
    const style = document.createElement('style');
    style.textContent = `
        #telegram-signal-box {
            position: fixed;
            bottom: 20px;
            left: 20px;
            width: 350px;
            background: linear-gradient(135deg, #1a1a2e, #16213e);
            border: 2px solid #00d2ff;
            border-radius: 12px;
            padding: 15px;
            box-shadow: 0 8px 32px rgba(0, 210, 255, 0.3);
            z-index: 10000;
            font-family: 'Arial', sans-serif;
            color: #fff;
        }

        .telegram-box-container {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .telegram-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-bottom: 10px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .telegram-header h3 {
            margin: 0;
            font-size: 16px;
            color: #00d2ff;
            font-weight: bold;
        }

        .telegram-controls {
            display: flex;
            gap: 8px;
        }

        .telegram-btn {
            padding: 8px 12px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.3s ease;
            background: rgba(255, 255, 255, 0.1);
            color: #fff;
        }

        .telegram-btn:hover {
            transform: scale(1.05);
        }

        .telegram-btn.sound-on {
            background: #4CAF50;
        }

        .telegram-btn.sound-off {
            background: #666;
        }

        .telegram-btn.enable-on {
            background: #2196F3;
        }

        .telegram-btn.enable-off {
            background: #666;
        }

        .telegram-btn.save {
            background: #FF9800;
        }

        .telegram-status {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 6px;
        }

        .status-indicator {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: #666;
            animation: pulse 2s infinite;
        }

        .status-indicator.active {
            background: #4CAF50;
        }

        .status-indicator.inactive {
            background: #666;
            animation: none;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }

        .telegram-config {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .telegram-config label {
            font-size: 12px;
            color: #aaa;
        }

        .telegram-config input {
            padding: 8px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 6px;
            background: rgba(0, 0, 0, 0.3);
            color: #fff;
            font-size: 13px;
        }

        .telegram-config input:focus {
            outline: none;
            border-color: #00d2ff;
        }

        .telegram-signals-log {
            max-height: 200px;
            overflow-y: auto;
            background: rgba(0, 0, 0, 0.2);
            border-radius: 6px;
            padding: 10px;
        }

        .telegram-signals-log h4 {
            margin: 0 0 8px 0;
            font-size: 13px;
            color: #00d2ff;
        }

        .telegram-signals-log::-webkit-scrollbar {
            width: 6px;
        }

        .telegram-signals-log::-webkit-scrollbar-track {
            background: rgba(0, 0, 0, 0.3);
        }

        .telegram-signals-log::-webkit-scrollbar-thumb {
            background: #00d2ff;
            border-radius: 3px;
        }

        .signal-item {
            padding: 8px;
            margin-bottom: 6px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 4px;
            font-size: 12px;
            border-left: 3px solid #00d2ff;
        }

        .signal-item.buy {
            border-left-color: #4CAF50;
        }

        .signal-item.sell {
            border-left-color: #f44336;
        }

        .signal-item .signal-time {
            color: #888;
            font-size: 10px;
        }

        .signal-item .signal-type {
            font-weight: bold;
            margin-bottom: 4px;
        }

        .signal-item .signal-details {
            color: #aaa;
            font-size: 11px;
        }

        .no-signals {
            color: #666;
            font-size: 12px;
            text-align: center;
            padding: 10px;
        }

        .telegram-info {
            font-size: 11px;
            color: #888;
            line-height: 1.5;
        }

        .telegram-info p {
            margin: 4px 0;
        }
    `;

    document.head.appendChild(style);
    console.log('🎨 Estilos adicionados ao head');
    
    document.body.appendChild(box);
    console.log('📦 Box adicionado ao body');

    // Adicionar event listeners
    setupTelegramEventListeners();
    console.log('🎛️ Event listeners configurados');

    console.log('✅ Box de Telegram criado com sucesso');
}

// ========================================================
// CONFIGURAÇÃO DE EVENT LISTENERS
// ========================================================
function setupTelegramEventListeners() {
    const soundToggle = document.getElementById('telegram-sound-toggle');
    const enableToggle = document.getElementById('telegram-enable-toggle');
    const saveConfig = document.getElementById('telegram-save-config');
    const chatIdInput = document.getElementById('telegram-chat-id');

    if (soundToggle) {
        soundToggle.addEventListener('click', () => {
            signalState.soundEnabled = !signalState.soundEnabled;
            soundToggle.textContent = signalState.soundEnabled ? '🔊' : '🔇';
            soundToggle.className = signalState.soundEnabled ? 'telegram-btn sound-on' : 'telegram-btn sound-off';
            console.log('🔊 Som:', signalState.soundEnabled ? 'ativado' : 'desativado');
        });
    }

    if (enableToggle) {
        enableToggle.addEventListener('click', () => {
            TELEGRAM_CONFIG.enabled = !TELEGRAM_CONFIG.enabled;
            enableToggle.textContent = TELEGRAM_CONFIG.enabled ? '📶' : '📴';
            enableToggle.className = TELEGRAM_CONFIG.enabled ? 'telegram-btn enable-on' : 'telegram-btn enable-off';
            updateTelegramStatus();
            console.log('📱 Telegram:', TELEGRAM_CONFIG.enabled ? 'ativado' : 'desativado');
        });
    }

    if (saveConfig) {
        saveConfig.addEventListener('click', () => {
            TELEGRAM_CONFIG.chatId = chatIdInput.value;
            console.log('💾 Chat ID salvo:', TELEGRAM_CONFIG.chatId);
            alert('Configuração salva! Chat ID: ' + TELEGRAM_CONFIG.chatId);
        });
    }
}

// ========================================================
// ATUALIZAR STATUS DO TELEGRAM
// ========================================================
function updateTelegramStatus() {
    const statusIndicator = document.getElementById('telegram-status-indicator');
    const statusText = document.getElementById('telegram-status-text');

    if (!statusIndicator || !statusText) return;

    if (TELEGRAM_CONFIG.enabled) {
        statusIndicator.className = 'status-indicator active';
        statusText.textContent = 'Sistema ativo - Monitorando sinais';
    } else {
        statusIndicator.className = 'status-indicator inactive';
        statusText.textContent = 'Sistema inativo';
    }
}

// ========================================================
// SISTEMA DE AVISO SONORO
// ========================================================
function playAlertSound(type = 'default') {
    if (!signalState.soundEnabled) return;

    try {
        // Verificar lock de tempo entre avisos sonoros
        const timeSinceLastSound = Date.now() - signalState.lastSoundTime;
        if (timeSinceLastSound < signalState.soundLockTime && type === 'default') {
            console.log('🔊 Aviso sonoro em lock, aguardando', Math.round((signalState.soundLockTime - timeSinceLastSound) / 1000), 'segundos');
            return;
        }

        // Criar contexto de áudio
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();

        // Criar oscilador para o som
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Configurar som diferente baseado no tipo
        if (type === 'tp') {
            // Som de sucesso (TP atingido) - melodia ascendente
            oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.15);
            oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.3);
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
            console.log('🎵 Som de TP (sucesso) reproduzido');
        } else if (type === 'sl') {
            // Som de erro (SL atingido) - melodia descendente
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.15);
            oscillator.frequency.setValueAtTime(400, audioContext.currentTime + 0.3);
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
            console.log('🚨 Som de SL (erro) reproduzido');
        } else {
            // Som padrão de alerta (beep beep)
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
            console.log('🔊 Som de alerta reproduzido');
        }

        // Atualizar lock (exceto para TP/SL que são avisos importantes)
        if (type === 'default') {
            signalState.lastSoundTime = Date.now();
        }
    } catch (error) {
        console.error('Erro ao reproduzir som:', error);
    }
}

// ========================================================
// ENVIAR MENSAGEM PARA TELEGRAM
// ========================================================
async function sendTelegramMessage(message) {
    if (!TELEGRAM_CONFIG.enabled || !TELEGRAM_CONFIG.chatId || TELEGRAM_CONFIG.chatId === '@NOME_DO_SEU_CANAL_AQUI') {
        console.log('⚠️ Telegram não configurado ou desativado');
        return false;
    }

    const url = `https://api.telegram.org/bot${TELEGRAM_CONFIG.botToken}/sendMessage`;
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: TELEGRAM_CONFIG.chatId,
                text: message,
                parse_mode: 'HTML'
            })
        });

        const data = await response.json();
        
        if (data.ok) {
            console.log('✅ Mensagem enviada para Telegram com sucesso');
            return true;
        } else {
            console.error('❌ Erro ao enviar mensagem para Telegram:', data.description);
            return false;
        }
    } catch (error) {
        console.error('❌ Erro na requisição para Telegram:', error);
        return false;
    }
}

// ========================================================
// PROCESSAR SINAIS E ENVIAR PARA TELEGRAM
// ========================================================
function processarSinaisTelegram() {
    if (!TELEGRAM_CONFIG.enabled) return;
    if (signalState.isProcessing) return;

    signalState.isProcessing = true;

    try {
        // VERIFICAR SE JÁ TEM SINAL ATIVO - SE TIVER, MONITORAR FECHAMENTO
        if (signalState.signalActive && signalState.currentSignal) {
            monitorarFechamentoSinal();
            signalState.isProcessing = false;
            return; // Bloqueia novos sinais enquanto estiver posicionado
        }

        // SE NÃO TEM SINAL ATIVO, PROCURAR NOVO PADRÃO COM FILTRO ANTI-LOOP
        let acaoSinal = null;
        let stopLossCalculado = 0;
        let idUnicoDoPadrao = 0;

        // Processar FVGs com filtro de ID único
        if (telegramFVGs && telegramFVGs.length > 0) {
            // Ordenar por timestamp para pegar o mais recente
            const fvgRecente = [...telegramFVGs].sort((a, b) => b.timestamp - a.timestamp)[0];
            
            if (fvgRecente) {
                idUnicoDoPadrao = fvgRecente.timestamp;
                
                // FILTRO ANTILOOP CRUCIAL: Se esse ID já foi usado antes, ignora completamente
                if (!signalState.idsSinaisProcessados.has(idUnicoDoPadrao)) {
                    if (fvgRecente.tipo === 'BULLISH') {
                        acaoSinal = 'COMPRA';
                        stopLossCalculado = fvgRecente.fundo * 0.999;
                    } else if (fvgRecente.tipo === 'BEARISH') {
                        acaoSinal = 'VENDA';
                        stopLossCalculado = fvgRecente.topo * 1.001;
                    }
                } else {
                    console.log('🔒 FVG já processado, ignorando para evitar loop:', idUnicoDoPadrao);
                }
            }
        }

        // Se FVG não disparou, tentar Order Blocks
        if (!acaoSinal && telegramOBs && telegramOBs.length > 0) {
            const obRecente = [...telegramOBs].sort((a, b) => b.timestamp - a.timestamp)[0];
            if (obRecente) {
                idUnicoDoPadrao = obRecente.timestamp;
                if (!signalState.idsSinaisProcessados.has(idUnicoDoPadrao)) {
                    if (obRecente.tipo.includes('BULLISH')) {
                        acaoSinal = 'COMPRA';
                        stopLossCalculado = obRecente.fundo * 0.999;
                    } else if (obRecente.tipo.includes('BEARISH')) {
                        acaoSinal = 'VENDA';
                        stopLossCalculado = obRecente.topo * 1.001;
                    }
                } else {
                    console.log('🔒 OB já processado, ignorando para evitar loop:', idUnicoDoPadrao);
                }
            }
        }

        // Se achou nova oportunidade, abrir operação
        if (acaoSinal && idUnicoDoPadrao > 0) {
            const signal = {
                type: acaoSinal,
                source: telegramFVGs.length > 0 ? 'FVG' : 'OB',
                price: telegramFVGs.length > 0 ? telegramFVGs[0].topo : telegramOBs[0].topo,
                timestamp: idUnicoDoPadrao,
                uniqueId: idUnicoDoPadrao
            };
            
            enviarSinal(signal, stopLossCalculado);
        }

    } catch (error) {
        console.error('Erro ao processar sinais:', error);
    } finally {
        signalState.isProcessing = false;
    }
}

// ========================================================
// ENVIAR SINAL INDIVIDUAL
// ========================================================
function enviarSinal(signal, stopLossCalculado) {
    // Registrar o ID na lista de proteção para nunca mais repeti-lo
    if (signal.uniqueId) {
        signalState.idsSinaisProcessados.add(signal.uniqueId);
        console.log('🔒 ID registrado na lista anti-loop:', signal.uniqueId);
    }

    // Calcular SL e TPs
    const currentPrice = signal.price;
    const sl = stopLossCalculado || (signal.type === 'COMPRA' ? currentPrice - 5 : currentPrice + 5);
    const risco = Math.abs(currentPrice - sl);
    const tp1 = signal.type === 'COMPRA' ? currentPrice + risco : currentPrice - risco;
    const tp2 = signal.type === 'COMPRA' ? currentPrice + (risco * 2) : currentPrice - (risco * 2);
    const tp3 = signal.type === 'COMPRA' ? currentPrice + (risco * 3) : currentPrice - (risco * 3);
    const horaAbertura = new Date().toLocaleTimeString('pt-BR');

    // Salvar sinal atual com hora de entrada e níveis de TP/SL
    signalState.currentSignal = {
        ...signal,
        sl: sl,
        tp1: tp1,
        tp2: tp2,
        tp3: tp3,
        entryTime: Date.now(),
        entryPrice: currentPrice,
        horarioAbertura: horaAbertura
    };
    signalState.signalActive = true;

    // Reproduzir som de abertura (apenas uma vez no início)
    playAlertSound('default');

    // Atualizar seção de Sinal Atual
    atualizarSinalAtual(signal, sl, tp1, tp2, tp3);

    // Formatar mensagem para Telegram com horário de abertura
    const message = `
🚨 <b>NOVO SINAL DE ${signal.type} ABERTO</b> 🚨

📊 <b>Ativo:</b> PAXGUSDT (Ouro)
🎯 <b>Tipo:</b> ${signal.type}
📍 <b>Fonte:</b> ${signal.source}
💰 <b>Preço de Entrada:</b> $${currentPrice.toFixed(2)}

🛑 <b>Stop Loss:</b> $${sl.toFixed(2)}
✅ <b>TP1:</b> $${tp1.toFixed(2)}
✅ <b>TP2:</b> $${tp2.toFixed(2)}
✅ <b>TP3:</b> $${tp3.toFixed(2)}

⏰ <b>Horário de Abertura:</b> ${horaAbertura}
🤖 <b>Bot:</b> TradePulse Signal Box
    `.trim();

    // Enviar para Telegram
    sendTelegramMessage(message).then(success => {
        if (success) {
            // Atualizar lock
            signalState.lastSignalTime = Date.now();

            // Adicionar ao histórico local
            adicionarSinalAoHistorico(signal, sl, tp1, tp2, tp3);
        }
    });
}

// ========================================================
// ATUALIZAR SINAL ATUAL NO BOX
// ========================================================
function atualizarSinalAtual(signal, sl, tp1, tp2, tp3) {
    const currentSignalDiv = document.getElementById('telegram-current-signal-details');
    if (!currentSignalDiv) return;

    const signalTypeClass = signal.type === 'COMPRA' ? 'buy' : 'sell';
    const signalColor = signal.type === 'COMPRA' ? '#4CAF50' : '#f44336';
    const horaAbertura = signalState.currentSignal?.horarioAbertura || new Date().toLocaleTimeString('pt-BR');

    currentSignalDiv.innerHTML = `
        <div class="signal-details">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; border-bottom: 1px dashed #444; padding-bottom: 6px;">
                <strong style="color: ${signalColor};">🎯 OPERAÇÃO EM ANDAMENTO</strong>
                <span style="color: #aaa; font-size: 11px;">🕒 Aberto às: ${horaAbertura}</span>
            </div>
            <div class="signal-detail-row">
                <span><strong>Tipo:</strong></span>
                <span style="color: ${signalColor}">${signal.type}</span>
            </div>
            <div class="signal-detail-row">
                <span><strong>Preço:</strong></span>
                <span>$${signal.price.toFixed(2)}</span>
            </div>
            <div class="signal-detail-row">
                <span><strong>Fonte:</strong></span>
                <span>SMC (${signal.source || 'FVG'})</span>
            </div>
            <div class="signal-detail-row">
                <span><strong>Timeframe:</strong></span>
                <span>${signal.timeframe || '15m'}</span>
            </div>
            <div class="signal-detail-row">
                <span><strong>SL:</strong></span>
                <span style="color: #f44336">$${sl.toFixed(2)}</span>
            </div>
            <div class="signal-detail-row">
                <span><strong>TP1:</strong></span>
                <span style="color: #4CAF50">$${tp1.toFixed(2)}</span>
            </div>
            <div class="signal-detail-row">
                <span><strong>TP2:</strong></span>
                <span style="color: #4CAF50">$${tp2.toFixed(2)}</span>
            </div>
            <div class="signal-detail-row">
                <span><strong>TP3:</strong></span>
                <span style="color: #4CAF50">$${tp3.toFixed(2)}</span>
            </div>
        </div>
    `;

    console.log('📊 Sinal atual atualizado no box:', signal.type, signal.price);
}

// ========================================================
// MONITORAR FECHAMENTO DO SINAL
// ========================================================
function monitorarFechamentoSinal() {
    if (!signalState.signalActive || !signalState.currentSignal) return;

    // Obter preço atual
    let currentPrice = null;
    
    // Tentar obter preço atual do candlestickSeries se disponível
    if (typeof candlestickSeries !== 'undefined' && candlestickSeries) {
        try {
            const data = candlestickSeries.data();
            if (data && data.length > 0) {
                currentPrice = data[data.length - 1].close;
            }
        } catch (e) {
            console.log('⚠️ Não foi possível obter preço do gráfico');
        }
    }

    // Se não conseguiu obter do gráfico, usar o último preço conhecido
    if (!currentPrice && signalState.currentSignal) {
        currentPrice = signalState.currentSignal.entryPrice;
    }

    if (!currentPrice) {
        console.log('⚠️ Preço atual não disponível para monitoramento');
        return;
    }

    const sig = signalState.currentSignal;
    let atingido = null;

    // Verificar se atingiu TP ou SL
    if (sig.type === 'COMPRA') {
        if (currentPrice >= sig.tp3) atingido = 'TP3';
        else if (currentPrice >= sig.tp2) atingido = 'TP2';
        else if (currentPrice >= sig.tp1) atingido = 'TP1';
        else if (currentPrice <= sig.sl) atingido = 'SL';
    } else { // VENDA
        if (currentPrice <= sig.tp3) atingido = 'TP3';
        else if (currentPrice <= sig.tp2) atingido = 'TP2';
        else if (currentPrice <= sig.tp1) atingido = 'TP1';
        else if (currentPrice >= sig.sl) atingido = 'SL';
    }

    // Se atingiu algum nível
    if (atingido) {
        console.log(`🎯 ${atingido} atingido! Preço: ${currentPrice.toFixed(2)}`);
        
        // Determinar status final
        let statusFinal = '';
        if (atingido === 'SL') {
            statusFinal = 'LOSS';
            playAlertSound('sl');
        } else {
            statusFinal = `GAIN (${atingido})`;
            playAlertSound('tp');
        }

        // Fechar o sinal
        pararSinalAtual(statusFinal);
    }
}

// ========================================================
// ADICIONAR SINAL AO HISTÓRICO
// ========================================================
function adicionarSinalAoHistorico(signal, sl, tp1, tp2, tp3) {
    const signalsList = document.getElementById('telegram-signals-list');
    if (!signalsList) return;

    // Remover mensagem de "nenhum sinal" se existir
    const noSignals = signalsList.querySelector('.no-signals');
    if (noSignals) {
        noSignals.remove();
    }

    const signalItem = document.createElement('div');
    signalItem.className = `signal-item ${signal.type === 'COMPRA' ? 'buy' : 'sell'}`;
    signalItem.innerHTML = `
        <div class="signal-type">${signal.type} - ${signal.source}</div>
        <div class="signal-details">
            Preço: $${signal.price.toFixed(2)} | SL: $${sl.toFixed(2)} | TP1: $${tp1.toFixed(2)}
        </div>
        <div class="signal-time">⏰ ${new Date(signal.timestamp).toLocaleString('pt-BR')}</div>
    `;

    signalsList.insertBefore(signalItem, signalsList.firstChild);

    // Manter apenas os últimos 10 sinais
    while (signalsList.children.length > 10) {
        signalsList.removeChild(signalsList.lastChild);
    }

    console.log('📋 Sinal adicionado ao histórico');
}

// ========================================================
// PARAR SINAL ATUAL
// ========================================================
function pararSinalAtual(resultado) {
    const horaFechamento = new Date().toLocaleTimeString('pt-BR');
    const horaAbertura = signalState.currentSignal?.horarioAbertura || 'N/A';
    
    console.log(`🛑 Parando sinal atual - Resultado: ${resultado}`);
    
    // Parar monitoramento antigo se existir
    if (signalState.monitoringInterval) {
        clearInterval(signalState.monitoringInterval);
        signalState.monitoringInterval = null;
    }

    // Forçar inclusão no histórico visual
    if (signalState.currentSignal) {
        forcarInclusaoNoHistoricoVisual(signalState.currentSignal, resultado);
    }

    // Marcar sinal como inativo
    signalState.signalActive = false;
    const sinalParaHistorico = signalState.currentSignal;
    signalState.currentSignal = null;

    // Atualizar status no box
    const statusBox = document.getElementById('painel-status-sinal');
    if (statusBox) {
        const corStatus = resultado.includes('GAIN') ? '#00ff88' : '#ff3355';
        statusBox.innerHTML = `✅ Operação anterior finalizada em <b style="color: ${corStatus}">${resultado}</b> às ${horaFechamento}. Aguardando o mercado se mover...`;
        statusBox.style.borderColor = "#444";
        statusBox.style.color = "#888";
    }

    // Enviar mensagem de resultado para o Telegram com horários de abertura e fechamento
    const mensagemResultado = `
🏁 <b>SINAL CONCLUÍDO!</b> 🏁

<b>Resultado:</b> ${resultado.includes('GAIN') ? '🟢 GAIN' : '🔴 LOSS'}
<b>Ativo:</b> PAXGUSDT (Ouro)

⏰ <b>Horário de Abertura:</b> ${horaAbertura}
⏰ <b>Horário de Fechamento:</b> ${horaFechamento}

🤖 <b>Bot:</b> TradePulse Signal Box
    `.trim();

    sendTelegramMessage(mensagemResultado);

    // Limpar sinal atual após 5 segundos
    setTimeout(() => {
        const currentSignalDiv = document.getElementById('telegram-current-signal-details');
        if (currentSignalDiv) {
            currentSignalDiv.innerHTML = '<p class="no-signal">Aguardando sinal...</p>';
        }
    }, 5000);
}

// ========================================================
// ATUALIZAR STATUS DO SINAL ATUAL
// ========================================================
function atualizarStatusSinalAtual(status) {
    const currentSignalDiv = document.getElementById('telegram-current-signal-details');
    if (!currentSignalDiv) return;

    // Adicionar status ao HTML existente
    const statusDiv = document.createElement('div');
    statusDiv.style.cssText = 'margin-top: 10px; padding: 8px; background: rgba(0, 255, 136, 0.1); border-radius: 4px; font-size: 12px; color: #00ff88; font-weight: bold;';
    statusDiv.textContent = status;
    
    // Remover status anterior se existir
    const oldStatus = currentSignalDiv.querySelector('[data-status]');
    if (oldStatus) oldStatus.remove();
    
    statusDiv.setAttribute('data-status', 'true');
    currentSignalDiv.appendChild(statusDiv);
}

// ========================================================
// FORÇAR INCLUSÃO NO HISTÓRICO VISUAL
// ========================================================
function forcarInclusaoNoHistoricoVisual(sinal, statusFinal) {
    const corpoTabela = document.getElementById('tabela-historico-corpo');
    if (!corpoTabela) {
        console.log('⚠️ Tabela de histórico não encontrada');
        return;
    }

    // Remove a mensagem de "Sincronizando..." ou tabela vazia se ela existir
    if (corpoTabela.innerHTML.includes('colspan')) {
        corpoTabela.innerHTML = '';
    }

    let corStatus = statusFinal.includes('GAIN') ? '#00ff88' : '#ff3355';
    const horaFechamento = new Date().toLocaleTimeString('pt-BR');

    // Cria uma nova linha no topo da tabela do site
    const novaLinha = document.createElement('tr');
    novaLinha.style.borderBottom = '1px solid #333';
    novaLinha.innerHTML = `
        <td style="padding: 10px; color: #888;">${horaFechamento}</td>
        <td style="font-weight: bold; color: ${sinal.type === 'COMPRA' ? '#00ff88' : '#ff3355'}">${sinal.type}</td>
        <td style="font-family: monospace; padding: 10px;">${sinal.price.toFixed(2)}</td>
        <td style="font-weight: bold; color: ${corStatus}">${statusFinal}</td>
    `;

    corpoTabela.insertBefore(novaLinha, corpoTabela.firstChild);
    console.log('📋 Sinal adicionado ao histórico visual:', statusFinal);
}

// ========================================================
// ATUALIZAR VARIÁVEIS GLOBAIS DE SINAIS
// ========================================================
function atualizarSinaisGlobais(fvgs, obs) {
    telegramFVGs = fvgs || [];
    telegramOBs = obs || [];
    
    // Processar sinais quando houver atualização
    if (TELEGRAM_CONFIG.enabled) {
        processarSinaisTelegram();
    }
}

// ========================================================
// INICIALIZAÇÃO
// ========================================================
function inicializarTelegramSignalBox() {
    console.log('🚀 Inicializando Telegram Signal Box...');
    criarTelegramSignalBox();
    console.log('✅ Sistema de Telegram Signal Box inicializado');
}

// Tentar inicializar imediatamente se o DOM já estiver pronto
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(inicializarTelegramSignalBox, 1000);
} else {
    window.addEventListener('DOMContentLoaded', () => {
        setTimeout(inicializarTelegramSignalBox, 1000);
    });
}

// Backup: tentar novamente após 3 segundos
setTimeout(() => {
    if (!document.getElementById('telegram-signal-box')) {
        console.log('⚠️ Box não encontrado, tentando criar novamente...');
        criarTelegramSignalBox();
    }
}, 3000);

// Botão de emergência para criar o box manualmente
window.criarBoxTelegramManual = function() {
    console.log('🔧 Criando box manualmente...');
    criarTelegramSignalBox();
};

// Expor funções globalmente para uso externo
window.TelegramSignalBox = {
    atualizarSinaisGlobais,
    processarSinaisTelegram,
    sendTelegramMessage,
    playAlertSound
};
