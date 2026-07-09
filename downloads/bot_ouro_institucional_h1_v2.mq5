//+------------------------------------------------------------------+
//|                                   bot_ouro_institucional_h1_v2.mq5  |
//|                                                       EA Creator |
//|                                                     Versão 27.00 - Melhorada |
//+------------------------------------------------------------------+
#property copyright "EA Creator"
#property version   "27.00"
#property strict

// --- Parâmetros de Entrada ---
input double   RiscoMaximoPerc     = 1.0;       // % de Risco Real com base no Saldo
input int      MagicNumber         = 20260914;  
input int      Slippage            = 20;        

// --- Parâmetros Avançados Pró-Mesa Proprietária ---
input double   ProporcaoTake       = 2.5;       // Busca sempre 2.5x o risco
input double   MaxDrawdownDiarioPerc = 3.0;     // Trava diária de proteção institucional

// --- NOVOS FILTROS DE CONSISTÊNCIA ---
input bool      UsarFiltroATR       = false;     // Usar filtro de volatilidade ATR (desativado)
input double   ATRPeriodo          = 14;        // Período do ATR
input double   ATRMaximo           = 100.0;     // ATR máximo para entrar (pontos)
input double   ATRMinimo           = 5.0;       // ATR mínimo para entrar (pontos)

input bool      UsarFiltroRSI       = false;     // Usar filtro RSI (desativado)
input int      RSIPeriodo          = 14;        // Período do RSI
input int      RSIMaximo           = 80;        // RSI máximo para compra
input int      RSIMinimo           = 20;        // RSI mínimo para venda

input bool      UsarFiltroADX       = false;     // Usar filtro de força de tendência (desativado)
input int      ADXPeriodo          = 14;        // Período do ADX
input double   ADXMinimo           = 15;        // ADX mínimo para entrar (tendência forte)

input bool      UsarFiltroSessao   = false;     // Usar filtro de sessão (desativado)
input int      HoraInicioSessao   = 8;         // Hora início sessão (GMT)
input int      HoraFimSessao       = 20;        // Hora fim sessão (GMT)

input double   DistanciaMinimaSL   = 0;         // Distância mínima do SL em pontos (desativado)

// --- Parâmetros de Servidor Telegram ---
input string   ServerURL          = "https://sinaispointer.onrender.com/nova-ordem";

// --- Variáveis Globais ---
datetime ultimaVela = 0;
int handleEMA50, handleEMA100, handleEMA200;
int handleATR, handleRSI, handleADX;
datetime diaAtualTrava = 0;
double equityNoInicioDoDia = 0;
bool   bloqueadoHoje = false;

int ContarOrdensAbertas() {
   int c = 0;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
      if(PositionGetSymbol(i) == _Symbol && PositionGetInteger(POSITION_MAGIC) == MagicNumber) c++;
   return c;
}

double CalcularLoteSeguro(double sl) {
   double saldo = AccountInfoDouble(ACCOUNT_BALANCE);
   double riscoDinheiro = saldo * RiscoMaximoPerc / 100.0;
   double precoReferencia = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
   double distancia = MathAbs(precoReferencia - sl);
   if(distancia == 0) return 0.01;
   
   double lote = riscoDinheiro / ((distancia / SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE)) * SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_VALUE));
   double step = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);
   lote = MathRound(lote / step) * step;
   
   double maxVolume = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX);
   double minVolume = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
   return MathMax(minVolume, MathMin(maxVolume, lote));
}

void ExecutarOrdem(ENUM_ORDER_TYPE tipo, double volume, double sl, double tp) {
   MqlTradeRequest request; MqlTradeResult result; ZeroMemory(request); ZeroMemory(result);
   request.action       = TRADE_ACTION_DEAL; request.symbol = _Symbol; request.volume = volume; request.type = tipo;
   request.price        = (tipo == ORDER_TYPE_BUY) ? SymbolInfoDouble(_Symbol, SYMBOL_ASK) : SymbolInfoDouble(_Symbol, SYMBOL_BID);
   request.sl           = NormalizeDouble(sl, _Digits); request.tp = NormalizeDouble(tp, _Digits);
   request.deviation    = Slippage; request.magic = MagicNumber; request.comment = "H1_Institutional_v2";
   request.type_filling = ORDER_FILLING_FOK;
   if(!OrderSend(request, result)) {
      request.type_filling = ORDER_FILLING_IOC;
      if(OrderSend(request, result)) { }
   }
}

