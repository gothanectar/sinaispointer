//+------------------------------------------------------------------+
//|                                bot_ouro_institucional_h1/m5.mq5  |
//|                                                   AI Trader Lab  |
//|                      VERSÃO FINAL: ALTA FREQUÊNCIA DE EXAUSTÃO   |
//+------------------------------------------------------------------+
#property copyright "AI Trader Lab"
#property version   "27.96"
#property strict

// --- Inclusão da Biblioteca de Trade ---
#include <Trade\Trade.mqh>
CTrade trade;

// --- Parâmetros de Entrada ---
input group "---- Gestão de Risco & Mesa ----"
input double   RiscoMaximoPerc     = 1.5;       // % de Risco Real com base no Saldo
input int      MagicNumber         = 20260915;  
input int      Slippage            = 20;        
input double   ProporcaoTake       = 1.5;       // Ajustado para 1.5x para exaustão dar lucro real sem reverter
input double   MaxDrawdownDiarioPerc = 3.0;     
input int      MaxSpreadPermitido  = 50;        // Filtro Anti-Divergência: Spread Máximo em Pontos

input group "---- Metas de Lucro Dinâmicas ----"
input double   MetaLucroDiariaDinheiro = 1500.0; 

input group "---- Proteção de Lucro (Trailing) ----"
input int      TrailingStart       = 150;       // Pontos a favor para proteger no zero a zero
input int      TrailingStep        = 50;        // Pontos para sufocar o preço e garantir o ganho

// --- Variáveis Globais ---
datetime ultimaVela = 0;
int handleEMA50, handleEMA100, handleEMA200;
datetime diaAtualTrava = 0;
double equityNoInicioDoDia = 0;
bool   bloqueadoHoje = false;
bool   metaBatidaHoje = false;

//+------------------------------------------------------------------+
//| Funções Auxiliares de Gerenciamento                              |
//+------------------------------------------------------------------+
int ContarOrdensAbertas() {
   int c = 0;
   for(int i = PositionsTotal() - 1; i >= 0; i--) {
      if(PositionGetSymbol(i) == _Symbol && PositionGetInteger(POSITION_MAGIC) == MagicNumber) c++;
   }
   return c;
}

double CalcularLoteSeguro(double sl) {
   double saldo = AccountInfoDouble(ACCOUNT_BALANCE);
   double riscoDinheiro = saldo * RiscoMaximoPerc / 100.0;
   if(saldo <= 50.0) riscoDinheiro = 0.50; // Garante lote mínimo em conta pequena
   
   double precoReferencia = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
   double distancia = MathAbs(precoReferencia - sl);
   if(distancia == 0) return 0.01;
   
   double tickSize = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE);
   double tickValue = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_VALUE);
   
   if(tickSize == 0 || tickValue == 0) return 0.01;
   
   double lote = riscoDinheiro / ((distancia / tickSize) * tickValue);
   double step = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);
   lote = MathRound(lote / step) * step;
   
   double maxVolume = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX);
   double minVolume = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
   return MathMax(minVolume, MathMin(maxVolume, lote));
}

void ExecutarOrdem(ENUM_ORDER_TYPE tipo, double volume, double sl, double tp) {
   MqlTradeRequest request; MqlTradeResult result; ZeroMemory(request); ZeroMemory(result);
   request.action       = TRADE_ACTION_DEAL; 
   request.symbol       = _Symbol; 
   request.volume       = volume; 
   request.type         = tipo;
   request.price        = (tipo == ORDER_TYPE_BUY) ? SymbolInfoDouble(_Symbol, SYMBOL_ASK) : SymbolInfoDouble(_Symbol, SYMBOL_BID);
   request.sl           = NormalizeDouble(sl, _Digits); 
   request.tp           = NormalizeDouble(tp, _Digits);
   request.deviation    = Slippage; 
   request.magic        = MagicNumber; 
   request.comment      = "Ouro_Super_H1";
   request.type_filling = ORDER_FILLING_FOK;
   
   if(!OrderSend(request, result)) {
      request.type_filling = ORDER_FILLING_IOC;
      OrderSend(request, result);
   }
}

void GerenciarTrailingStop() {
   for(int i = PositionsTotal() - 1; i >= 0; i--) {
      if(PositionGetSymbol(i) == _Symbol && PositionGetInteger(POSITION_MAGIC) == MagicNumber) {
         ulong ticket = PositionGetInteger(POSITION_TICKET);
         double currentSL = PositionGetDouble(POSITION_SL);
         double openPrice = PositionGetDouble(POSITION_PRICE_OPEN);
         ENUM_POSITION_TYPE type = (ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE);
         
         if(type == POSITION_TYPE_BUY) {
            double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
            if(bid - openPrice > TrailingStart * _Point) {
               double newSL = bid - TrailingStep * _Point;
               if(currentSL < newSL) trade.PositionModify(ticket, NormalizeDouble(newSL, _Digits), PositionGetDouble(POSITION_TP));
            }
         }
         else if(type == POSITION_TYPE_SELL) {
            double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
            if(openPrice - ask > TrailingStart * _Point) {
               double newSL = ask + TrailingStep * _Point;
               if(currentSL == 0 || currentSL > newSL) trade.PositionModify(ticket, NormalizeDouble(newSL, _Digits), PositionGetDouble(POSITION_TP));
            }
         }
      }
   }
}

