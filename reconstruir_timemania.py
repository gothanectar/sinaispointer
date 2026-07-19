import requests
import pandas as pd

def reconstruir_timemania_completo():
    """Reconstrói o arquivo completo do Timemania baixando todos os concursos da API"""
    try:
        # Obter o último concurso
        r = requests.get("https://api.guidi.dev.br/loteria/timemania/ultimo")
        dados_ultimo = r.json()
        ultimo_concurso = dados_ultimo.get("numero")
        
        print(f"🔄 Reconstruindo Timemania até o concurso {ultimo_concurso}...")
        
        # Baixar todos os concursos do último até o primeiro
        todos_concursos = []
        
        for num in range(ultimo_concurso, 0, -1):
            try:
                r = requests.get(f"https://api.guidi.dev.br/loteria/timemania/{num}")
                dados = r.json()
                
                concurso_num = dados.get("numero")
                if not concurso_num:
                    continue
                
                data_formatada = dados.get("dataApuracao")
                if data_formatada:
                    partes = data_formatada.split('/')
                    data_formatada = f"{partes[2]}-{partes[1]}-{partes[0]}"
                
                dezenas_lista = []
                if 'listaDezenas' in dados:
                    dezenas_lista = [int(d) for d in dados['listaDezenas']]
                
                if len(dezenas_lista) > 0:
                    todos_concursos.append({
                        "numero": concurso_num,
                        "data": data_formatada,
                        "dezenas": sorted(dezenas_lista)
                    })
                    
                    if num % 100 == 0:
                        print(f"   Baixados {len(todos_concursos)} concursos...")
                
            except Exception as e:
                print(f"   Erro no concurso {num}: {e}")
                continue
        
        print(f"   Total de concursos baixados: {len(todos_concursos)}")
        
        # Criar DataFrame e salvar em Excel
        df = pd.DataFrame(todos_concursos)
        
        # Criar linhas no formato do Excel
        linhas_excel = []
        for _, row in df.iterrows():
            linha = [row["numero"], row["data"]] + row["dezenas"]
            linhas_excel.append(linha)
        
        df_final = pd.DataFrame(linhas_excel)
        df_final.to_excel("historicoresultadosloteriasnacionais/timemania_asloterias_ate_concurso_2416_crescente.xlsx", 
                          index=False, header=False)
        
        print(f"✅ Arquivo Timemania reconstruído com {len(todos_concursos)} concursos!")
        
    except Exception as e:
        print(f"❌ Erro ao reconstruir Timemania: {e}")

# Executar
reconstruir_timemania_completo()