//+------------------------------------------------------------------+
//| Enviar sinal para servidor Telegram                              |
//+------------------------------------------------------------------+
void EnviarSinalParaServidor(string direcao, double entry, double sl, double tp1, double tp2, double tp3)
{
   string json = StringFormat("{\"symbol\":\"XAUUSD\",\"action\":\"%s\",\"price\":%.2f,\"sl\":%.2f,\"tp1\":%.2f,\"tp2\":%.2f,\"tp3\":%.2f,\"robot_id\":\"%d\"}",
                              direcao, entry, sl, tp1, tp2, tp3, MagicNumber);

   char post[], res[];
   string resultHeaders;
   string headers = "Content-Type: application/json\r\n";
   StringToCharArray(json, post);

   int timeout = 10000;
   int resCode = WebRequest("POST", ServerURL, headers, timeout, post, res, resultHeaders);
   
   if(resCode == 200)
      Print("✅ Sinal enviado para servidor com sucesso! Robô ID: ", MagicNumber);
   else
      Print("❌ Erro ao enviar sinal. Código: ", resCode);
}

int OnInit() {
   handleEMA50  = iMA(_Symbol, PERIOD_CURRENT, 50, 0, MODE_EMA, PRICE_CLOSE);
   handleEMA100 = iMA(_Symbol, PERIOD_CURRENT, 100, 0, MODE_EMA, PRICE_CLOSE);
   handleEMA200 = iMA(_Symbol, PERIOD_CURRENT, 200, 0, MODE_EMA, PRICE_CLOSE);
   handleATR    = iATR(_Symbol, PERIOD_CURRENT, ATRPeriodo);
   handleRSI    = iRSI(_Symbol, PERIOD_CURRENT, RSIPeriodo, PRICE_CLOSE);
   handleADX    = iADX(_Symbol, PERIOD_CURRENT, ADXPeriodo);
   
   if(handleEMA50 == INVALID_HANDLE || handleEMA100 == INVALID_HANDLE || handleEMA200 == INVALID_HANDLE ||
      handleATR == INVALID_HANDLE || handleRSI == INVALID_HANDLE || handleADX == INVALID_HANDLE) {
      Print("Erro ao inicializar indicadores");
      return(INIT_FAILED);
   }
   
   diaAtualTrava = 0; bloqueadoHoje = false;
   return(INIT_SUCCEEDED);
}

void OnDeinit(const int reason) {
   IndicatorRelease(handleEMA50); IndicatorRelease(handleEMA100); IndicatorRelease(handleEMA200);
   IndicatorRelease(handleATR); IndicatorRelease(handleRSI); IndicatorRelease(handleADX);
}

