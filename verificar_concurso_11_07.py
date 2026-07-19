import requests

# Verificar se existem concursos específicos do dia 11/07
loterias = ['lotofacil', 'quina', 'lotomania']

print("Verificando concursos do dia 11/07/2026:")
print("=" * 50)

for loteria in loterias:
    try:
        # Tentar pegar o concurso anterior ao atual
        r = requests.get(f"https://api.guidi.dev.br/loteria/{loteria}/ultimo")
        dados = r.json()
        numero_atual = dados.get("numero")
        numero_anterior = dados.get("numeroConcursoAnterior")
        
        print(f"{loteria.upper()}:")
        print(f"  Atual: {numero_atual}")
        print(f"  Anterior: {numero_anterior}")
        
        # Tentar pegar dados do concurso anterior
        if numero_anterior:
            r2 = requests.get(f"https://api.guidi.dev.br/loteria/{loteria}/{numero_anterior}")
            dados_anterior = r2.json()
            data_anterior = dados_anterior.get("dataApuracao")
            print(f"  Data do anterior: {data_anterior}")
        
        print()
    except Exception as e:
        print(f"{loteria.upper()}: Erro - {e}")
        print()

print("=" * 50)
