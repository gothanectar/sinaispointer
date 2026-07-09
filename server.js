const express = require('express');
const axios = require('axios');
const redis = require('redis');
const path = require('path');
const open = require('open');
const chokidar = require('chokidar');
const WebSocket = require('ws');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 3002;

// Create HTTP server
const server = http.createServer(app);

// WebSocket for hot reload (only in development)
let wss, clients = [];
if (process.env.NODE_ENV !== 'production') {
    wss = new WebSocket.Server({ server });
    
    wss.on('connection', (ws) => {
        clients.push(ws);
        console.log('🔄 Cliente conectado para hot-reload');
        
        ws.on('close', () => {
            clients = clients.filter(client => client !== ws);
        });
    });

    // Watch for file changes
    const watcher = chokidar.watch([
        '*.html',
        'css/*.css',
        'js/*.js',
        'components/*.js',
        'analytics/*.py'
    ], {
        ignored: /node_modules/,
        persistent: true
    });

    watcher.on('change', (filePath) => {
        console.log(`📝 Arquivo modificado: ${filePath}`);
        
        // Notify all connected clients to reload
        clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    type: 'reload',
                    file: filePath
                }));
            }
        });
    });
}

app.use(express.json());
app.use(express.static(__dirname));

// Configurações
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || "8651801027:AAFYkwB0jWWeI6CeVN1S9HGgEjsnqmYmkxs";
const CHAT_ID = process.env.CHAT_ID || "-1002224151740";
const MEU_ID_PRIVADO = process.env.MEU_ID_PRIVADO || "6297482127";

const urlTelegram = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;

const redisClient = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.connect()
    .then(() => console.log('📦 Redis conectado'))
    .catch(err => console.error('❌ Redis:', err.message));

