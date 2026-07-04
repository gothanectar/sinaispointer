# ========================================================
# PREDICTION MARKET - FAST FOOD MVP
# API FastAPI Backend
# ========================================================

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime, timedelta
import os

app = FastAPI(
    title="LotoVarejo API",
    description="Backend do MVP de Loterias e Previsão de Preços de Fast Food",
    version="1.0.0"
)

# Configuração CORS para permitir acesso do frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuração do banco PostgreSQL
DB_PARAMS = {
    "dbname": os.getenv("DB_NAME", "varedb"),
    "user": os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD", "root"),
    "host": os.getenv("DB_HOST", "localhost"),
    "port": os.getenv("DB_PORT", "5432")
}

def get_db():
    conn = psycopg2.connect(**DB_PARAMS, cursor_factory=RealDictCursor)
    try:
        yield conn
    finally:
        conn.close()

# ========================================================
# SCHEMAS DE ENTRADA (VALIDAÇÃO DE DADOS)
# ========================================================

class UserCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., min_length=5, max_length=150)
    device_id: str = Field(..., min_length=10)

class FaucetRequest(BaseModel):
    user_id: str

class BetRequest(BaseModel):
    pool_id: str
    user_id: str
    predicted_price: float = Field(..., gt=0, description="O preço palpitado deve ser maior que zero")

class CrowdPriceSubmit(BaseModel):
    user_id: str
    establishment_id: str
    product_name: str
    price: float = Field(..., gt=0)
    category: str = "Outros"

class PoolCreate(BaseModel):
    title: str
    product_target_id: str
    entry_cost: int = Field(default=10, gt=0)
    prize_pool_guaranteed: int = Field(default=0, ge=0)
    expires_hours: int = Field(default=24, gt=0)

# ========================================================
# ENDPOINTS - USUÁRIOS E AUTENTICAÇÃO
# ========================================================

@app.post("/users/register", status_code=201)
def register_user(user: UserCreate, db=Depends(get_db)):
    """Registra um usuário e inicializa sua carteira virtual com 100 créditos"""
    cur = db.cursor()
    try:
        # Inserção com verificação de device_id duplicado
        cur.execute(
            "INSERT INTO users (name, email, device_id) VALUES (%s, %s, %s) RETURNING id;",
            (user.name, user.email, user.device_id)
        )
        user_id = cur.fetchone()['id']
        
        # Criação automática da carteira vinculada
        cur.execute("INSERT INTO wallets (user_id, balance) VALUES (%s, 100);", (user_id,))
        db.commit()
        return {
            "status": "success",
            "user_id": str(user_id),
            "message": "Conta criada com 100 moedas bônus!"
        }
    except psycopg2.errors.UniqueViolation:
        db.rollback()
        raise HTTPException(status_code=400, detail="Este dispositivo ou e-mail já está cadastrado no sistema.")
    finally:
        cur.close()

@app.get("/users/{user_id}")
def get_user(user_id: str, db=Depends(get_db)):
    """Retorna informações do usuário e saldo atual"""
    cur = db.cursor()
    try:
        cur.execute(
            """
            SELECT u.id, u.name, u.email, u.created_at, w.balance, w.last_faucet_at
            FROM users u
            LEFT JOIN wallets w ON w.user_id = u.id
            WHERE u.id = %s;
            """,
            (user_id,)
        )
        user = cur.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="Usuário não encontrado.")
        
        return {
            "id": str(user['id']),
            "name": user['name'],
            "email": user['email'],
            "balance": user['balance'],
            "last_faucet_at": user['last_faucet_at'],
            "created_at": user['created_at']
        }
    finally:
        cur.close()

# ========================================================
# ENDPOINTS - CARTEIRA E TRANSAÇÕES
# ========================================================

