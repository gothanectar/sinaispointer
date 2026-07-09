//+------------------------------------------------------------------+
//|                                   bot_ouro_institucional_h1_original_v2.mq5  |
//|                                                       EA Creator |
//|                                                     Versão 28.00 - Original + Telegram + Melhorias |
//+------------------------------------------------------------------+
#property copyright "EA Creator"
#property version   "28.00"
#property strict

// --- Parâmetros de Entrada ---
input double   RiscoMaximoPerc     = 1.0;       // % de Risco Real com base no Saldo (REDUZIDO de 1.5%)
input int      MagicNumber         = 20260910;  
input int      Slippage            = 20;        

// --- Parâmetros Avançados Pró-Mesa Proprietária ---
input double   ProporcaoTake       = 2.5;       // Busca sempre 2.5x o risco (REDUZIDO de 3.0%)
input double   MaxDrawdownDiarioPerc = 2.5;     // Trava diária de proteção institucional (REDUZIDO de 3.0%)

// --- NOVO: Trailing Stop ---
input bool      UsarTrailingStop    = true;      // Usar Trailing Stop
input double   TrailingStopPerc    = 0.5;       // Trailing Stop em % do lucro

// --- Parâmetros de Servidor Telegram ---
input string   ServerURL          = "https://sinaispointer.onrender.com/nova-ordem";

// --- Variáveis Globais ---
datetime ultimaVela = 0;
int handleEMA50, handleEMA100, handleEMA200;
datetime diaAtualTrava = 0;
double equityNoInicioDoDia = 0;
bool   bloqueadoHoje = false;
double precoEntrada = 0;  // Para trailing stop

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
   request.deviation    = Slippage; request.magic = MagicNumber; request.comment = "H1_Institutional_Original_v2";
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

//+------------------------------------------------------------------+
//| Gerenciar Trailing Stop                                          |
//+------------------------------------------------------------------+
void GerenciarTrailingStop() {
   if(!UsarTrailingStop) return;
   
   for(int i = PositionsTotal() - 1; i >= 0; i--) {
      if(PositionSelectByTicket(PositionGetTicket(i))) {
         if(PositionGetInteger(POSITION_MAGIC) == MagicNumber && PositionGetString(POSITION_SYMBOL) == _Symbol) {
            double currentPrice = PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY ? 
                                 SymbolInfoDouble(_Symbol, SYMBOL_BID) : 
                                 SymbolInfoDouble(_Symbol, SYMBOL_ASK);
            double openPrice = PositionGetDouble(POSITION_PRICE_OPEN);
            double currentSL = PositionGetDouble(POSITION_SL);
            
            double lucroPerc = 0;
            if(PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY) {
               lucroPerc = ((currentPrice - openPrice) / openPrice) * 100;
               if(lucroPerc > TrailingStopPerc) {
                  double novoSL = currentPrice - ((openPrice * TrailingStopPerc) / 100);
                  if(novoSL > currentSL) {
                     MqlTradeRequest request; MqlTradeResult result; ZeroMemory(request); ZeroMemory(result);
                     request.action = TRADE_ACTION_SLTP;
                     request.position = PositionGetInteger(POSITION_TICKET);
                     request.symbol = _Symbol;
                     request.sl = NormalizeDouble(novoSL, _Digits);
                     request.tp = PositionGetDouble(POSITION_TP);
                     OrderSend(request, result);
                  }
               }
            } else {
               lucroPerc = ((openPrice - currentPrice) / openPrice) * 100;
               if(lucroPerc > TrailingStopPerc) {
                  double novoSL = currentPrice + ((openPrice * TrailingStopPerc) / 100);
                  if(novoSL < currentSL || currentSL == 0) {
                     MqlTradeRequest request; MqlTradeResult result; ZeroMemory(request); ZeroMemory(result);
                     request.action = TRADE_ACTION_SLTP;
                     request.position = PositionGetInteger(POSITION_TICKET);
                     request.symbol = _Symbol;
                     request.sl = NormalizeDouble(novoSL, _Digits);
                     request.tp = PositionGetDouble(POSITION_TP);
                     OrderSend(request, result);
                  }
               }
            }
         }
      }
   }
}

int OnInit() {
   handleEMA50  = iMA(_Symbol, PERIOD_CURRENT, 50, 0, MODE_EMA, PRICE_CLOSE);
   handleEMA100 = iMA(_Symbol, PERIOD_CURRENT, 100, 0, MODE_EMA, PRICE_CLOSE);
   handleEMA200 = iMA(_Symbol, PERIOD_CURRENT, 200, 0, MODE_EMA, PRICE_CLOSE);
   if(handleEMA50 == INVALID_HANDLE || handleEMA100 == INVALID_HANDLE || handleEMA200 == INVALID_HANDLE) return(INIT_FAILED);
   
   diaAtualTrava = 0; bloqueadoHoje = false;
   return(INIT_SUCCEEDED);
}

void OnDeinit(const int reason) {
   IndicatorRelease(handleEMA50); IndicatorRelease(handleEMA100); IndicatorRelease(handleEMA200);
}

void OnTick() {
   // Gerenciar Trailing Stop em todos os ticks
   GerenciarTrailingStop();
   
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
   
   ultimaVela = velaAtual;
   double precoAtual = rates[1].close; // Executa na virada exata do candle fclose
   bool sinalCompra = false, sinalVenda = false;
   
   // LÓGICA DE ALINHAMENTO INSTITUCIONAL TRUCO (EMA 50 > 100 > 200) - MANTIDA ORIGINAL
   if(precoAtual > ema50[1] && ema50[1] > ema100[1] && ema100[1] > ema200[1]) {
      if(rates[1].close > rates[1].open) sinalCompra = true;
   }
   else if(precoAtual < ema50[1] && ema50[1] < ema100[1] && ema100[1] < ema200[1]) {
      if(rates[1].close < rates[1].open) sinalVenda = true;
   }
   
   if(sinalCompra || sinalVenda) {
      // Stop Loss Técnico Rígido: Posicionado na mínima/máxima da barra macro anterior
      double sl = sinalCompra ? rates[1].low : rates[1].high;
      double distancia = MathAbs(precoAtual - sl);
      
      // Filtro de segurança contra barras gigantescas de notícias (Black Swan protection) - MANTIDO ORIGINAL
      if(distancia > 0 && distancia < (3000 * _Point)) {
         double tp = sinalCompra ? (precoAtual + (distancia * ProporcaoTake)) : (precoAtual - (distancia * ProporcaoTake));
         double volume = CalcularLoteSeguro(sl);
         
         if(volume >= 0.01) {
            precoEntrada = precoAtual;  // Guardar preço para trailing stop
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
