//+------------------------------------------------------------------+
//|                                   bot_ouro_conservador_v3.mq5  |
//|                                                       EA Creator |
//|                                             Versão 29.00 - Nova Estratégia |
//+------------------------------------------------------------------+
#property copyright "EA Creator"
#property version   "29.00"
#property strict

// --- Parâmetros de Entrada ---
input double   RiscoMaximoPerc     = 0.3;       // % de Risco Real (muito conservador)
input int      MagicNumber         = 20260912;  
input int      Slippage            = 20;        

// --- Parâmetros de Estratégia Breakout ---
input int      PeriodoRange        = 20;        // Período para calcular range (velas)
input double   MultiplicadorSL    = 1.5;       // Multiplicador do range para SL
input double   MultiplicadorTP    = 2.0;       // Multiplicador do range para TP

// --- Filtros de Qualidade ---
input bool      UsarFiltroATR       = true;      // Usar filtro ATR
input int      ATRPeriodo          = 14;        // Período ATR
input double   ATRMaximo           = 80.0;      // ATR máximo (pontos)
input double   ATRMinimo           = 15.0;      // ATR mínimo (pontos)

input bool      UsarFiltroTendencia = true;      // Usar filtro de tendência
input int      EMAFastPeriodo      = 20;        // EMA rápida
input int      EMASlowPeriodo      = 50;        // EMA lenta

// --- Gerenciamento de Risco ---
input double   MaxDrawdownDiarioPerc = 1.5;     // Trava diária (muito conservador)
input int      MaxOperacoesDia     = 5;         // Máximo de operações por dia
input int      MinDistanciaPontos = 300;       // Distância mínima em pontos

// --- Parâmetros de Servidor Telegram ---
input string   ServerURL          = "https://sinaispointer.onrender.com/nova-ordem";

// --- Variáveis Globais ---
datetime ultimaVela = 0;
int handleATR, handleEMAFast, handleEMASlow;
datetime diaAtualTrava = 0;
double equityNoInicioDoDia = 0;
bool   bloqueadoHoje = false;
int    operacoesHoje = 0;

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
   request.deviation    = Slippage; request.magic = MagicNumber; request.comment = "Conservador_v3";
   request.type_filling = ORDER_FILLING_FOK;
   if(!OrderSend(request, result)) {
      request.type_filling = ORDER_FILLING_IOC;
      if(OrderSend(request, result)) { }
   }
}

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
   handleATR      = iATR(_Symbol, PERIOD_CURRENT, ATRPeriodo);
   handleEMAFast  = iMA(_Symbol, PERIOD_CURRENT, EMAFastPeriodo, 0, MODE_EMA, PRICE_CLOSE);
   handleEMASlow  = iMA(_Symbol, PERIOD_CURRENT, EMASlowPeriodo, 0, MODE_EMA, PRICE_CLOSE);
   
   if(handleATR == INVALID_HANDLE || handleEMAFast == INVALID_HANDLE || handleEMASlow == INVALID_HANDLE) {
      Print("Erro ao inicializar indicadores");
      return(INIT_FAILED);
   }
   
   diaAtualTrava = 0; bloqueadoHoje = false; operacoesHoje = 0;
   return(INIT_SUCCEEDED);
}

void OnDeinit(const int reason) {
   IndicatorRelease(handleATR); IndicatorRelease(handleEMAFast); IndicatorRelease(handleEMASlow);
}

