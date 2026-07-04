# 🤖 Terminal Pro - Plataforma Inteligente de Análises

SaaS completo de análise para Trading, Loterias e Esportes com automação diária e alertas em tempo real.

## 🚀 Funcionalidades

### 📈 Trading
- Sinais técnicos baseados em RSI, MACD, Bollinger Bands
- Análise de volatilidade e tendência
- Correlação entre ativos
- Sistema de backtest
- Calculadora de gestão de risco

### 🎰 Loterias
- Análise estatística de Mega-Sena e Lotofácil
- Cálculo de números quentes e frios
- Índice de atraso de dezenas
- Análise de quadrantes
- Palpites baseados em probabilidade

### ⚽ Esportes
- Scanner de oportunidades esportivas
- Cálculo de Valor Esperado (+EV)
- Análise de probabilidades
- Odds recomendadas

### 📰 Informações de Mercado
- Calendário econômico em tempo real
- Notícias de mercado com análise de sentimento
- Alertas automáticos via Telegram

## 📋 Requisitos

- Python 3.8+
- pip

## 🛠️ Instalação

1. Clone o repositório:
```bash
git clone <seu-repositorio>
cd analytics
```

2. Instale as dependências:
```bash
pip install -r requirements.txt
```

3. Configure o Telegram (opcional):
- Edite `telegram_alerts.py`
- Adicione seu `TELEGRAM_BOT_TOKEN` e `TELEGRAM_CHAT_ID`

## 🚀 Como Usar

### 1. Executar o Motor de Automação
```bash
python motor.py
```
Isso irá:
- Criar/atualizar o banco de dados
- Processar sinais de trading
- Analisar loterias
- Scanner esportivo
- Calcular correlações
- Atualizar calendário econômico
- Processar notícias

### 2. Executar a Interface Web
```bash
streamlit run app.py
```
Acesse `http://localhost:8501` no navegador.

### 3. Executar Backtest
```bash
python backtest.py
```

### 4. Usar Calculadora de Risco
```bash
streamlit run risk_calculator.py
```

### 5. Enviar Alertas Telegram
```bash
python telegram_alerts.py
```

## ⏰ Automação Diária (Cron Job)

### Linux/Mac
Adicione ao crontab (`crontab -e`):
```bash
# Executa todos os dias às 02:00 da manhã
0 2 * * * /usr/bin/python3 /caminho/para/analytics/motor.py
0 2 * * * /usr/bin/python3 /caminho/para/analytics/telegram_alerts.py
```

### Windows
Use o Agendador de Tarefas do Windows para executar:
- `motor.py` todos os dias às 02:00
- `telegram_alerts.py` após o motor

## 📊 Estrutura do Projeto

```
analytics/
├── motor.py              # Motor de automação principal
├── app.py                # Interface web Streamlit
├── telegram_alerts.py    # Sistema de alertas Telegram
├── backtest.py           # Sistema de backtest
├── risk_calculator.py    # Calculadora de risco
├── requirements.txt      # Dependências Python
├── README.md            # Este arquivo
└── plataforma_analytics.db  # Banco de dados (criado automaticamente)
```

## 🔧 Configuração

### API Keys
Edite `motor.py` para adicionar suas chaves de API:
- `API_FOOTBALL_KEY`: Obter em https://api-football.com/
- `API_BINANCE`: Padrão, não requer chave para dados públicos

### Telegram
Edite `telegram_alerts.py`:
- `TELEGRAM_BOT_TOKEN`: Obter em @BotFather
- `TELEGRAM_CHAT_ID`: Seu chat ID ou canal

## 📈 Métricas Calculadas

### Trading
- RSI (Índice de Força Relativa)
- Volatilidade histórica
- MACD
- Bollinger Bands
- Tendência de mercado

### Loterias
- Frequência de números
- Índice de atraso
- Análise de quadrantes
- Probabilidade estatística

### Esportes
- Valor Esperado (+EV)
- Probabilidade matemática
- Odds recomendadas
- Clustered Odds

## ⚠️ Aviso Legal

Este sistema é fornecido apenas para fins educacionais e informativos. Os sinais e análises são baseados em dados históricos e não garantem lucros futuros. Trading envolve riscos significativos. Opere por sua própria conta e risco.

## 📞 Suporte

Para suporte, contate: support@tradepulse.com

## 📄 Licença

Comercial - Todos os direitos reservados © 2026 TradePulse
