import requests

try:
    # Verificar concurso 2948 (anterior ao atual 2949)
    r = requests.get("https://api.guidi.dev.br/loteria/lotomania/2948")
    dados = r.json()
    
    print("LOTOMANIA Concurso 2948:")
    print(f"Data: {dados.get('dataApuracao')}")
    print(f"Número: {dados.get('numero')}")
    
    if 'listaDezenas' in dados:
        dezenas = [int(d) for d in dados['listaDezenas']]
        print(f"Dezenas: {sorted(dezenas)}")
    else:
        print("Dezenas não encontradas")
        
except Exception as e:
    print(f"Erro: {e}")
