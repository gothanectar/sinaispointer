# 🍔 LotoVarejo - Prediction Market de Fast Food

Sistema de apostas em preços de Fast Food com gamificação e moedas virtuais. MVP focado em grandes redes nacionais (McDonald's, Burger King, Subway) com scraping automatizado e crowdsourcing de preços locais.

## 🎯 Funcionalidades

- **Bolões de Preços**: Usuários apostam nos preços de lanches em horários específicos
- **Sistema de Créditos Virtuais**: Moedas gratuitas diárias (Faucet) e recompensas por engajamento
- **Scraping Automatizado**: Captura de preços de grandes redes nacionais via Playwright
- **Crowdsourcing**: Validação de preços locais por usuários com sistema de consenso
- **Marketplace de Prêmios**: Troca de créditos por cupons reais (iFood, Uber Eats)
- **PWA Mobile-First**: Interface otimizada para dispositivos móveis

## 🏗️ Arquitetura

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   PWA Mobile    │────▶│   FastAPI       │────▶│   PostgreSQL    │
│   (Frontend)    │     │   (Backend)     │     │   (Database)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                │
                                ▼
                        ┌─────────────────┐
                        │   Playwright   │
                        │   (Scraper)    │
                        └─────────────────┘
```

## 📁 Estrutura do Projeto

```
prediction-market/
├── schema.sql              # Estrutura do banco de dados PostgreSQL
├── main.py                 # API FastAPI Backend
├── scraper.py              # Script de scraping com Playwright
├── requirements.txt        # Dependências Python
├── docker-compose.yml      # Orquestração Docker
├── Dockerfile             # Imagem Docker
├── .env.example            # Variáveis de ambiente
├── frontend/
│   └── index.html         # PWA Mobile-First
└── README.md              # Este arquivo
```

## 🚀 Instalação Rápida

### Pré-requisitos

- Docker e Docker Compose
- Python 3.12+ (para desenvolvimento local)
- PostgreSQL 15+ (se não usar Docker)

### Via Docker (Recomendado)

```bash
# Clone o repositório
cd prediction-market

# Configure as variáveis de ambiente
cp .env.example .env

# Suba os containers
docker-compose up -d

# A API estará disponível em http://localhost:8000
# O banco em localhost:5432
```

### Desenvolvimento Local

```bash
# Instale as dependências
pip install -r requirements.txt

# Instale os browsers do Playwright
playwright install chromium

# Configure o banco de dados PostgreSQL
psql -U postgres -c "CREATE DATABASE varedb;"
psql -U postgres -d varedb -f schema.sql

# Configure as variáveis de ambiente
export DB_NAME=varedb
export DB_USER=postgres
export DB_PASSWORD=root
export DB_HOST=localhost

# Execute a API
uvicorn main:app --reload

# Execute o scraper (em outro terminal)
python scraper.py
```

## 📡 API Endpoints

### Usuários
- `POST /users/register` - Registrar novo usuário
- `GET /users/{user_id}` - Obter informações do usuário

### Carteira
- `POST /wallet/faucet` - Resgatar créditos diários
- `GET /wallet/{user_id}/transactions` - Histórico de transações

### Loterias/Bolões
- `POST /lottery/pool` - Criar novo bolão
- `GET /lottery/pools` - Listar bolões disponíveis
- `POST /lottery/bet` - Fazer palpite em bolão
- `POST /lottery/liquidate/{pool_id}` - Liquidar bolão

### Preços
- `POST /prices/submit` - Enviar preço (crowdsourcing)
- `GET /prices/{product_id}/history` - Histórico de preços
- `GET /establishments` - Listar estabelecimentos

### Recompensas
- `GET /rewards` - Listar prêmios disponíveis
- `POST /rewards/{reward_id}/redeem` - Resgatar prêmio

### Health
- `GET /health` - Verificar status da API

## 🤖 Scraper

### Executar scraping completo (todas as redes)
```bash
python scraper.py
```

### Executar scraping específico
```bash
python scraper.py mcdonalds
python scraper.py burgerking
python scraper.py subway
```

### Configuração de Scraping

Os seletores CSS podem ser ajustados no arquivo `scraper.py` na variável `ESTABLISHMENTS_CONFIG`.

## 🎮 Frontend PWA

O frontend está localizado em `frontend/index.html` e pode ser aberto diretamente no navegador ou servido por um servidor web.

Para desenvolvimento local:
```bash
cd frontend
python -m http.server 8080
```

Acesse: http://localhost:8080

## 📊 Modelo de Dados

### Tabelas Principais

- **users**: Usuários do sistema
- **wallets**: Carteiras de créditos virtuais
- **wallet_transactions**: Histórico de transações (ledger)
- **establishments**: Redes de fast food
- **products**: Produtos/itens do cardápio
- **price_history**: Histórico de variações de preço
- **lottery_pools**: Bolões de apostas
- **pool_bets**: Palpites dos usuários
- **rewards**: Prêmios do marketplace
- **reward_redemptions**: Resgates de prêmios

## 🔒 Segurança

- UUIDs primários para evitar varredura de IDs
- Device ID para prevenir contas fakes
- Transações ACID para integridade financeira
- Rate limiting no faucet diário
- Validação de dados via Pydantic

## 🎯 Próximos Passos

- [ ] Integração real com APIs de delivery (iFood, Rappi)
- [ ] Sistema de notificações push
- [ ] Autenticação social (Google, Apple)
- [ ] Dashboard administrativo
- [ ] Analytics e métricas
- [ ] Testes automatizados
- [ ] Deploy em produção (AWS/GCP)

## 📝 Licença

Este projeto é propriedade exclusiva do proprietário. Todos os direitos reservados.

## 👥 Suporte

Para suporte técnico, entre em contato através do canal oficial do projeto.
