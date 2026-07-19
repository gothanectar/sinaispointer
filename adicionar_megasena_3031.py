import requests
import pandas as pd

def adicionar_concurso_megasena_3031():
    """Adiciona o concurso 3031 da Mega Sena ao Excel"""
    try:
        # Obter dados do concurso 3031
        r = requests.get("https://api.guidi.dev.br/loteria/megasena/3031")
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
        
        print(f"📊 Mega Sena Concurso {num_concurso}:")
        print(f"   Data: {data_formatada}")
        print(f"   Dezenas: {sorted(dezenas_lista)}")
        
        # Ler arquivo Excel existente
        arquivo_excel = "historicoresultadosloteriasnacionais/mega_sena_asloterias_ate_concurso_3029_crescente.xlsx"
        df_existente = pd.read_excel(arquivo_excel, header=None)
        
        # Verificar se já existe
        for i in range(len(df_existente)):
            valores = [x for x in list(df_existente.iloc[i].values) if pd.notna(x)]
            if len(valores) >= 1:
                try:
                    num = int("".join([c for c in str(valores[0]).strip().split('.')[0] if c.isdigit()]))
                    if num == num_concurso:
                        print(f"✅ Concurso {num_concurso} já existe no Excel")
                        return True
                except:
                    pass
        
        # Adicionar novo concurso no topo
        nova_linha = [num_concurso, data_formatada] + sorted(dezenas_lista)
        df_nova_linha = pd.DataFrame([nova_linha])
        df_final = pd.concat([df_nova_linha, df_existente], ignore_index=True)
        df_final.to_excel(arquivo_excel, index=False, header=False)
        
        print(f"✅ Concurso {num_concurso} adicionado ao Excel!")
        return True
        
    except Exception as e:
        print(f"❌ Erro ao adicionar concurso 3031: {e}")
        return False

# Executar
adicionar_concurso_megasena_3031()