void OnTick() {
   // 1. Gerenciamento do Bloqueio de Capital Diário
   MqlDateTime tm; TimeToStruct(TimeCurrent(), tm);
   datetime hoje = StringToTime(IntegerToString(tm.year)+"."+IntegerToString(tm.mon)+"."+IntegerToString(tm.day));
   
   if(hoje != diaAtualTrava) {
      diaAtualTrava = hoje;
      equityNoInicioDoDia = AccountInfoDouble(ACCOUNT_EQUITY);
      bloqueadoHoje = false;
   }
   
   double capitalAtual = AccountInfoDouble(ACCOUNT_EQUITY);
   if(!bloqueadoHoje && (equityNoInicioDoDia - capitalAtual) >= (equityNoInicioDoDia * MaxDrawdownDiarioPerc / 100.0)) {
      bloqueadoHoje = true;
      Print("Proteção de Conta Ativada. Operações suspensas hoje.");
   }

   if(AccountInfoDouble(ACCOUNT_MARGIN_FREE) < 10.0 || bloqueadoHoje) return;
   
   // 2. Filtro Rígido de Barra H1
   datetime velaAtual = iTime(_Symbol, PERIOD_CURRENT, 0); 
   if(velaAtual == ultimaVela) return;
   if(ContarOrdensAbertas() >= 1) return;
   
   MqlRates rates[]; ArraySetAsSeries(rates, true); 
   if(CopyRates(_Symbol, PERIOD_CURRENT, 0, 5, rates) < 5) return;
   
   double ema50[], ema100[], ema200[];
   ArraySetAsSeries(ema50, true); ArraySetAsSeries(ema100, true); ArraySetAsSeries(ema200, true);
   if(CopyBuffer(handleEMA50, 0, 0, 3, ema50) < 3 || CopyBuffer(handleEMA100, 0, 0, 3, ema100) < 3 || CopyBuffer(handleEMA200, 0, 0, 3, ema200) < 3) return;
   
   // 3. FILTROS DE CONSISTÊNCIA
   double atr[], rsi[], adx[];
   ArraySetAsSeries(atr, true); ArraySetAsSeries(rsi, true); ArraySetAsSeries(adx, true);
   
   if(UsarFiltroATR && CopyBuffer(handleATR, 0, 0, 1, atr) < 1) return;
   if(UsarFiltroRSI && CopyBuffer(handleRSI, 0, 0, 1, rsi) < 1) return;
   if(UsarFiltroADX && CopyBuffer(handleADX, 0, 0, 1, adx) < 1) return;
   
   // Filtro de Volatilidade ATR
   if(UsarFiltroATR) {
      double atrValor = atr[0] / _Point;
      if(atrValor > ATRMaximo || atrValor < ATRMinimo) {
         Print("Filtro ATR: Volatilidade fora do range. ATR: ", atrValor, " pontos");
         return;
      }
   }
   
   // Filtro de RSI (evitar overbought/oversold extremo)
   if(UsarFiltroRSI) {
      if(rsi[0] > RSIMaximo || rsi[0] < RSIMinimo) {
         Print("Filtro RSI: RSI fora do range. RSI: ", rsi[0]);
         return;
      }
   }
   
   // Filtro de Força de Tendência ADX
   if(UsarFiltroADX) {
      if(adx[0] < ADXMinimo) {
         Print("Filtro ADX: Tendência muito fraca. ADX: ", adx[0]);
         return;
      }
   }
   
   // Filtro de Sessão
   if(UsarFiltroSessao) {
      if(tm.hour < HoraInicioSessao || tm.hour >= HoraFimSessao) {
         Print("Filtro Sessão: Fora do horário de negociação");
         return;
      }
   }
   
   ultimaVela = velaAtual;
   double precoAtual = rates[1].close;
   bool sinalCompra = false, sinalVenda = false;
   
   // LÓGICA ULTRA-SIMPLES: Candlestick Pattern
   // COMPRA: Candle verde (close > open)
   if(rates[1].close > rates[1].open) {
      sinalCompra = true;
   }
   // VENDA: Candle vermelho (close < open)
   else if(rates[1].close < rates[1].open) {
      sinalVenda = true;
   }
   
   if(sinalCompra || sinalVenda) {
      // Stop Loss Técnico Rígido: Posicionado na mínima/máxima da barra macro anterior
      double sl = sinalCompra ? rates[1].low : rates[1].high;
      double distancia = MathAbs(precoAtual - sl);
      
      // Sem filtro de barras gigantescas - permite qualquer operação
      if(distancia > 0) {
         double tp = sinalCompra ? (precoAtual + (distancia * ProporcaoTake)) : (precoAtual - (distancia * ProporcaoTake));
         double volume = CalcularLoteSeguro(sl);
         
         if(volume >= 0.01) {
            ExecutarOrdem(sinalCompra ? ORDER_TYPE_BUY : ORDER_TYPE_SELL, volume, sl, tp);
            
            // Enviar sinal para Telegram
            double tp1 = sinalCompra ? (precoAtual + (distancia * 1.0)) : (precoAtual - (distancia * 1.0));
            double tp2 = sinalCompra ? (precoAtual + (distancia * 1.5)) : (precoAtual - (distancia * 1.5));
            double tp3 = tp;
            string direcao = sinalCompra ? "COMPRA" : "VENDA";
            EnviarSinalParaServidor(direcao, precoAtual, sl, tp1, tp2, tp3);
         }
      }
   }
}
