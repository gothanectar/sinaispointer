import requests

print("Verificando concursos específicos da Mega Sena:")
print("=" * 70)

# Verificar concursos 3030, 3031, 3032, 3033
for num in [3030, 3031, 3032, 3033]:
    try:
        r = requests.get(f"https://api.guidi.dev.br/loteria/megasena/{num}")
        dados = r.json()
        data = dados.get("dataApuracao")
        numero = dados.get("numero")
        dezenas = dados.get("listaDezenas", [])
        print(f"Concurso {numero}: Data {data} - Dezenas: {dezenas}")
    except Exception as e:
        print(f"Concurso {num}: Erro - {e}")

print("=" * 70)
