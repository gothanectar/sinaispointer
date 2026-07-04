#!/bin/bash

# ========================================================
# SCRIPT DE CONFIGURAÇÃO - Terminal Pro Analytics
# ========================================================

echo "🚀 Configurando Terminal Pro Analytics..."

# Criar diretório de logs
mkdir -p analytics/logs

# Criar diretório de banco de dados
mkdir -p analytics/data

# Instalar dependências Python
echo "📦 Instalando dependências Python..."
pip install -r analytics/requirements.txt

# Executar motor inicial
echo "🔄 Executando motor inicial..."
cd analytics
python motor.py

echo "✅ Configuração concluída!"
echo "📊 Para iniciar a interface web: streamlit run app.py"
echo "🤖 Para executar rotina diária: python orchestrator.py"
