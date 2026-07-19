import requests
import pandas as pd
from datetime import datetime

def adicionar_concurso_especifico(loteria_api, numero_concurso, arquivo_excel):
    """Adiciona um concurso específico ao arquivo Excel"""
    try:
        r = requests.get(f"https://api.guidi.dev.br/loteria/{loteria_api}/{numero_concurso}")
        dados = r.json()
        
        # Extrair dados
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
        
        if len(dezenas_lista) == 0:
            print(f"❌ {loteria_api.upper()}: Nenhuma dezena encontrada no concurso {numero_concurso}")
            return False
        
        # Ler arquivo Excel existente
        df_existente = pd.read_excel(arquivo_excel, header=None)
        
        # Verificar se concurso já existe
        concursos_existentes = []
        for i in range(len(df_existente)):
            valores = [x for x in list(df_existente.iloc[i].values) if pd.notna(x)]
            if len(valores) >= 1:
                try:
                    num = int("".join([c for c in str(valores[0]).strip().split('.')[0] if c.isdigit()]))
                    concursos_existentes.append(num)
                except:
                    pass
        
        if num_concurso in concursos_existentes:
            print(f"✅ {loteria_api.upper()}: Concurso {num_concurso} já existe no Excel")
            return True
        
        # Adicionar novo concurso
        nova_linha = [num_concurso, data_formatada] + sorted(dezenas_lista)
        df_nova_linha = pd.DataFrame([nova_linha])
        df_final = pd.concat([df_nova_linha, df_existente], ignore_index=True)
        df_final.to_excel(arquivo_excel, index=False, header=False)
        
        print(f"🚀 {loteria_api.upper()}: Concurso {num_concurso} adicionado com sucesso!")
        return True
        
    except Exception as e:
        print(f"❌ {loteria_api.upper()}: Erro ao adicionar concurso {numero_concurso}: {e}")
        return False

# Adicionar concursos faltantes do dia 11/07
print("Adicionando concursos faltantes do dia 11/07/2026:")
print("=" * 50)

# Lotofácil 3733
adicionar_concurso_especifico(
    "lotofacil", 
    3733, 
    "historicoresultadosloteriasnacionais/loto_facil_asloterias_ate_concurso_3732_crescente.xlsx"
)

# Quina 7063
adicionar_concurso_especifico(
    "quina", 
    7063, 
    "historicoresultadosloteriasnacionais/quina_asloterias_ate_concurso_7062_crescente.xlsx"
)

print("=" * 50)
print("Processo concluído!")
