import requests
import pandas as pd

ARQUIVOS_EXCEL = {
    "MEGASENA": "historicoresultadosloteriasnacionais/mega_sena_asloterias_ate_concurso_3029_crescente.xlsx",
    "LOTOFACIL": "historicoresultadosloteriasnacionais/loto_facil_asloterias_ate_concurso_3732_crescente.xlsx",
    "QUINA": "historicoresultadosloteriasnacionais/quina_asloterias_ate_concurso_7062_crescente.xlsx",
    "LOTOMANIA": "historicoresultadosloteriasnacionais/loto_mania_asloterias_ate_concurso_2948_crescente.xlsx",
    "TIMEMANIA": "historicoresultadosloteriasnacionais/timemania_asloterias_ate_concurso_2414_crescente.xlsx",
    "DIASORTE": "historicoresultadosloteriasnacionais/dia_sorte_asloterias_ate_concurso_1242_crescente.xlsx"
}

def obter_concursos_excel(arquivo_excel):
    """Obtém todos os números de concursos do Excel"""
    try:
        df = pd.read_excel(arquivo_excel, header=None)
        concursos = []
        for i in range(len(df)):
            valores = [x for x in list(df.iloc[i].values) if pd.notna(x)]
            if len(valores) >= 1:
                try:
                    num = int("".join([c for c in str(valores[0]).strip().split('.')[0] if c.isdigit()]))
                    concursos.append(num)
                except:
                    continue
        return sorted(concursos, reverse=True)  # Do maior para o menor
    except Exception as e:
        print(f"Erro ao ler Excel: {e}")
        return []

def verificar_faltantes(loteria_api, loteria_local):
    """Verifica concursos faltantes entre Excel e API"""
    arquivo_excel = ARQUIVOS_EXCEL.get(loteria_local)
    if not arquivo_excel:
        print(f"❌ Arquivo não encontrado para {loteria_local}")
        return
    
    print(f"\n🔍 {loteria_local}:")
    
    # Obter concursos do Excel
    concursos_excel = obter_concursos_excel(arquivo_excel)
    if not concursos_excel:
        print(f"❌ Não foi possível obter concursos do Excel")
        return
    
    maior_excel = concursos_excel[0] if concursos_excel else 0
    print(f"   Maior no Excel: {maior_excel}")
    print(f"   Total no Excel: {len(concursos_excel)}")
    
    # Obter último da API
    try:
        r = requests.get(f"https://api.guidi.dev.br/loteria/{loteria_api}/ultimo")
        dados = r.json()
        ultimo_api = dados.get("numero")
        print(f"   Último na API: {ultimo_api}")
    except Exception as e:
        print(f"❌ Erro ao obter último da API: {e}")
        return
    
    # Verificar faltantes
    faltantes = []
    for num in range(maior_excel + 1, ultimo_api + 1):
        if num not in concursos_excel:
            faltantes.append(num)
    
    if faltantes:
        print(f"   ⚠️  Concursos faltantes: {faltantes}")
    else:
        print(f"   ✅ Todos os concursos estão presentes")

# Verificar todas as loterias
print("🔍 Verificando concursos faltantes em todas as loterias:")
print("=" * 70)

loterias = [
    ("megasena", "MEGASENA"),
    ("lotofacil", "LOTOFACIL"),
    ("quina", "QUINA"),
    ("lotomania", "LOTOMANIA"),
    ("timemania", "TIMEMANIA"),
    ("diasorte", "DIASORTE")
]

for loteria_api, loteria_local in loterias:
    verificar_faltantes(loteria_api, loteria_local)

print("=" * 70)
