import requests
import pandas as pd

ARQUIVOS_EXCEL = {
    "MEGASENA": "historicoresultadosloteriasnacionais/mega_sena_asloterias_ate_concurso_3029_crescente.xlsx",
    "LOTOFACIL": "historicoresultadosloteriasnacionais/loto_facil_asloterias_ate_concurso_3732_crescente.xlsx",
    "QUINA": "historicoresultadosloteriasnacionais/quina_asloterias_ate_concurso_7062_crescente.xlsx",
}

def obter_todos_concursos_excel(arquivo_excel):
    """Obtém TODOS os números de concursos do Excel em ordem"""
    try:
        df = pd.read_excel(arquivo_excel, header=None)
        concursos = []
        for i in range(len(df)):
            valores = [x for x in list(df.iloc[i].values) if pd.notna(x)]
            if len(valores) >= 1:
                try:
                    num_str = str(valores[0]).strip().split('.')[0]
                    num = int("".join([c for c in num_str if c.isdigit()]))
                    if num > 0:
                        concursos.append(num)
                except:
                    continue
        return sorted(concursos)
    except Exception as e:
        print(f"Erro ao ler Excel: {e}")
        return []

def identificar_gaps(concursos_excel, ultimo_api):
    """Identifica gaps na sequência de concursos"""
    if not concursos_excel:
        return []
    
    menor = min(concursos_excel)
    maior = max(concursos_excel)
    
    # Verificar gaps dentro do intervalo existente
    gaps_internos = []
    for num in range(menor, maior + 1):
        if num not in concursos_excel:
            gaps_internos.append(num)
    
    # Verificar concursos faltantes após o maior
    gaps_finais = []
    for num in range(maior + 1, ultimo_api + 1):
        gaps_finais.append(num)
    
    return {
        "menor": menor,
        "maior": maior,
        "total_excel": len(concursos_excel),
        "gaps_internos": gaps_internos,
        "gaps_finais": gaps_finais,
        "todos_gaps": gaps_internos + gaps_finais
    }

def verificar_loteria(loteria_api, loteria_local):
    """Verifica gaps em uma loteria específica"""
    arquivo_excel = ARQUIVOS_EXCEL.get(loteria_local)
    if not arquivo_excel:
        print(f"❌ Arquivo não encontrado para {loteria_local}")
        return
    
    print(f"\n{'='*70}")
    print(f"🔍 {loteria_local}:")
    print(f"{'='*70}")
    
    # Obter concursos do Excel
    concursos_excel = obter_todos_concursos_excel(arquivo_excel)
    if not concursos_excel:
        print(f"❌ Não foi possível obter concursos do Excel")
        return
    
    print(f"📊 Estatísticas do Excel:")
    print(f"   Menor concurso: {min(concursos_excel)}")
    print(f"   Maior concurso: {max(concursos_excel)}")
    print(f"   Total de concursos: {len(concursos_excel)}")
    
    # Obter último da API
    try:
        r = requests.get(f"https://api.guidi.dev.br/loteria/{loteria_api}/ultimo")
        dados = r.json()
        ultimo_api = dados.get("numero")
        print(f"📊 Último na API: {ultimo_api}")
    except Exception as e:
        print(f"❌ Erro ao obter último da API: {e}")
        return
    
    # Identificar gaps
    gaps = identificar_gaps(concursos_excel, ultimo_api)
    
    print(f"\n🔍 Análise de Gaps:")
    print(f"   Gaps internos (dentro do intervalo): {gaps['gaps_internos']}")
    print(f"   Gaps finais (após o maior): {gaps['gaps_finais']}")
    
    if gaps['todos_gaps']:
        print(f"\n⚠️  TOTAL DE CONCURSOS FALTANTES: {len(gaps['todos_gaps'])}")
        print(f"   Lista completa: {gaps['todos_gaps']}")
    else:
        print(f"\n✅ Nenhum gap encontrado - todos os concursos estão presentes!")

# Verificar as 3 loterias principais
print("🔍 VERIFICAÇÃO DETALHADA DE GAPS - MEGA SENA, QUINA, LOTOFÁCIL")
print("=" * 70)

verificar_loteria("megasena", "MEGASENA")
verificar_loteria("lotofacil", "LOTOFACIL")
verificar_loteria("quina", "QUINA")

print("\n" + "=" * 70)
print("🏁 Verificação concluída!")
