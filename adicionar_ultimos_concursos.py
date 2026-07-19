import requests
import pandas as pd

def adicionar_concurso_especifico(loteria_api, numero_concurso, arquivo_excel):
    """Adiciona um concurso específico ao arquivo Excel"""
    try:
        r = requests.get(f"https://api.guidi.dev.br/loteria/{loteria_api}/{numero_concurso}")
        dados = r.json()
        
        num_concurso = dados.get("numero")
        if not num_concurso:
            print(f"❌ Concurso {numero_concurso} não encontrado na API")
            return False
        
        data_formatada = dados.get("dataApuracao")
        if data_formatada:
            partes = data_formatada.split('/')
            data_formatada = f"{partes[2]}-{partes[1]}-{partes[0]}"
        
        dezenas_lista = []
        if 'listaDezenas' in dados:
            dezenas_lista = [int(d) for d in dados['listaDezenas']]
        
        if len(dezenas_lista) == 0:
            print(f"❌ Concurso {numero_concurso} sem dezenas")
            return False
        
        print(f"📊 {loteria_api.upper()} Concurso {num_concurso}:")
        print(f"   Data: {data_formatada}")
        print(f"   Dezenas: {sorted(dezenas_lista)}")
        
        # Ler arquivo Excel existente
        df_existente = pd.read_excel(arquivo_excel, header=None)
        
        # Verificar se já existe
        for i in range(len(df_existente)):
            valores = [x for x in list(df_existente.iloc[i].values) if pd.notna(x)]
            if len(valores) >= 1:
                try:
                    num = int("".join([c for c in str(valores[0]).strip().split('.')[0] if c.isdigit()]))
                    if num == num_concurso:
                        print(f"   ⏭️  Já existe no Excel")
                        return True
                except:
                    pass
        
        # Adicionar novo concurso no topo
        nova_linha = [num_concurso, data_formatada] + sorted(dezenas_lista)
        df_nova_linha = pd.DataFrame([nova_linha])
        df_final = pd.concat([df_nova_linha, df_existente], ignore_index=True)
        df_final.to_excel(arquivo_excel, index=False, header=False)
        
        print(f"   ✅ Adicionado ao Excel!")
        return True
        
    except Exception as e:
        print(f"   ❌ Erro: {e}")
        return False

print("🔄 Tentando adicionar os concursos mais recentes:")
print("=" * 70)

# Mega Sena 3033
print("\nMEGA SENA:")
arquivo_megasena = "historicoresultadosloteriasnacionais/mega_sena_asloterias_ate_concurso_3029_crescente.xlsx"
adicionar_concurso_especifico("megasena", 3033, arquivo_megasena)

# Lotofácil 3739
print("\nLOTOFÁCIL:")
arquivo_lotofacil = "historicoresultadosloteriasnacionais/loto_facil_asloterias_ate_concurso_3732_crescente.xlsx"
adicionar_concurso_especifico("lotofacil", 3739, arquivo_lotofacil)

# Quina 7069
print("\nQUINA:")
arquivo_quina = "historicoresultadosloteriasnacionais/quina_asloterias_ate_concurso_7062_crescente.xlsx"
adicionar_concurso_especifico("quina", 7069, arquivo_quina)

print("\n" + "=" * 70)
print("🏁 Processo concluído!")
