
'use client';

import * as React from 'react';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { Pie, PieChart, ResponsiveContainer, Tooltip, Legend, Cell } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { db } from '@/lib/firebase';
import type { Expense } from '@/lib/types';
import { useStore } from '../auth/store-provider';
import { formatCurrency } from '@/lib/utils';
import { Skeleton } from '../ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

interface ReportProps {
  startDate?: Date;
  endDate?: Date;
}

const CATEGORY_COLORS: Record<string, string> = {
  Marketing: 'hsl(var(--chart-1))',
  Utilidades: 'hsl(var(--chart-2))',
  Aluguel: 'hsl(var(--chart-3))',
  Manutenção: 'hsl(var(--chart-4))',
  Pessoal: 'hsl(var(--chart-5))',
  Impostos: 'hsl(var(--chart-6))',
  Software: 'hsl(var(--chart-7))',
  Outros: 'hsl(var(--muted))',
};

export default function GeneralExpensesReport({ startDate, endDate }: ReportProps) {
  const { currentStore } = useStore();
  const [reportData, setReportData] = React.useState<{ category: string, total: number, fill: string }[]>([]);
  const [totalSpent, setTotalSpent] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (!currentStore) return;
    setIsLoading(true);

    const fetchData = async () => {
      try {
        const q = query(collection(db, 'expenses'), where('storeId', '==', currentStore.id));
        const snap = await getDocs(q);
        
        const expenses = snap.docs.map(doc => {
            const d = doc.data();
            const parseDate = (val: any) => {
                if (val instanceof Timestamp) return val.toDate();
                if (val && typeof val === 'object' && 'seconds' in val) return new Timestamp(val.seconds, val.nanoseconds).toDate();
                return val ? new Date(val) : new Date();
            };
            return {
                ...d,
                expenseDate: parseDate(d.expenseDate || d.date)
            } as Expense;
        });

        // Filtro de data manual no cliente para suportar campos legados e novos
        const filteredExpenses = expenses.filter(e => {
            const d = e.expenseDate as Date;
            if (startDate && d < startDate) return false;
            if (endDate && d > endDate) return false;
            return true;
        });

        const totals = filteredExpenses.reduce((acc, exp) => {
          acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
          return acc;
        }, {} as Record<string, number>);

        const formatted = Object.entries(totals).map(([category, total]) => ({
          category,
          total,
          fill: CATEGORY_COLORS[category] || 'hsl(var(--muted))'
        })).sort((a, b) => b.total - a.total);

        setReportData(formatted);
        setTotalSpent(filteredExpenses.reduce((sum, e) => sum + e.amount, 0));
      } catch (error) {
        console.error("Error fetching general expenses report:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentStore, startDate, endDate]);

  const chartConfig = {
    total: { label: 'Total (R$)' },
    ...Object.fromEntries(reportData.map(d => [d.category, { label: d.category, color: d.fill }]))
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle>Resumo de Despesas Gerais</CardTitle>
                <CardDescription>Visualização consolidada de todos os gastos do período.</CardDescription>
            </div>
            <div className="text-right">
                <p className="text-xs text-muted-foreground uppercase font-bold">Total Gasto</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(totalSpent)}</p>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="w-full h-[400px]" />
        ) : reportData.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground border border-dashed rounded-lg">
            Nenhuma despesa lançada no período selecionado.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    content={<ChartTooltipContent
                      hideLabel
                      formatter={(value, name, item: any) => (
                        <div className="flex flex-col gap-1">
                          <span className="font-bold" style={{ color: item.payload.fill }}>{item.payload.category}</span>
                          <span>Total: <span className="font-bold">{formatCurrency(Number(value))}</span></span>
                        </div>
                      )}
                    />}
                  />
                  <Pie
                    data={reportData}
                    dataKey="total"
                    nameKey="category"
                    innerRadius="60%"
                    outerRadius="80%"
                    paddingAngle={5}
                  >
                    {reportData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>

            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                    <TableHead className="text-right">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.map((item) => (
                    <TableRow key={item.category}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.fill }}></div>
                          {item.category}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(item.total)}</TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {((item.total / totalSpent) * 100).toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted font-bold">
                    <TableCell>TOTAL GERAL</TableCell>
                    <TableCell className="text-right text-primary">{formatCurrency(totalSpent)}</TableCell>
                    <TableCell className="text-right">100%</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
