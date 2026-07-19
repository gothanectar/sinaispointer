import requests

print("Verificando dados atuais de todas as loterias na API (19/07/2026):")
print("=" * 70)

loterias = ['megasena', 'lotofacil', 'quina', 'lotomania', 'timemania', 'diadesorte']

for loteria in loterias:
    try:
        r = requests.get(f"https://api.guidi.dev.br/loteria/{loteria}/ultimo")
        dados = r.json()
        data = dados.get("dataApuracao")
        numero = dados.get("numero")
        proximo = dados.get("numeroConcursoProximo")
        print(f"{loteria.upper()}:")
        print(f"  Último: {numero} - Data: {data}")
        print(f"  Próximo: {proximo}")
    except Exception as e:
        print(f"{loteria.upper()}: Erro - {e}")

print("=" * 70)