@app.post("/wallet/faucet")
def daily_faucet(request: FaucetRequest, db=Depends(get_db)):
    """Sistema de resgate diário de créditos gratuitos (Apenas 1 resgate a cada 24 horas)"""
    cur = db.cursor()
    
    # Verifica se o usuário já resgatou nas últimas 24 horas
    cur.execute("SELECT id, last_faucet_at FROM wallets WHERE user_id = %s;", (request.user_id,))
    wallet = cur.fetchone()
    
    if not wallet:
        raise HTTPException(status_code=404, detail="Carteira não encontrada.")
    
    # Lógica de validação temporal baseada no fuso horário do banco
    cur.execute(
        "SELECT NOW() - last_faucet_at > INTERVAL '1 day' AS can_claim FROM wallets WHERE user_id = %s;",
        (request.user_id,)
    )
    if not cur.fetchone()['can_claim']:
        raise HTTPException(status_code=429, detail="Você já resgatou suas moedas diárias. Tente novamente amanhã.")
    
    # Atualiza o saldo (+100 moedas virtuais) e a data do último resgate
    cur.execute(
        "UPDATE wallets SET balance = balance + 100, last_faucet_at = NOW(), updated_at = NOW() WHERE user_id = %s RETURNING balance;",
        (request.user_id,)
    )
    new_balance = cur.fetchone()['balance']
    
    # Registra a transação no Ledger Imutável para auditoria
    cur.execute(
        "INSERT INTO wallet_transactions (wallet_id, type, amount, description) VALUES (%s, 'FAUCET', 100, 'Bônus Diário Gratuito');",
        (wallet['id'],)
    )
    db.commit()
    cur.close()
    return {"status": "success", "new_balance": new_balance}

@app.get("/wallet/{user_id}/transactions")
def get_wallet_transactions(user_id: str, limit: int = 20, db=Depends(get_db)):
    """Retorna o histórico de transações da carteira do usuário"""
    cur = db.cursor()
    try:
        cur.execute(
            """
            SELECT wt.type, wt.amount, wt.description, wt.created_at
            FROM wallet_transactions wt
            JOIN wallets w ON w.id = wt.wallet_id
            WHERE w.user_id = %s
            ORDER BY wt.created_at DESC
            LIMIT %s;
            """,
            (user_id, limit)
        )
        transactions = cur.fetchall()
        return {
            "transactions": [
                {
                    "type": t['type'],
                    "amount": t['amount'],
                    "description": t['description'],
                    "created_at": t['created_at']
                }
                for t in transactions
            ]
        }
    finally:
        cur.close()

# ========================================================
# ENDPOINTS - LOTERIAS E BOLÕES
# ========================================================

@app.post("/lottery/pool", status_code=201)
def create_pool(pool: PoolCreate, db=Depends(get_db)):
    """Cria um novo bolão de previsão de preço"""
    cur = db.cursor()
    try:
        expires_at = datetime.now() + timedelta(hours=pool.expires_hours)
        
        cur.execute(
            """
            INSERT INTO lottery_pools (title, product_target_id, entry_cost, prize_pool_guaranteed, expires_at)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id;
            """,
            (pool.title, pool.product_target_id, pool.entry_cost, pool.prize_pool_guaranteed, expires_at)
        )
        pool_id = cur.fetchone()['id']
        db.commit()
        
        return {
            "status": "success",
            "pool_id": str(pool_id),
            "expires_at": expires_at
        }
    finally:
        cur.close()

@app.get("/lottery/pools")
def list_pools(status: Optional[str] = "OPEN", db=Depends(get_db)):
    """Lista todos os bolões disponíveis"""
    cur = db.cursor()
    try:
        query = """
            SELECT lp.id, lp.title, lp.entry_cost, lp.prize_pool_guaranteed, 
                   lp.prize_pool_accumulated, lp.status, lp.expires_at,
                   p.name as product_name, e.name as establishment_name
            FROM lottery_pools lp
            JOIN products p ON p.id = lp.product_target_id
            JOIN establishments e ON e.id = p.establishment_id
        """
        
        if status:
            query += " WHERE lp.status = %s"
            cur.execute(query, (status,))
        else:
            cur.execute(query)
        
        pools = cur.fetchall()
        return {
            "pools": [
                {
                    "id": str(p['id']),
                    "title": p['title'],
                    "entry_cost": p['entry_cost'],
                    "prize_pool": p['prize_pool_guaranteed'] + p['prize_pool_accumulated'],
                    "status": p['status'],
                    "expires_at": p['expires_at'],
                    "product_name": p['product_name'],
                    "establishment_name": p['establishment_name']
                }
                for p in pools
            ]
        }
    finally:
        cur.close()

