import requests
import pandas as pd
from datetime import datetime

MAPA_LOTERIAS = {
    "megasena": "MEGASENA",
    "lotofacil": "LOTOFACIL", 
    "quina": "QUINA",
    "lotomania": "LOTOMANIA",
    "timemania": "TIMEMANIA",
    "diasorte": "DIASORTE"
}

ARQUIVOS_EXCEL = {
    "MEGASENA": "historicoresultadosloteriasnacionais/mega_sena_asloterias_ate_concurso_3029_crescente.xlsx",
    "LOTOFACIL": "historicoresultadosloteriasnacionais/loto_facil_asloterias_ate_concurso_3732_crescente.xlsx",
    "QUINA": "historicoresultadosloteriasnacionais/quina_asloterias_ate_concurso_7062_crescente.xlsx",
    "LOTOMANIA": "historicoresultadosloteriasnacionais/loto_mania_asloterias_ate_concurso_2948_crescente.xlsx",
    "TIMEMANIA": "historicoresultadosloteriasnacionais/timemania_asloterias_ate_concurso_2414_crescente.xlsx",
    "DIASORTE": "historicoresultadosloteriasnacionais/dia_sorte_asloterias_ate_concurso_1242_crescente.xlsx"
}

def obter_ultimo_concurso_excel(arquivo_excel):
    """Obtém o número do último concurso no arquivo Excel"""
    try:
        df = pd.read_excel(arquivo_excel, header=None)
        for i in range(len(df)):
            valores = [x for x in list(df.iloc[i].values) if pd.notna(x)]
            if len(valores) >= 1:
                try:
                    num = int("".join([c for c in str(valores[0]).strip().split('.')[0] if c.isdigit()]))
                    return num
                except:
                    continue
        return None
    except Exception as e:
        print(f"Erro ao ler Excel: {e}")
        return None

def obter_dados_concurso(loteria_api, numero_concurso):
    """Obtém dados de um concurso específico da API"""
    try:
        r = requests.get(f"https://api.guidi.dev.br/loteria/{loteria_api}/{numero_concurso}")
        dados = r.json()
        
        num_concurso = dados.get("numero")
        data_formatada = dados.get("dataApuracao")
        
        # Converter data de DD/MM/YYYY para YYYY-MM-DD
        if data_formatada:
            partes = data_formatada.split('/')
            data_formatada = f"{partes[2]}-{partes[1]}-{partes[0]}"
        
        # Extrair dezenas
        dezenas_lista = []
        if 'listaDezenas' in dados:
            dezenas_lista = [int(d) for d in dados['listaDezenas']]
        
        return {
            "numero": num_concurso,
            "data": data_formatada,
            "dezenas": sorted(dezenas_lista)
        }
    except Exception as e:
        print(f"Erro ao obter concurso {numero_concurso}: {e}")
        return None

def adicionar_concurso_excel(arquivo_excel, dados_concurso):
    """Adiciona um concurso ao arquivo Excel"""
    try:
        df_existente = pd.read_excel(arquivo_excel, header=None)
        
        # Verificar se já existe
        for i in range(len(df_existente)):
            valores = [x for x in list(df_existente.iloc[i].values) if pd.notna(x)]
            if len(valores) >= 1:
                try:
                    num = int("".join([c for c in str(valores[0]).strip().split('.')[0] if c.isdigit()]))
                    if num == dados_concurso["numero"]:
                        return False  # Já existe
                except:
                    pass
        
        # Adicionar novo concurso no topo
        nova_linha = [dados_concurso["numero"], dados_concurso["data"]] + dados_concurso["dezenas"]
        df_nova_linha = pd.DataFrame([nova_linha])
        df_final = pd.concat([df_nova_linha, df_existente], ignore_index=True)
        df_final.to_excel(arquivo_excel, index=False, header=False)
        return True
    except Exception as e:
        print(f"Erro ao adicionar ao Excel: {e}")
        return False

def atualizar_loteria_completa(loteria_api, loteria_local):
    """Atualiza uma loteria adicionando todos os concursos faltantes"""
    arquivo_excel = ARQUIVOS_EXCEL.get(loteria_local)
    if not arquivo_excel:
        print(f"❌ Arquivo Excel não encontrado para {loteria_local}")
        return
    
    print(f"\n🔄 Processando {loteria_local}...")
    
    # Obter último concurso no Excel
    ultimo_excel = obter_ultimo_concurso_excel(arquivo_excel)
    if not ultimo_excel:
        print(f"❌ Não foi possível obter último concurso do Excel")
        return
    
    print(f"   Último no Excel: {ultimo_excel}")
    
    # Obter último concurso da API
    try:
        r = requests.get(f"https://api.guidi.dev.br/loteria/{loteria_api}/ultimo")
        dados_ultimo = r.json()
        ultimo_api = dados_ultimo.get("numero")
        print(f"   Último na API: {ultimo_api}")
    except Exception as e:
        print(f"❌ Erro ao obter último da API: {e}")
        return
    
    if ultimo_api <= ultimo_excel:
        print(f"✅ {loteria_local} já está atualizado")
        return
    
    # Adicionar todos os concursos faltantes em ordem
    concursos_adicionados = 0
    for num in range(ultimo_excel + 1, ultimo_api + 1):
        dados = obter_dados_concurso(loteria_api, num)
        if dados and dados["dezenas"]:
            if adicionar_concurso_excel(arquivo_excel, dados):
                print(f"   ✅ Concurso {num} adicionado")
                concursos_adicionados += 1
            else:
                print(f"   ⏭️  Concurso {num} já existe ou sem dados")
        else:
            print(f"   ⚠️  Concurso {num} não encontrado ou sem dezenas")
    
    print(f"🎉 {loteria_local}: {concursos_adicionados} concursos adicionados")

# Atualizar todas as loterias
print("🔄 Iniciando atualização completa de todas as loterias...")
print("=" * 70)

for loteria_api, loteria_local in MAPA_LOTERIAS.items():
    atualizar_loteria_completa(loteria_api, loteria_local)

print("=" * 70)
print("🏁 Processo concluído!")