// ==================== RECEBER SINAL DO MT5 ====================
app.post('/nova-ordem', async (req, res) => {
    try {
        const { symbol, action, price, sl, tp1, tp2, tp3, robot_id } = req.body;

        console.log(`🚨 Sinal MT5 [Robô ${robot_id || 'N/A'}]: ${action} ${symbol} @ ${price}`);

        const emoji = action === "COMPRA" ? "🟢" : "🔴";
        const cor = action === "COMPRA" ? "✅ COMPRA" : "❌ VENDA";

        const textoTelegram = 
`${emoji} **NOVO SINAL SMC - ${cor}** ${emoji}

🤖 **Robô ID:** ${robot_id || 'N/A'}
📊 **Ativo:** ${symbol}
⏰ **Horário:** ${new Date().toLocaleString('pt-BR')}

💰 **Entrada:** $${Number(price).toFixed(2)}
🛡️ **Stop Loss:** $${Number(sl).toFixed(2)}
🚀 **TP1:** $${Number(tp1).toFixed(2)}
🚀 **TP2:** $${Number(tp2).toFixed(2)}
🚀 **TP3:** $${Number(tp3).toFixed(2)}

⚡ Gerencie seu risco com disciplina!`;

        // Envia para Telegram
        await enviarTelegram(CHAT_ID, textoTelegram);
        await enviarTelegram(MEU_ID_PRIVADO, textoTelegram);

        // Salva no Redis para o site ler
        if (redisClient.isOpen) {
            await redisClient.set('ultimo_sinal', JSON.stringify({
                symbol, action, price, sl, tp1, tp2, tp3, robot_id, timestamp: Date.now()
            }));
        }

        res.json({ status: "ok", message: "Sinal processado" });
    } catch (error) {
        console.error("Erro ao processar sinal:", error.message);
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
        console.log(`✅ Enviado para ${chat_id}`);
    } catch (err) {
        console.error(`❌ Erro Telegram ${chat_id}:`, err.response?.data || err.message);
    }
}

// ==================== VALIDAR LICENÇA ====================
app.post('/api/validate-license', async (req, res) => {
    try {
        const { key, email, account } = req.body;

        console.log(`🔑 Validação de licença: ${key} | ${email} | Conta: ${account}`);

        // Verificar no Redis se a licença existe e é válida
        if (redisClient.isOpen) {
            const licenseData = await redisClient.get(`license:${key}`);
            
            if (licenseData) {
                const license = JSON.parse(licenseData);
                
                // Verificar se o e-mail bate
                if (license.email.toLowerCase() === email.toLowerCase()) {
                    // Verificar se a conta está autorizada (ou se ainda tem slots disponíveis)
                    const authorizedAccounts = license.accounts || [];
                    
                    // Se a conta já está autorizada, retorna válido
                    if (authorizedAccounts.includes(account)) {
                        console.log('✅ Licença válida - conta já autorizada');
                        return res.json({ valid: true, message: "Licença válida" });
                    }
                    
                    // Se ainda tem slots disponíveis (máximo 3 contas), autoriza
                    if (authorizedAccounts.length < 3) {
                        authorizedAccounts.push(account);
                        license.accounts = authorizedAccounts;
                        await redisClient.set(`license:${key}`, JSON.stringify(license));
                        console.log('✅ Licença válida - nova conta autorizada');
                        return res.json({ valid: true, message: "Licença válida - conta autorizada" });
                    }
                    
                    // Limite de contas atingido
                    console.log('❌ Licença inválida - limite de contas atingido');
                    return res.json({ valid: false, message: "Limite de contas atingido (máximo 3)" });
                }
                
                console.log('❌ Licença inválida - e-mail não corresponde');
                return res.json({ valid: false, message: "E-mail não corresponde à licença" });
            }
        }
        
        // Para desenvolvimento: aceita qualquer chave que começa com "TP-"
        if (key.startsWith('TP-') && email.includes('@')) {
            console.log('⚠️ Modo desenvolvimento: licença aceita temporariamente');
            return res.json({ valid: true, message: "Licença válida (modo dev)" });
        }
        
        console.log('❌ Licença inválida - chave não encontrada');
        res.json({ valid: false, message: "Licença não encontrada" });
    } catch (error) {
        console.error("Erro ao validar licença:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// ==================== CRIAR LICENÇA (Admin) ====================
app.post('/api/create-license', async (req, res) => {
    try {
        const { key, email } = req.body;

        console.log(`🔑 Criando licença: ${key} | ${email}`);

        if (redisClient.isOpen) {
            const licenseData = {
                key: key,
                email: email.toLowerCase(),
                accounts: [],
                createdAt: Date.now(),
                active: true
            };
            
            await redisClient.set(`license:${key}`, JSON.stringify(licenseData));
            console.log('✅ Licença criada com sucesso');
            res.json({ success: true, message: "Licença criada" });
        } else {
            res.status(500).json({ error: "Redis não conectado" });
        }
    } catch (error) {
        console.error("Erro ao criar licença:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// Rota principal - redireciona para TradePulse Home
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'tradepulse-home.html'));
});

// Additional routes for integrated platform
app.get('/sports', (req, res) => {
    res.sendFile(path.join(__dirname, 'sports-dashboard.html'));
});

app.get('/sports-dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'sports-dashboard.html'));
});

app.get('/docs', (req, res) => {
    res.sendFile(path.join(__dirname, 'tradepulse-docs.html'));
});

app.get('/download', (req, res) => {
    res.sendFile(path.join(__dirname, 'tradepulse-download.html'));
});

app.get('/charts', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API Routes for sports data
app.get('/api/sports/opportunities', async (req, res) => {
    try {
        // In production, this would connect to your Python backend
        // For now, returning mock data structure
        const mockData = {
            total: 247,
            positive_ev: 23,
            avg_probability: 68.5,
            roi_projection: 12.3,
            sports: {
                futebol: 89,
                basquete: 45,
                tenis: 67,
                volei: 23,
                mma: 12,
                esports: 11
            },
            last_updated: new Date().toISOString()
        };
        
        res.json(mockData);
    } catch (error) {
        console.error('❌ Erro API sports:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Proxy routes for Streamlit apps (in production)
app.get('/analytics', (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        // In production, this would proxy to your Streamlit apps
        res.redirect('http://localhost:8501');
    } else {
        res.json({ message: 'Analytics dashboard - Configure Streamlit apps for full functionality' });
    }
});

// Hot reload script injection (development only)
if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
        if (req.path.endsWith('.html')) {
            const originalSend = res.send;
            res.send = function(html) {
                if (typeof html === 'string' && html.includes('</body>')) {
                    const hotReloadScript = `
                        <script>
                            (function() {
                                if (typeof WebSocket === 'undefined') return;
                                const ws = new WebSocket('ws://localhost:${PORT}');
                                ws.onmessage = function(event) {
                                    try {
                                        const data = JSON.parse(event.data);
                                        if (data.type === 'reload') {
                                            console.log('🔄 Recarregando página devido a mudança em:', data.file);
                                            window.location.reload();
                                        }
                                    } catch(e) {}
                                };
                                ws.onopen = function() {
                                    console.log('🔄 Hot-reload conectado');
                                };
                            })();
                        </script>
                    `;
                    html = html.replace('</body>', hotReloadScript + '</body>');
                }
                originalSend.call(this, html);
            };
        }
        next();
    });
}

// Start server
server.listen(PORT, () => {
    console.log('🚀 TradePulse Integrated Platform');
    console.log('===================================');
    console.log(`📡 Servidor rodando em: http://localhost:${PORT}`);
    
    if (process.env.NODE_ENV !== 'production') {
        console.log('🔄 Hot-reload ativado para desenvolvimento');
        console.log('📊 Rotas disponíveis:');
        console.log('   • http://localhost:3002/ (TradePulse Home)');
        console.log('   • http://localhost:3002/sports (Apostas Esportivas)');
        console.log('   • http://localhost:3002/charts (Gráficos Trading)');
        console.log('   • http://localhost:3002/docs (Documentação)');
        console.log('===================================');
        
        // Auto-open browser in development
        const url = `http://localhost:${PORT}`;
        console.log(`🌐 Abrindo navegador em: ${url}`);
        //open(url).catch(() => {
        //    console.log('⚠️  Navegador não pôde ser aberto automaticamente');
        //    console.log(`🌐 Acesse manualmente: ${url}`);
        //});
    } else {
        console.log('🏭 Executando em modo produção');
        console.log('===================================');
    }
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 Encerrando servidor...');
    if (wss) wss.close();
    server.close(() => {
        console.log('✅ Servidor encerrado com sucesso');
    });
});