void OnTick() {
   // 1. Gerenciamento do Bloqueio de Capital Diário
   MqlDateTime tm; TimeToStruct(TimeCurrent(), tm);
   datetime hoje = StringToTime(IntegerToString(tm.year)+"."+IntegerToString(tm.mon)+"."+IntegerToString(tm.day));
   
   if(hoje != diaAtualTrava) {
      diaAtualTrava = hoje;
      equityNoInicioDoDia = AccountInfoDouble(ACCOUNT_EQUITY);
      bloqueadoHoje = false;
      operacoesHoje = 0;
   }
   
   double capitalAtual = AccountInfoDouble(ACCOUNT_EQUITY);
   if(!bloqueadoHoje && (equityNoInicioDoDia - capitalAtual) >= (equityNoInicioDoDia * MaxDrawdownDiarioPerc / 100.0)) {
      bloqueadoHoje = true;
      Print("Proteção de Conta Ativada. Operações suspensas hoje.");
   }

   if(AccountInfoDouble(ACCOUNT_MARGIN_FREE) < 10.0 || bloqueadoHoje || operacoesHoje >= MaxOperacoesDia) return;
   
   // 2. Filtro Rígido de Barra H1
   datetime velaAtual = iTime(_Symbol, PERIOD_CURRENT, 0); 
   if(velaAtual == ultimaVela) return;
   if(ContarOrdensAbertas() >= 1) return;
   
   MqlRates rates[]; ArraySetAsSeries(rates, true); 
   if(CopyRates(_Symbol, PERIOD_CURRENT, 0, PeriodoRange + 5, rates) < PeriodoRange + 5) return;
   
   // 3. Calcular Range e Breakout
   double maxHigh = rates[2].high;
   double minLow = rates[2].low;
   
   for(int i = 2; i < PeriodoRange + 2; i++) {
      if(rates[i].high > maxHigh) maxHigh = rates[i].high;
      if(rates[i].low < minLow) minLow = rates[i].low;
   }
   
   double range = maxHigh - minLow;
   double rangePontos = range / _Point;
   
   // Filtro de distância mínima
   if(rangePontos < MinDistanciaPontos) {
      Print("Range muito pequeno: ", rangePontos, " pontos");
      ultimaVela = velaAtual;
      return;
   }
   
   // 4. Filtro ATR
   if(UsarFiltroATR) {
      double atr[];
      ArraySetAsSeries(atr, true);
      if(CopyBuffer(handleATR, 0, 0, 1, atr) < 1) return;
      
      double atrPontos = atr[0] / _Point;
      if(atrPontos > ATRMaximo || atrPontos < ATRMinimo) {
         Print("ATR fora do range: ", atrPontos, " pontos");
         ultimaVela = velaAtual;
         return;
      }
   }
   
   // 5. Filtro de Tendência
   if(UsarFiltroTendencia) {
      double emaFast[], emaSlow[];
      ArraySetAsSeries(emaFast, true); ArraySetAsSeries(emaSlow, true);
      if(CopyBuffer(handleEMAFast, 0, 0, 1, emaFast) < 1 || CopyBuffer(handleEMASlow, 0, 0, 1, emaSlow) < 1) return;
      
      // Só opera se as EMAs estiverem alinhadas (tendência clara)
      if(MathAbs(emaFast[0] - emaSlow[0]) < (50 * _Point)) {
         Print("Tendência muito fraca");
         ultimaVela = velaAtual;
         return;
      }
   }
   
   ultimaVela = velaAtual;
   double precoAtual = rates[1].close;
   bool sinalCompra = false, sinalVenda = false;
   
   // 6. Estratégia de Breakout
   // COMPRA: Rompe máximo do range + candle verde
   if(precoAtual > maxHigh && rates[1].close > rates[1].open) {
      sinalCompra = true;
   }
   // VENDA: Rompe mínimo do range + candle vermelho
   else if(precoAtual < minLow && rates[1].close < rates[1].open) {
      sinalVenda = true;
   }
   
   if(sinalCompra || sinalVenda) {
      // Stop Loss baseado no range
      double sl = sinalCompra ? (precoAtual - (range * MultiplicadorSL)) : (precoAtual + (range * MultiplicadorSL));
      double tp = sinalCompra ? (precoAtual + (range * MultiplicadorTP)) : (precoAtual - (range * MultiplicadorTP));
      
      double volume = CalcularLoteSeguro(sl);
      
      if(volume >= 0.01) {
         ExecutarOrdem(sinalCompra ? ORDER_TYPE_BUY : ORDER_TYPE_SELL, volume, sl, tp);
         operacoesHoje++;
         
         // Enviar sinal para Telegram
         double tp1 = sinalCompra ? (precoAtual + (range * 0.5)) : (precoAtual - (range * 0.5));
         double tp2 = sinalCompra ? (precoAtual + (range * 1.0)) : (precoAtual - (range * 1.0));
         double tp3 = tp;
         string direcao = sinalCompra ? "COMPRA" : "VENDA";
         EnviarSinalParaServidor(direcao, precoAtual, sl, tp1, tp2, tp3);
         
         Print("Operação executada. Operações hoje: ", operacoesHoje, "/", MaxOperacoesDia);
      }
   }
}