@app.post("/lottery/bet")
def place_bet(bet: BetRequest, db=Depends(get_db)):
    """Processa o palpite do usuário em uma Loteria de Preço reduzindo o saldo da carteira"""
    cur = db.cursor()
    
    # 1. Verifica se o bolão (pool) está aberto e ativo
    cur.execute(
        "SELECT entry_cost, status, expires_at FROM lottery_pools WHERE id = %s;",
        (bet.pool_id,)
    )
    pool = cur.fetchone()
    if not pool or pool['status'] != 'OPEN' or pool['expires_at'] < datetime.now():
        raise HTTPException(status_code=400, detail="Este bolão está fechado ou expirou.")
    
    # 2. Verifica se o usuário possui saldo suficiente
    cur.execute(
        "SELECT id, balance FROM wallets WHERE user_id = %s FOR UPDATE;",
        (bet.user_id,)
    )  # FOR UPDATE previne condições de corrida (Race Conditions)
    wallet = cur.fetchone()
    if not wallet or wallet['balance'] < pool['entry_cost']:
        raise HTTPException(status_code=402, detail="Moedas virtuais insuficientes. Use o Faucet Diário!")
    
    try:
        # 3. Deduz as moedas do saldo e adiciona o valor ao montante acumulado do bolão (Prize Pool)
        cur.execute(
            "UPDATE wallets SET balance = balance - %s WHERE id = %s;",
            (pool['entry_cost'], wallet['id'])
        )
        cur.execute(
            "UPDATE lottery_pools SET prize_pool_accumulated = prize_pool_accumulated + %s WHERE id = %s;",
            (pool['entry_cost'], bet.pool_id)
        )
        
        # 4. Salva o palpite do usuário
        cur.execute(
            "INSERT INTO pool_bets (pool_id, user_id, predicted_price) VALUES (%s, %s, %s);",
            (bet.pool_id, bet.user_id, bet.predicted_price)
        )
        
        # 5. Registra o débito na auditoria financeira
        cur.execute(
            "INSERT INTO wallet_transactions (wallet_id, type, amount, description) VALUES (%s, 'BET_ENTRY', -%s, 'Entrada no Bolão');",
            (wallet['id'], pool['entry_cost'])
        )
        db.commit()
        return {"status": "success", "message": "Palpite computado com sucesso! Boa sorte."}
    except psycopg2.errors.UniqueViolation:
        db.rollback()
        raise HTTPException(status_code=400, detail="Você já enviou um palpite para este bolão.")
    finally:
        cur.close()

@app.post("/lottery/liquidate/{pool_id}")
def liquidate_pool(pool_id: str, final_price: float, db=Depends(get_db)):
    """Liquidar um bolão manualmente com o preço final"""
    cur = db.cursor()
    try:
        cur.execute("SELECT liquidate_lottery_pool(%s, %s);", (pool_id, final_price))
        db.commit()
        return {"status": "success", "message": "Bolão liquidado com sucesso."}
    finally:
        cur.close()

# ========================================================
# ENDPOINTS - PREÇOS E CROWDSOURCING
# ========================================================

@app.post("/prices/submit")
def submit_price(price: CrowdPriceSubmit, db=Depends(get_db)):
    """Usuário envia preço de restaurante local para validação"""
    cur = db.cursor()
    try:
        # Inserir ou atualizar produto
        cur.execute(
            """
            INSERT INTO products (establishment_id, name, category)
            VALUES (%s, %s, %s)
            ON CONFLICT (establishment_id, name) DO UPDATE SET category = EXCLUDED.category
            RETURNING id;
            """,
            (price.establishment_id, price.product_name, price.category)
        )
        product_id = cur.fetchone()['id']
        
        # Inserir preço com fonte de crowdsourcing
        cur.execute(
            """
            INSERT INTO price_history (product_id, price, source, user_contributor_id, is_validated)
            VALUES (%s, %s, 'USER_CROWD', %s, FALSE)
            RETURNING id;
            """,
            (product_id, price.price, price.user_id)
        )
        price_history_id = cur.fetchone()['id']
        
        # Dar bônus ao usuário por contribuir
        cur.execute(
            "UPDATE wallets SET balance = balance + 10 WHERE user_id = %s;",
            (price.user_id,)
        )
        cur.execute(
            """
            INSERT INTO wallet_transactions (wallet_id, type, amount, description)
            SELECT id, 'CROWD_BONUS', 10, 'Bônus por contribuir com preço'
            FROM wallets WHERE user_id = %s;
            """,
            (price.user_id,)
        )
        
        db.commit()
        return {
            "status": "success",
            "price_history_id": str(price_history_id),
            "bonus_earned": 10
        }
    finally:
        cur.close()

