import os
import requests
import pandas as pd
import time
from datetime import datetime

PASTA_PLANILHAS = "./historicoresultadosloteriasnacionais"
PASTA_CACHE = "./cache_loterias"

MAPA_LOTERIAS = {
    "megasena": "megasena",
    "lotofacil": "lotofacil",
    "quina": "quina",
    "lotomania": "lotomania",
    "timemania": "timemania",
    "diasorte": "diadesorte"
}

def verificar_se_ja_atualizou_hoje(loteria):
    """Verifica se a loteria específica já foi atualizada hoje."""
    if not os.path.exists(PASTA_CACHE):
        os.makedirs(PASTA_CACHE)
    
    arquivo_cache = os.path.join(PASTA_CACHE, f"{loteria}_ultima_atualizacao.txt")
    data_hoje = datetime.now().strftime("%Y-%m-%d")
    
    if os.path.exists(arquivo_cache):
        with open(arquivo_cache, "r", encoding="utf-8") as f:
            if f.read().strip() == data_hoje:
                return True
    return False

def salvar_registro_de_atualizacao(loteria):
    """Salva a data de hoje para a loteria específica."""
    if not os.path.exists(PASTA_CACHE):
        os.makedirs(PASTA_CACHE)
    
    arquivo_cache = os.path.join(PASTA_CACHE, f"{loteria}_ultima_atualizacao.txt")
    data_hoje = datetime.now().strftime("%Y-%m-%d")
    with open(arquivo_cache, "w", encoding="utf-8") as f:
        f.write(data_hoje)

def buscar_arquivo_local(loteria):
    if not os.path.exists(PASTA_PLANILHAS):
        os.makedirs(PASTA_PLANILHAS)
    for arq in os.listdir(PASTA_PLANILHAS):
        if arq.lower().replace("_", "").replace("-", "").startswith(loteria.lower()) and arq.endswith('.xlsx'):
            return os.path.join(PASTA_PLANILHAS, arq)
    return os.path.join(PASTA_PLANILHAS, f"{loteria}_asloterias.xlsx")

print("🔄 Iniciando atualização automatizada das planilhas...\n")
erros_detectados = False

for loteria_local, loteria_api in MAPA_LOTERIAS.items():
    # 🔒 TRAVA DIÁRIA POR LOTERIA: Verifica se esta loteria específica já foi atualizada hoje
    if verificar_se_ja_atualizou_hoje(loteria_local):
        print(f"⏸️ {loteria_local.upper()}: Já atualizada hoje ({datetime.now().strftime('%d/%m/%Y')}). Pulando...")
        continue
    
    try:
        url = f"https://api.guidi.dev.br/loteria/{loteria_api}/ultimo"
        resposta = requests.get(url, timeout=15)
        
        # Pausa estratégica de 2 segundos para evitar o Erro 429
        time.sleep(2)
        
        if resposta.status_code == 200:
            dados = resposta.json()
            num_concurso = int(dados.get("numero") or dados.get("concurso"))
            
            data_crua = dados.get("data") or dados.get("dataApuracao")
            if "T" in data_crua:
                data_formatada = data_crua.split("T")[0]
            else:
                dt_objeto = datetime.strptime(data_crua, "%d/%m/%Y")
                data_formatada = dt_objeto.strftime("%Y-%m-%d")
            
            # Tentar diferentes campos para as dezenas
            dezenas_raw = dados.get("listaDezenas") or dados.get("dezenas", [])
            dezenas_lista = [int(x) for x in dezenas_raw if x]
            caminho_excel = buscar_arquivo_local(loteria_local)
            
            if os.path.exists(caminho_excel):
                df_atual = pd.read_excel(caminho_excel, header=None)
                
                # Coleta concursos existentes apenas na primeira coluna (Índice 0)
                concursos_salvos = []
                for x in df_atual[0].values:
                    try:
                        c_str = str(x).strip().split('.')[0]
                        if c_str.isdigit():
                            concursos_salvos.append(int(c_str))
                    except:
                        continue
                
                if num_concurso in concursos_salvos:
                    print(f"✅ {loteria_local.upper()}: Concurso {num_concurso} já está atualizado no Excel.")
                    continue
                
                nova_linha = [num_concurso, data_formatada] + sorted(dezenas_lista)
                df_nova_linha = pd.DataFrame([nova_linha])
                df_final = pd.concat([df_nova_linha, df_atual], ignore_index=True)
                df_final.to_excel(caminho_excel, index=False, header=False)
                print(f"🚀 {loteria_local.upper()}: Novo Concurso {num_concurso} adicionado com sucesso!")
                # Salva registro de atualização para esta loteria específica
                salvar_registro_de_atualizacao(loteria_local)
            else:
                nova_linha = [num_concurso, data_formatada] + sorted(dezenas_lista)
                df_final = pd.DataFrame([nova_linha])
                df_final.to_excel(caminho_excel, index=False, header=False)
                print(f"🆕 {loteria_local.upper()}: Nova planilha criada com o Concurso {num_concurso}!")
                # Salva registro de atualização para esta loteria específica
                salvar_registro_de_atualizacao(loteria_local)
        else:
            print(f"❌ Erro ao atualizar {loteria_local}: Status HTTP {resposta.status_code}")
            erros_detectados = True
                
    except Exception as e:
        print(f"❌ Erro ao atualizar {loteria_local}: {e}")
        erros_detectados = True

print("\n🏁 Processo de varredura concluído!")
