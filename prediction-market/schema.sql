-- ========================================================
-- PREDICTION MARKET - FAST FOOD MVP
-- Estrutura de Dados PostgreSQL Completa
-- ========================================================

-- Habilitar extensão para geração de UUIDs primários (Segurança contra varredura de IDs)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================================
-- 1. SISTEMA DE USUÁRIOS E SEGURANÇA ANTIFRAUDE
-- =========================================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    device_id VARCHAR(255) NOT NULL, -- Identificador único do celular (Prevenção de Contas Fakes)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_users_device_id ON users(device_id);

-- =========================================================================
-- 2. FINANCIAL LEDGER: CARTEIRA DE CRÉDITOS VIRTUAIS (Garante Integridade ACID)
-- =========================================================================

CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    balance INT NOT NULL DEFAULT 100 CHECK (balance >= 0), -- Moedas Virtuais (Nunca fica negativo)
    last_faucet_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP - INTERVAL '1 day', -- Controle do Daily Bonus
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Histórico Imutável de Transações Financeiras (Auditoria)
CREATE TYPE transaction_type AS ENUM ('FAUCET', 'BET_ENTRY', 'BET_WIN', 'REWARD_REDEEM', 'CROWD_BONUS');

CREATE TABLE wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    type transaction_type NOT NULL,
    amount INT NOT NULL, -- Valores positivos para ganho, negativos para gasto
    description VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transactions_wallet ON wallet_transactions(wallet_id);

-- =========================================================================
-- 3. ESTEIRA DE PREÇOS: NACIONAL (SCRAPER) VS LOCAL (CROWD)
-- =========================================================================

CREATE TYPE establishment_type AS ENUM ('NATIONAL_CHAIN', 'LOCAL_RESTAURANT');

CREATE TABLE establishments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    type establishment_type NOT NULL,
    postal_code VARCHAR(20), -- CEP para clusterização/Geofencing
    city VARCHAR(100),
    state VARCHAR(5),
    website_url VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL, -- Ex: 'Hambúrguer', 'Pizza', 'Combo'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Histórico de Variação de Preços (Alimenta Gráficos e Oráculos)
CREATE TYPE price_source AS ENUM ('AUTOMATED_SCRAPER', 'USER_CROWD');

CREATE TABLE price_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    price NUMERIC(10, 2) NOT NULL,
    source price_source NOT NULL,
    user_contributor_id UUID REFERENCES users(id), -- NULL se for robô
    is_validated BOOLEAN DEFAULT TRUE, -- FALSE até o consenso aceitar
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_price_lookup ON price_history(product_id, recorded_at DESC);

-- =========================================================================
-- 4. MOTOR DA LOTERIA E BOLÕES (POOLS)
-- =========================================================================

CREATE TYPE pool_status AS ENUM ('OPEN', 'CLOSED', 'LIQUIDATED');

CREATE TABLE lottery_pools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL, -- Ex: 'Bolão dos Centavos - Big Mac SP'
    product_target_id UUID NOT NULL REFERENCES products(id),
    entry_cost INT NOT NULL DEFAULT 10, -- Custo em moedas
    prize_pool_guaranteed INT NOT NULL DEFAULT 0, -- Moedas garantidas da casa
    prize_pool_accumulated INT NOT NULL DEFAULT 0, -- Moedas acumuladas pelas entradas
    status pool_status DEFAULT 'OPEN',
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL, -- Prazo limite para palpites
    liquidated_at TIMESTAMP WITH TIME ZONE,
    winning_price_reflected NUMERIC(10, 2), -- Preço real apurado pelo oráculo
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE pool_bets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pool_id UUID NOT NULL REFERENCES lottery_pools(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    predicted_price NUMERIC(10, 2) NOT NULL, -- O palpite do usuário
    is_winner BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_per_pool UNIQUE(pool_id, user_id) -- Um palpite por usuário por bolão
);

CREATE INDEX idx_bets_pool ON pool_bets(pool_id);

-- =========================================================================
-- 5. SISTEMA DE CROWDSOURCING (Validação por Usuários)
-- =========================================================================

CREATE TABLE crowd_validations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    price_history_id UUID NOT NULL REFERENCES price_history(id) ON DELETE CASCADE,
    validator_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vote BOOLEAN NOT NULL, -- TRUE = preço correto, FALSE = preço incorreto
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_validator_per_price UNIQUE(price_history_id, validator_user_id)
);

-- =========================================================================
-- 6. MARKETPLACE DE RECOMPENSAS (Troca de Créditos)
-- =========================================================================

