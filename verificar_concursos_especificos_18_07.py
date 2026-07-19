import requests

print("Verificando concursos específicos:")
print("=" * 70)

# Mega Sena 3033
try:
    r = requests.get("https://api.guidi.dev.br/loteria/megasena/3033")
    dados = r.json()
    print(f"MEGA SENA 3033:")
    print(f"  Data: {dados.get('dataApuracao')}")
    print(f"  Número: {dados.get('numero')}")
    if 'listaDezenas' in dados:
        print(f"  Dezenas: {dados['listaDezenas']}")
except Exception as e:
    print(f"MEGA SENA 3033: Erro - {e}")

print()

# Lotofácil 3739
try:
    r = requests.get("https://api.guidi.dev.br/loteria/lotofacil/3739")
    dados = r.json()
    print(f"LOTOFÁCIL 3739:")
    print(f"  Data: {dados.get('dataApuracao')}")
    print(f"  Número: {dados.get('numero')}")
    if 'listaDezenas' in dados:
        print(f"  Dezenas: {dados['listaDezenas']}")
except Exception as e:
    print(f"LOTOFÁCIL 3739: Erro - {e}")

print()

# Quina 7069
try:
    r = requests.get("https://api.guidi.dev.br/loteria/quina/7069")
    dados = r.json()
    print(f"QUINA 7069:")
    print(f"  Data: {dados.get('dataApuracao')}")
    print(f"  Número: {dados.get('numero')}")
    if 'listaDezenas' in dados:
        print(f"  Dezenas: {dados['listaDezenas']}")
except Exception as e:
    print(f"QUINA 7069: Erro - {e}")

print("=" * 70)