@app.get("/prices/{product_id}/history")
def get_price_history(product_id: str, days: int = 30, db=Depends(get_db)):
    """Retorna histórico de preços de um produto"""
    cur = db.cursor()
    try:
        cur.execute(
            """
            SELECT price, source, recorded_at
            FROM price_history
            WHERE product_id = %s
            AND recorded_at > NOW() - INTERVAL '%s days'
            ORDER BY recorded_at DESC;
            """,
            (product_id, days)
        )
        history = cur.fetchall()
        return {
            "history": [
                {
                    "price": float(h['price']),
                    "source": h['source'],
                    "recorded_at": h['recorded_at']
                }
                for h in history
            ]
        }
    finally:
        cur.close()

@app.get("/establishments")
def list_establishments(db=Depends(get_db)):
    """Lista todos os estabelecimentos cadastrados"""
    cur = db.cursor()
    try:
        cur.execute("SELECT id, name, type, city, state FROM establishments;")
        establishments = cur.fetchall()
        return {
            "establishments": [
                {
                    "id": str(e['id']),
                    "name": e['name'],
                    "type": e['type'],
                    "city": e['city'],
                    "state": e['state']
                }
                for e in establishments
            ]
        }
    finally:
        cur.close()

# ========================================================
# ENDPOINTS - RECOMPENSAS
# ========================================================

@app.get("/rewards")
def list_rewards(db=Depends(get_db)):
    """Lista recompensas disponíveis no marketplace"""
    cur = db.cursor()
    try:
        cur.execute(
            "SELECT id, title, description, cost_in_coins, reward_type, stock FROM rewards WHERE is_active = TRUE;"
        )
        rewards = cur.fetchall()
        return {
            "rewards": [
                {
                    "id": str(r['id']),
                    "title": r['title'],
                    "description": r['description'],
                    "cost_in_coins": r['cost_in_coins'],
                    "reward_type": r['reward_type'],
                    "stock": r['stock']
                }
                for r in rewards
            ]
        }
    finally:
        cur.close()

@app.post("/rewards/{reward_id}/redeem")
def redeem_reward(reward_id: str, user_id: str, db=Depends(get_db)):
    """Usuário troca créditos por uma recompensa"""
    cur = db.cursor()
    try:
        # Verificar recompensa e estoque
        cur.execute(
            "SELECT cost_in_coins, stock FROM rewards WHERE id = %s AND is_active = TRUE;",
            (reward_id,)
        )
        reward = cur.fetchone()
        if not reward:
            raise HTTPException(status_code=404, detail="Recompensa não encontrada.")
        
        if reward['stock'] == 0:
            raise HTTPException(status_code=400, detail="Recompensa esgotada.")
        
        # Verificar saldo do usuário
        cur.execute(
            "SELECT id, balance FROM wallets WHERE user_id = %s FOR UPDATE;",
            (user_id,)
        )
        wallet = cur.fetchone()
        if not wallet or wallet['balance'] < reward['cost_in_coins']:
            raise HTTPException(status_code=402, detail="Saldo insuficiente.")
        
        # Processar resgate
        cur.execute(
            "UPDATE wallets SET balance = balance - %s WHERE id = %s;",
            (reward['cost_in_coins'], wallet['id'])
        )
        
        # Atualizar estoque se não for ilimitado
        if reward['stock'] > 0:
            cur.execute(
                "UPDATE rewards SET stock = stock - 1 WHERE id = %s;",
                (reward_id,)
            )
        
        # Registrar transação
        cur.execute(
            """
            INSERT INTO reward_redemptions (user_id, reward_id, coins_spent, redemption_code)
            VALUES (%s, %s, %s, 'REWARD-' || substr(md5(random()::text), 1, 8));
            """,
            (user_id, reward_id, reward['cost_in_coins'])
        )
        
        cur.execute(
            """
            INSERT INTO wallet_transactions (wallet_id, type, amount, description)
            VALUES (%s, 'REWARD_REDEEM', -%s, 'Resgate de recompensa');
            """,
            (wallet['id'], reward['cost_in_coins'])
        )
        
        db.commit()
        return {"status": "success", "message": "Recompensa resgatada com sucesso!"}
    finally:
        cur.close()

# ========================================================
# HEALTH CHECK
# ========================================================

@app.get("/health")
def health_check():
    """Endpoint para verificar se a API está funcionando"""
    return {"status": "healthy", "timestamp": datetime.now()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
