import requests

loterias = ['megasena', 'lotofacil', 'quina', 'lotomania', 'timemania', 'diadesorte']

print("Verificando datas dos últimos concursos:")
print("=" * 50)

for loteria in loterias:
    try:
        r = requests.get(f"https://api.guidi.dev.br/loteria/{loteria}/ultimo")
        dados = r.json()
        data = dados.get("dataApuracao")
        numero = dados.get("numero")
        print(f"{loteria.upper()}: Concurso {numero} - Data: {data}")
    except Exception as e:
        print(f"{loteria.upper()}: Erro - {e}")

print("=" * 50)
