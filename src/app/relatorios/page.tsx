'use client';

import * as React from 'react';
import PageHeader from "@/components/page-header";
import AbcChart from "@/components/relatorios/abc-chart";
import CostAnalysisReport from "@/components/relatorios/cost-analysis-report";
import MostPurchasedReport from "@/components/relatorios/most-purchased-report";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DatePicker } from "@/components/ui/datepicker";
import { Button } from "@/components/ui/button";
import SpendingReport from '@/components/relatorios/spending-report';
import CategoryCostChart from '@/components/relatorios/category-cost-chart';
import PaymentMethodReport from '@/components/relatorios/payment-method-report';
import GeneralExpensesReport from '@/components/relatorios/general-expenses-report';
import MonthlyClosingReport from '@/components/relatorios/monthly-closing-report';
import { startOfMonth, endOfMonth } from 'date-fns';

export default function RelatoriosPage() {
  const [dateRange, setDateRange] = React.useState<{startDate: Date | undefined, endDate: Date | undefined}>({
    startDate: startOfMonth(new Date()),
    endDate: endOfMonth(new Date())
  });

  const [tempStartDate, setTempStartDate] = React.useState<Date | undefined>(dateRange.startDate);
  const [tempEndDate, setTempEndDate] = React.useState<Date | undefined>(dateRange.endDate);

  const handleFilter = () => {
    setDateRange({
      startDate: tempStartDate,
      endDate: tempEndDate
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Relatórios e Inteligência"
        description="Analise dados detalhados e receba consultoria automática baseada no seu desempenho."
      />
      
      <Tabs defaultValue="fechamento_mensal">
        <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
            <TabsList className="overflow-x-auto justify-start h-auto flex-wrap bg-transparent gap-1 p-0">
                <TabsTrigger value="fechamento_mensal" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border font-bold">Fechamento Mensal (DRE)</TabsTrigger>
                <TabsTrigger value="mais_comprados" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border">Mais Comprados</TabsTrigger>
                <TabsTrigger value="valores_gastos" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border">Valores Gastos</TabsTrigger>
                <TabsTrigger value="despesas_gerais" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border">Despesas Gerais</TabsTrigger>
                <TabsTrigger value="formas_pagamento" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border">Formas de Pagamento</TabsTrigger>
                <TabsTrigger value="custo_categoria" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border">Custo por Categoria</TabsTrigger>
                <TabsTrigger value="analise_custo" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border">Análise de Custo</TabsTrigger>
                <TabsTrigger value="curva_abc" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border">Curva ABC</TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg border">
                <span className="text-xs font-bold uppercase text-muted-foreground px-2">Período:</span>
                <DatePicker date={tempStartDate} setDate={setTempStartDate} className="w-[180px]" />
                <DatePicker date={tempEndDate} setDate={setTempEndDate} className="w-[180px]" />
                <Button onClick={handleFilter}>Filtrar</Button>
            </div>
        </div>

        <TabsContent value="fechamento_mensal">
            <MonthlyClosingReport startDate={dateRange.startDate} endDate={dateRange.endDate} />
        </TabsContent>
        <TabsContent value="mais_comprados">
            <MostPurchasedReport startDate={dateRange.startDate} endDate={dateRange.endDate} />
        </TabsContent>
        <TabsContent value="valores_gastos">
            <SpendingReport startDate={dateRange.startDate} endDate={dateRange.endDate} />
        </TabsContent>
        <TabsContent value="despesas_gerais">
            <GeneralExpensesReport startDate={dateRange.startDate} endDate={dateRange.endDate} />
        </TabsContent>
        <TabsContent value="formas_pagamento">
            <PaymentMethodReport startDate={dateRange.startDate} endDate={dateRange.endDate} />
        </TabsContent>
        <TabsContent value="custo_categoria">
            <CategoryCostChart startDate={dateRange.startDate} endDate={dateRange.endDate} />
        </TabsContent>
        <TabsContent value="analise_custo">
            <CostAnalysisReport startDate={dateRange.startDate} endDate={dateRange.endDate} />
        </TabsContent>
        <TabsContent value="curva_abc">
            <AbcChart startDate={dateRange.startDate} endDate={dateRange.endDate} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
