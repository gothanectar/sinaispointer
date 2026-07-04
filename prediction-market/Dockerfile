# ========================================================
# PREDICTION MARKET - FAST FOOD MVP
# Dockerfile para Python
# ========================================================

FROM python:3.12-slim

# Define diretório de trabalho
WORKDIR /app

# Instala dependências do sistema
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copia requirements e instala dependências Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Instala Playwright browsers
RUN playwright install chromium
RUN playwright install-deps chromium

# Copia arquivos da aplicação
COPY . .

# Cria diretório para logs
RUN mkdir -p /app/logs

# Comando padrão (pode ser sobrescrito no docker-compose)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