//+------------------------------------------------------------------+
//| Inicialização                                                    |
//+------------------------------------------------------------------+
int OnInit() {
   trade.SetExpertMagicNumber(MagicNumber);
   
   handleEMA50  = iMA(_Symbol, PERIOD_CURRENT, 50, 0, MODE_EMA, PRICE_CLOSE);
   handleEMA100 = iMA(_Symbol, PERIOD_CURRENT, 100, 0, MODE_EMA, PRICE_CLOSE);
   handleEMA200 = iMA(_Symbol, PERIOD_CURRENT, 200, 0, MODE_EMA, PRICE_CLOSE);
   if(handleEMA50 == INVALID_HANDLE || handleEMA100 == INVALID_HANDLE || handleEMA200 == INVALID_HANDLE) return(INIT_FAILED);
   
   diaAtualTrava = 0; 
   bloqueadoHoje = false;
   metaBatidaHoje = false;
   return(INIT_SUCCEEDED);
}

void OnDeinit(const int reason) {
   IndicatorRelease(handleEMA50); 
   IndicatorRelease(handleEMA100); 
   IndicatorRelease(handleEMA200);
}

//+------------------------------------------------------------------+
//| Execução Principal por Tick                                      |
//+------------------------------------------------------------------+
void OnTick() {
   // Executa proteção dinâmica a cada tick do mercado
   GerenciarTrailingStop();

   MqlDateTime tm; TimeToStruct(TimeCurrent(), tm);
   datetime hoje = StringToTime(IntegerToString(tm.year)+"."+IntegerToString(tm.mon)+"."+IntegerToString(tm.day));
   
   if(hoje != diaAtualTrava) {
      diaAtualTrava = hoje;
      equityNoInicioDoDia = AccountInfoDouble(ACCOUNT_EQUITY);
      bloqueadoHoje = false;
      metaBatidaHoje = false;
   }
   
   double capitalAtual = AccountInfoDouble(ACCOUNT_EQUITY);
   double lucroDoDia = capitalAtual - equityNoInicioDoDia;
   
   if(!metaBatidaHoje && lucroDoDia >= MetaLucroDiariaDinheiro) {
      metaBatidaHoje = true;
   }
   if(!bloqueadoHoje && (equityNoInicioDoDia - capitalAtual) >= (equityNoInicioDoDia * MaxDrawdownDiarioPerc / 100.0)) {
      bloqueadoHoje = true;
   }

   // Filtros operacionais e de proteção diária
   if(AccountInfoDouble(ACCOUNT_MARGIN_FREE) < 2.0 || bloqueadoHoje || metaBatidaHoje) return;
   if(tm.hour < 3 || tm.hour > 17) return;
   
   // Filtro estrito de Spread para evitar disparidades de simulação
   double spreadAtual = SymbolInfoInteger(_Symbol, SYMBOL_SPREAD);
   if(spreadAtual > MaxSpreadPermitido) return;
   
   datetime velaAtual = iTime(_Symbol, PERIOD_CURRENT, 0); 
   if(velaAtual == ultimaVela) return;
   if(ContarOrdensAbertas() >= 1) return;
   
   MqlRates rates[]; ArraySetAsSeries(rates, true); 
   if(CopyRates(_Symbol, PERIOD_CURRENT, 0, 5, rates) < 5) return;
   
   double ema50[], ema100[], ema200[];
   ArraySetAsSeries(ema50, true); ArraySetAsSeries(ema100, true); ArraySetAsSeries(ema200, true);
   if(CopyBuffer(handleEMA50, 0, 0, 3, ema50) < 3 || CopyBuffer(handleEMA100, 0, 0, 3, ema100) < 3 || CopyBuffer(handleEMA200, 0, 0, 3, ema200) < 3) return;
   
   // Confirmação de fechamento de vela estável
   ultimaVela = velaAtual;
   double precoAtual = rates[1].close; 
   bool sinalCompra = false, sinalVenda = false;
   
   // --- LÓGICA DE SINAL: ALTA FREQUÊNCIA DE EXAUSTÃO ---
   // Venda na Exaustão: Preço esticado acima da média de 50 e rompeu a máxima anterior
   if(precoAtual > ema50[1]) {
      if(rates[1].close > rates[1].open && rates[1].close > rates[2].high) {
         sinalVenda = true; 
      }
   }
   // Compra na Exaustão: Preço caiu abaixo da média de 50 e rompeu a mínima anterior
   else if(precoAtual < ema50[1]) {
      if(rates[1].close < rates[1].open && rates[1].close < rates[2].low) {
         sinalCompra = true; 
      }
   }
   
   // --- EXECUÇÃO PROTOCOLAR ---
   if(sinalCompra) {
      double precoAsk = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
      double slCompra = rates[1].low - (100 * _Point); // Stop técnico abaixo da mínima da vela de exaustão
      double distanciaPontos = MathAbs(precoAsk - slCompra);
      double tpCompra = precoAsk + (distanciaPontos * ProporcaoTake);
      
      double lote = CalcularLoteSeguro(slCompra);
      if(lote > 0) ExecutarOrdem(ORDER_TYPE_BUY, lote, slCompra, tpCompra);
   }
   else if(sinalVenda) {
      double precoBid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
      double slVenda = rates[1].high + (100 * _Point); // Stop técnico acima da máxima da vela de exaustão
      double distanciaPontos = MathAbs(precoBid - slVenda);
      double tpVenda = precoBid - (distanciaPontos * ProporcaoTake);
      
      double lote = CalcularLoteSeguro(slVenda);
      if(lote > 0) ExecutarOrdem(ORDER_TYPE_SELL, lote, slVenda, tpVenda);
   }
}
//+------------------------------------------------------------------+
