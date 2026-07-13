import pandas as pd
import json
import os
from datetime import datetime

PASTA_PLANILHAS = "./historicoresultadosloteriasnacionais"
PASTA_JSON = "./loterias_data"

# Criar pasta para JSON se não existir
if not os.path.exists(PASTA_JSON):
    os.makedirs(PASTA_JSON)

MAPEAMENTO_LOTERIAS = {
    "mega": "MEGASENA",
    "loto_facil": "LOTOFACIL",
    "quina": "QUINA",
    "loto_mania": "LOTOMANIA",
    "timemania": "TIMEMANIA",
    "dia_sorte": "DIASORTE",
    "time_mania": "TIMEMANIA"
}

def ler_planilha_excel(caminho_arquivo):
    """Lê planilha Excel e extrai dados dos concursos"""
    try:
        df = pd.read_excel(caminho_arquivo, header=None)
        
        concursos = []
        for i in range(len(df)):
            try:
                valores_linha = [x for x in list(df.iloc[i].values) if pd.notna(x)]
                
                # Pular linhas com texto de cabeçalho do site
                if len(valores_linha) < 2:
                    continue
                
                # Verificar se o primeiro valor é um número de concurso válido
                primeiro_valor = str(valores_linha[0]).strip()
                if not primeiro_valor.replace('.', '').isdigit():
                    continue
                
                # Extrair número do concurso
                limpo_concurso = "".join([c for c in primeiro_valor.split('.')[0] if c.isdigit()])
                if not limpo_concurso:
                    continue
                num_concurso = int(limpo_concurso)
                
                # Verificar se tem pelo menos data
                if len(valores_linha) < 2:
                    continue
                
                # Extrair data (segundo elemento)
                val_data = valores_linha[1]
                if isinstance(val_data, datetime):
                    dt_concurso = val_data.strftime("%Y-%m-%d")
                else:
                    dt_str = str(val_data).strip()
                    # Tentar converter string de data
                    try:
                        if '/' in dt_str:
                            dt_objeto = datetime.strptime(dt_str, "%d/%m/%Y")
                            dt_concurso = dt_objeto.strftime("%Y-%m-%d")
                        else:
                            dt_concurso = dt_str
                    except:
                        continue
                
                if not dt_concurso or "concurso" in dt_concurso.lower() or "site" in dt_concurso.lower():
                    continue
                
                # Extrair dezenas (elementos a partir do índice 2)
                dezenas_lista = []
                for val in valores_linha[2:]:
                    if pd.notna(val):
                        limpo_bola = "".join([c for c in str(val).strip().split('.')[0] if c.isdigit()])
                        if limpo_bola:
                            num_bola = int(limpo_bola)
                            if 1 <= num_bola <= 100:
                                dezenas_lista.append(num_bola)
                
                # Aceitar mesmo com poucas dezenas (pode ser atualização parcial)
                if len(dezenas_lista) < 1:
                    continue
                
                concursos.append({
                    "concurso": num_concurso,
                    "data": dt_concurso,
                    "dezenas": sorted(dezenas_lista)
                })
            except Exception:
                continue
        
        return concursos
    except Exception as e:
        print(f"Erro ao ler {caminho_arquivo}: {e}")
        return []

def processar_todas_loterias():
    """Processa todas as planilhas e gera arquivos JSON"""
    if not os.path.exists(PASTA_PLANILHAS):
        print(f"Pasta de planilhas não encontrada: {PASTA_PLANILHAS}")
        return
    
    print("🔄 Iniciando conversão de Excel para JSON...\n")
    
    for arquivo in os.listdir(PASTA_PLANILHAS):
        if not arquivo.endswith('.xlsx'):
            continue
        
        caminho_completo = os.path.join(PASTA_PLANILHAS, arquivo)
        nome_arquivo_lower = arquivo.lower().replace("_", "").replace("-", "")
        
        # Identificar qual loteria é - busca mais flexível
        loteria_codigo = None
        if "mega" in nome_arquivo_lower:
            loteria_codigo = "MEGASENA"
        elif "loto" in nome_arquivo_lower and "facil" in nome_arquivo_lower:
            loteria_codigo = "LOTOFACIL"
        elif "quina" in nome_arquivo_lower:
            loteria_codigo = "QUINA"
        elif "lotomania" in nome_arquivo_lower or "loto_mania" in nome_arquivo_lower:
            loteria_codigo = "LOTOMANIA"
        elif "timemania" in nome_arquivo_lower or "time_mania" in nome_arquivo_lower:
            loteria_codigo = "TIMEMANIA"
        elif "diasorte" in nome_arquivo_lower or "dia_sorte" in nome_arquivo_lower:
            loteria_codigo = "DIASORTE"
        
        if not loteria_codigo:
            print(f"⚠️ Arquivo não identificado: {arquivo}")
            continue
        
        # Ler dados
        concursos = ler_planilha_excel(caminho_completo)
        
        if not concursos:
            print(f"❌ Nenhum concurso encontrado em {arquivo}")
            continue
        
        # Ordenar por concurso (mais recente primeiro)
        concursos_ordenados = sorted(concursos, key=lambda x: x['concurso'], reverse=True)
        
        # Salvar como JSON
        nome_json = f"{loteria_codigo.lower()}.json"
        caminho_json = os.path.join(PASTA_JSON, nome_json)
        
        with open(caminho_json, 'w', encoding='utf-8') as f:
            json.dump(concursos_ordenados, f, ensure_ascii=False, indent=2)
        
        print(f"✅ {loteria_codigo}: {len(concursos_ordenados)} concursos convertidos -> {nome_json}")
    
    print(f"\n🎉 Conversão concluída! Arquivos JSON salvos em: {PASTA_JSON}")

if __name__ == "__main__":
    processar_todas_loterias()
