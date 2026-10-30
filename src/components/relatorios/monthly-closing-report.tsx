
'use client';

import * as React from 'react';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BrainCircuit, TrendingUp, TrendingDown, AlertCircle, CheckCircle2, Loader2, Info } from 'lucide-react';

import { db } from '@/lib/firebase';
import type { Purchase, Revenue, Expense, MonthlyClosing } from '@/lib/types';
import { useStore } from '../auth/store-provider';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '../ui/skeleton';
import { analyzeFinancials, type AnalyzeFinancialsOutput } from '@/ai/flows/analyze-financials-flow';
import { useToast } from '@/hooks/use-toast';

interface ReportProps {
  startDate?: Date;
  endDate?: Date;
}

export default function MonthlyClosingReport({ startDate, endDate }: ReportProps) {
  const { currentStore } = useStore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(true);
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [aiAnalysis, setAiAnalysis] = React.useState<AnalyzeFinancialsOutput | null>(null);

  const [data, setData] = React.useState({
    revenue: 0,
    purchases: 0,
    cmvReal: null as number | null,
    expenses: 0,
    expensesByCategory: {} as Record<string, number>,
    netProfit: 0,
    margin: 0,
  });

  const fetchData = React.useCallback(async () => {
    if (!currentStore || !startDate || !endDate) return;
    setIsLoading(true);
    setAiAnalysis(null);

    try {
      const start = Timestamp.fromDate(startOfMonth(startDate));
      const end = Timestamp.fromDate(endOfMonth(endDate));

      // 1. Receitas
      const revQuery = query(collection(db, 'revenues'), where('storeId', '==', currentStore.id), where('date', '>=', start), where('date', '<=', end));
      const revSnap = await getDocs(revQuery);
      const totalRevenue = revSnap.docs.reduce((sum, d) => sum + (d.data() as Revenue).amount, 0);

      // 2. Compras
      const purQuery = query(collection(db, 'purchases'), where('storeId', '==', currentStore.id), where('purchaseDate', '>=', start), where('purchaseDate', '<=', end));
      const purSnap = await getDocs(purQuery);
      const totalPurchases = purSnap.docs.reduce((sum, d) => sum + (d.data() as Purchase).totalAmount, 0);

      // 3. Fechamento de CMV Real
      const monthStr = format(startDate, 'yyyy-MM');
      const closingQuery = query(collection(db, 'monthlyClosings'), where('storeId', '==', currentStore.id), where('month', '==', monthStr));
      const closingSnap = await getDocs(closingQuery);
      let cmvReal = null;
      if (!closingSnap.empty) {
        cmvReal = (closingSnap.docs[0].data() as MonthlyClosing).cmvValue;
      }

      // 4. Despesas Gerais com suporte a campos legados
      const expQuery = query(collection(db, 'expenses'), where('storeId', '==', currentStore.id));
      const expSnap = await getDocs(expQuery);
      const expensesByCategory: Record<string, number> = {};
      let totalExpenses = 0;

      const startDateMs = startOfMonth(startDate).getTime();
      const endDateMs = endOfMonth(endDate).getTime();

      expSnap.forEach(doc => {
        const exp = doc.data();
        const parseDate = (val: any) => {
            if (val instanceof Timestamp) return val.toDate();
            if (val && typeof val === 'object' && 'seconds' in val) return new Timestamp(val.seconds, val.nanoseconds).toDate();
            return val ? new Date(val) : new Date();
        };
        const expDate = parseDate(exp.expenseDate || exp.date);
        const expTime = expDate.getTime();

        if (expTime >= startDateMs && expTime <= endDateMs) {
            totalExpenses += exp.amount;
            expensesByCategory[exp.category] = (expensesByCategory[exp.category] || 0) + exp.amount;
        }
      });

      const effectiveCmv = cmvReal ?? totalPurchases;
      const margin = totalRevenue - effectiveCmv;
      const netProfit = margin - totalExpenses;

      setData({
        revenue: totalRevenue,
        purchases: totalPurchases,
        cmvReal: cmvReal,
        expenses: totalExpenses,
        expensesByCategory,
        netProfit,
        margin,
      });

    } catch (error) {
      console.error("Erro ao gerar DRE:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentStore, startDate, endDate]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAiAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeFinancials({
        month: format(startDate || new Date(), 'MMMM yyyy', { locale: ptBR }),
        revenue: data.revenue,
        cmvValue: data.cmvReal ?? data.purchases,
        cmvPercentage: data.revenue > 0 ? ((data.cmvReal ?? data.purchases) / data.revenue) * 100 : 0,
        totalExpenses: data.expenses,
        netProfit: data.netProfit,
        expensesByCategory: data.expensesByCategory,
      });
      setAiAnalysis(result);
    } catch (error) {
      toast({ title: "Erro na IA", description: "Não foi possível gerar a análise agora.", variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (isLoading) return <Skeleton className="w-full h-[600px]" />;

  const cmvValue = data.cmvReal ?? data.purchases;
  const cmvPerc = data.revenue > 0 ? (cmvValue / data.revenue) * 100 : 0;
  const profitPerc = data.revenue > 0 ? (data.netProfit / data.revenue) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>DRE - Demonstrativo de Resultado</CardTitle>
                <CardDescription>Fechamento consolidado: {format(startDate!, 'MMMM/yyyy', { locale: ptBR })}</CardDescription>
              </div>
              <Badge variant={data.netProfit >= 0 ? 'default' : 'destructive'} className="text-lg px-4 py-1">
                {data.netProfit >= 0 ? <TrendingUp className="mr-2 h-4 w-4" /> : <TrendingDown className="mr-2 h-4 w-4" />}
                {formatCurrency(data.netProfit)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                <TableRow className="bg-muted/30 font-bold">
                  <TableCell>(+) RECEITA BRUTA OPERACIONAL</TableCell>
                  <TableCell className="text-right">{formatCurrency(data.revenue)}</TableCell>
                  <TableCell className="text-right">100%</TableCell>
                </TableRow>
                <TableRow className="text-destructive font-medium">
                  <TableCell>(-) CUSTO DE MERCADORIA (CMV) {data.cmvReal ? '(Real)' : '(Base Compras)'}</TableCell>
                  <TableCell className="text-right">{formatCurrency(cmvValue)}</TableCell>
                  <TableCell className="text-right">{cmvPerc.toFixed(1)}%</TableCell>
                </TableRow>
                <TableRow className="bg-primary/5 font-bold border-y-2">
                  <TableCell>(=) MARGEM DE CONTRIBUIÇÃO</TableCell>
                  <TableCell className="text-right">{formatCurrency(data.margin)}</TableCell>
                  <TableCell className="text-right">{(100 - cmvPerc).toFixed(1)}%</TableCell>
                </TableRow>
                <TableRow className="text-muted-foreground italic">
                  <TableCell colSpan={3} className="py-2 text-xs uppercase tracking-wider">Despesas Operacionais Fixas e Variáveis</TableCell>
                </TableRow>
                {Object.entries(data.expensesByCategory).map(([cat, val]) => (
                  <TableRow key={cat}>
                    <TableCell className="pl-8">(-) {cat}</TableCell>
                    <TableCell className="text-right">{formatCurrency(val)}</TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">{((val / (data.revenue || 1)) * 100).toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-medium text-destructive">
                  <TableCell className="pl-4">TOTAL DESPESAS GERAIS</TableCell>
                  <TableCell className="text-right">{formatCurrency(data.expenses)}</TableCell>
                  <TableCell className="text-right">{((data.expenses / (data.revenue || 1)) * 100).toFixed(1)}%</TableCell>
                </TableRow>
                <TableRow className={`border-t-4 ${data.netProfit >= 0 ? 'bg-green-100 dark:bg-green-950/30' : 'bg-red-100 dark:bg-red-950/30'} font-black text-lg`}>
                  <TableCell>(=) RESULTADO LÍQUIDO (LUCRO/PREJUÍZO)</TableCell>
                  <TableCell className="text-right">{formatCurrency(data.netProfit)}</TableCell>
                  <TableCell className="text-right">{profitPerc.toFixed(1)}%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-primary/50 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-primary">
                <BrainCircuit className="h-5 w-5" />
                Consultoria Estratégica (IA)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!aiAnalysis ? (
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground mb-4">Solicite uma análise inteligente baseada nos números do seu fechamento.</p>
                  <Button onClick={handleAiAnalysis} disabled={isAnalyzing} className="w-full">
                    {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BrainCircuit className="mr-2 h-4 w-4" />}
                    Analisar Resultados
                  </Button>
                </div>
              ) : (
                <div className="space-y-6 animate-in fade-in duration-500">
                  <div>
                     <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-green-500" /> Insights Positivos
                     </h4>
                     <ul className="text-sm space-y-1">
                        {aiAnalysis.insights.map((it, i) => <li key={i} className="flex gap-2"><span>•</span> {it}</li>)}
                     </ul>
                  </div>
                  <div>
                     <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3 text-amber-500" /> Atenção Necessária
                     </h4>
                     <ul className="text-sm space-y-1">
                        {aiAnalysis.attentionPoints.map((it, i) => <li key={i} className="flex gap-2 text-amber-700 dark:text-amber-400"><span>•</span> {it}</li>)}
                     </ul>
                  </div>
                  <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                     <h4 className="text-xs font-bold uppercase text-primary mb-2">Sugestões de Melhoria</h4>
                     <ul className="text-sm space-y-2">
                        {aiAnalysis.suggestions.map((it, i) => <li key={i} className="flex gap-2 font-medium"><span>→</span> {it}</li>)}
                     </ul>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setAiAnalysis(null)} className="w-full text-xs">Recalcular Análise</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
