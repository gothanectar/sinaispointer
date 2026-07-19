import requests
import pandas as pd

def corrigir_dezenas_concurso(loteria_api, numero_concurso, arquivo_excel):
    """Corrige as dezenas de um concurso específico no Excel"""
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
        
        print(f"📊 {loteria_api.upper()} Concurso {num_concurso}:")
        print(f"   Data: {data_formatada}")
        print(f"   Dezenas: {sorted(dezenas_lista)}")
        
        # Ler arquivo Excel existente
        df_existente = pd.read_excel(arquivo_excel, header=None)
        
        # Encontrar e substituir a linha do concurso
        for i in range(len(df_existente)):
            valores = [x for x in list(df_existente.iloc[i].values) if pd.notna(x)]
            if len(valores) >= 1:
                try:
                    num = int("".join([c for c in str(valores[0]).strip().split('.')[0] if c.isdigit()]))
                    if num == num_concurso:
                        # Substituir a linha com as dezenas corretas
                        nova_linha = [num_concurso, data_formatada] + sorted(dezenas_lista)
                        # Preencher com NaN para manter o mesmo número de colunas
                        while len(nova_linha) < len(df_existente.columns):
                            nova_linha.append(None)
                        df_existente.iloc[i] = nova_linha
                        df_existente.to_excel(arquivo_excel, index=False, header=False)
                        print(f"✅ {loteria_api.upper()}: Dezenas corrigidas no Excel!")
                        return True
                except:
                    pass
        
        print(f"❌ {loteria_api.upper()}: Concurso {num_concurso} não encontrado no Excel")
        return False
        
    except Exception as e:
        print(f"❌ {loteria_api.upper()}: Erro ao corrigir concurso {numero_concurso}: {e}")
        return False

# Corrigir concursos do dia 11/07
print("Corrigindo dezenas dos concursos do dia 11/07/2026:")
print("=" * 50)

# Lotofácil 3733
corrigir_dezenas_concurso(
    "lotofacil", 
    3733, 
    "historicoresultadosloteriasnacionais/loto_facil_asloterias_ate_concurso_3732_crescente.xlsx"
)

# Quina 7063
corrigir_dezenas_concurso(
    "quina", 
    7063, 
    "historicoresultadosloteriasnacionais/quina_asloterias_ate_concurso_7062_crescente.xlsx"
)

print("=" * 50)
print("Processo concluído!")
