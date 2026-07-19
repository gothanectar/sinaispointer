import requests

loterias = ['megasena', 'lotofacil', 'quina', 'lotomania', 'timemania', 'diadesorte']

print("Verificando dados atuais das loterias (19/07/2026):")
print("=" * 70)

for loteria in loterias:
    try:
        r = requests.get(f"https://api.guidi.dev.br/loteria/{loteria}/ultimo")
        dados = r.json()
        data = dados.get("dataApuracao")
        numero = dados.get("numero")
        print(f"{loteria.upper()}: Concurso {numero} - Data: {data}")
    except Exception as e:
        print(f"{loteria.upper()}: Erro - {e}")

print("=" * 70)
