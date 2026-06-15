# TradePulse Enhanced - Backend Vercel

Este projeto inclui um backend Node.js hospedado no Vercel para atuar como proxy da API Apised, evitando problemas de CORS.

## Estrutura do Projeto

```
ponteiro4.0/
├── index.html              # Frontend principal
├── package.json            # Dependências do Node.js
├── api/
│   └── market-data.js     # API route do Vercel
└── README.md              # Este arquivo
```

## Como Deployar no Vercel

### Pré-requisitos
- Conta no Vercel (gratuita em https://vercel.com)
- Git instalado
- Node.js instalado (opcional, apenas para desenvolvimento local)

### Passos para Deploy

1. **Instalar Vercel CLI**
```bash
npm install -g vercel
```

2. **Fazer login no Vercel**
```bash
vercel login
```

3. **Deploy do projeto**
```bash
cd c:\Users\Micro\Documents\SITES\ponteiro4.0
vercel
```

Siga as instruções no terminal:
- Pressione Enter para confirmar o nome do projeto
- Pressione Enter para confirmar o diretório
- Pressione Enter para confirmar as configurações

4. **Deploy em produção**
```bash
vercel --prod
```

## Como Usar

Após o deploy, o Vercel fornecerá uma URL (ex: `https://ponteiro-backend.vercel.app`).

O frontend em `index.html` está configurado para usar o endpoint `/api/market-data`, que automaticamente aponta para o backend do Vercel quando hospedado.

### Testar Localmente

Para testar o backend localmente antes do deploy:

```bash
cd c:\Users\Micro\Documents\SITES\ponteiro4.0
npm install
vercel dev
```

O backend estará disponível em `http://localhost:3000/api/market-data?symbol=XAU/USD`

## Atualizar Frontend para URL de Produção

Se precisar usar uma URL específica do Vercel, atualize a configuração em `index.html`:

```javascript
const APISED_CONFIG = {
    vercelUrl: 'https://seu-projeto.vercel.app/api/market-data',
    // ...
};
```

## API Endpoint

### GET /api/market-data

Busca dados de mercado da API Apised via proxy.

**Parâmetros:**
- `symbol` (string): Símbolo do ativo (ex: XAU/USD, BTC/USD, XAG/USD, USOIL)

**Exemplo:**
```
GET /api/market-data?symbol=XAU/USD
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "price": 2655.50,
    "high": 2660.00,
    "low": 2650.00,
    "open": 2652.00,
    "volume": 1500,
    "timestamp": 1234567890
  }
}
```

## Troubleshooting

### Problema: CORS ainda bloqueando
- Certifique-se de que o backend está hospedado no Vercel
- Verifique se o endpoint está correto na configuração

### Problema: API retornando erro
- Verifique se a chave da API Apised está correta em `api/market-data.js`
- Confirme se a API Apised está funcionando

### Problema: Deploy falhando
- Verifique se `package.json` está na raiz do projeto
- Confirme se a pasta `api/` existe
- Certifique-se de que `node-fetch` está nas dependências