CREATE TABLE rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    cost_in_coins INT NOT NULL,
    reward_type VARCHAR(50) NOT NULL, -- 'COUPON', 'GIFT_CARD', 'DISCOUNT'
    is_active BOOLEAN DEFAULT TRUE,
    stock INT DEFAULT -1, -- -1 = ilimitado
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE reward_redemptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reward_id UUID NOT NULL REFERENCES rewards(id) ON DELETE CASCADE,
    coins_spent INT NOT NULL,
    redemption_code VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================================
-- LÓGICA DE NEGÓCIO AUTOMATIZADA (Stored Procedure)
-- =========================================================================

-- Procedimento para liquidar automaticamente um bolão e distribuir prêmios
CREATE OR REPLACE FUNCTION liquidate_lottery_pool(target_pool_id UUID, final_price NUMERIC(10,2)) RETURNS VOID AS $$
DECLARE
    total_prize INT;
    min_diff NUMERIC(10,2);
    winner_count INT;
    prize_per_winner INT;
BEGIN
    -- 1. Bloquear e atualizar o status do bolão
    UPDATE lottery_pools 
    SET status = 'LIQUIDATED',
        winning_price_reflected = final_price,
        liquidated_at = CURRENT_TIMESTAMP
    WHERE id = target_pool_id AND status = 'OPEN';
    
    IF NOT FOUND THEN RETURN; END IF;
    
    -- 2. Calcular prêmio total (Soma do garantido + acumulado das taxas de entrada)
    SELECT (prize_pool_guaranteed + prize_pool_accumulated) INTO total_prize
    FROM lottery_pools WHERE id = target_pool_id;
    
    -- 3. Descobrir a menor distância absoluta entre os palpites e o preço real
    SELECT MIN(ABS(predicted_price - final_price)) INTO min_diff
    FROM pool_bets WHERE pool_id = target_pool_id;
    
    -- 4. Marcar as apostas vencedoras que cravaram ou chegaram mais perto
    UPDATE pool_bets 
    SET is_winner = TRUE
    WHERE pool_id = target_pool_id AND ABS(predicted_price - final_price) = min_diff;
    
    -- 5. Contar quantos ganharam (divisão do prêmio se houver empate)
    SELECT COUNT(*) INTO winner_count FROM pool_bets WHERE pool_id = target_pool_id AND is_winner = TRUE;
    
    IF winner_count > 0 THEN
        prize_per_winner := FLOOR(total_prize / winner_count);
        
        -- 6. Atualizar a carteira dos vencedores e injetar dados na tabela de transações
        INSERT INTO wallet_transactions (wallet_id, type, amount, description)
        SELECT w.id, 'BET_WIN', prize_per_winner, 'Vencedor do Bolão ID: ' || target_pool_id
        FROM pool_bets pb
        JOIN wallets w ON w.user_id = pb.user_id
        WHERE pb.pool_id = target_pool_id AND pb.is_winner = TRUE;
        
        UPDATE wallets 
        SET balance = balance + prize_per_winner, updated_at = CURRENT_TIMESTAMP
        WHERE user_id IN (SELECT user_id FROM pool_bets WHERE pool_id = target_pool_id AND is_winner = TRUE);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- =========================================================================
-- DADOS INICIAIS (SEED DATA)
-- =========================================================================

-- Inserir estabelecimentos de exemplo (Grandes Redes Nacionais)
INSERT INTO establishments (name, type, city, state, website_url) VALUES
('McDonald''s Brasil', 'NATIONAL_CHAIN', 'São Paulo', 'SP', 'https://mcdonalds.com.br'),
('Burger King Brasil', 'NATIONAL_CHAIN', 'São Paulo', 'SP', 'https://burgerking.com.br'),
('Subway Brasil', 'NATIONAL_CHAIN', 'São Paulo', 'SP', 'https://subway.com.br'),
('Habib''s', 'NATIONAL_CHAIN', 'São Paulo', 'SP', 'https://habibs.com.br');

-- Inserir recompensas de exemplo
INSERT INTO rewards (title, description, cost_in_coins, reward_type, stock) VALUES
('Cupom 10% iFood', 'Desconto de 10% no próximo pedido do iFood', 500, 'COUPON', 100),
('Voucher Uber Eats', 'R$20 de crédito no Uber Eats', 1000, 'GIFT_CARD', 50),
('Combo Grátis', 'Combo exclusivo em restaurante parceiro', 2000, 'DISCOUNT', 20);
