'use server';
/**
 * @fileOverview Agente de IA para análise de saúde financeira (DRE).
 *
 * - analyzeFinancials - Analisa os resultados mensais e fornece insights estratégicos.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const AnalyzeFinancialsInputSchema = z.object({
  month: z.string(),
  revenue: z.number(),
  cmvValue: z.number(),
  cmvPercentage: z.number(),
  totalExpenses: z.number(),
  netProfit: z.number(),
  expensesByCategory: z.record(z.number()),
});
export type AnalyzeFinancialsInput = z.infer<typeof AnalyzeFinancialsInputSchema>;

const AnalyzeFinancialsOutputSchema = z.object({
  status: z.enum(['positivo', 'alerta', 'critico']).describe('O estado geral da saúde financeira do mês.'),
  insights: z.array(z.string()).describe('Lista de pontos positivos e conquistas identificadas.'),
  attentionPoints: z.array(z.string()).describe('Lista de gastos ou indicadores que exigem atenção imediata.'),
  suggestions: z.array(z.string()).describe('Sugestões práticas de melhoria para o próximo mês.'),
});
export type AnalyzeFinancialsOutput = z.infer<typeof AnalyzeFinancialsOutputSchema>;

export async function analyzeFinancials(input: AnalyzeFinancialsInput): Promise<AnalyzeFinancialsOutput> {
  return analyzeFinancialsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeFinancialsPrompt',
  input: { schema: AnalyzeFinancialsInputSchema },
  output: { schema: AnalyzeFinancialsOutputSchema },
  prompt: `Você é um consultor financeiro sênior especializado em gastronomia e restaurantes. 
Analise os resultados do fechamento mensal abaixo e forneça um diagnóstico profissional.

DADOS DO MÊS:
- Mês: {{month}}
- Faturamento Total: R$ {{revenue}}
- CMV (Custo de Mercadoria): R$ {{cmvValue}} ({{cmvPercentage}}%)
- Despesas Operacionais: R$ {{totalExpenses}}
- Lucro Líquido: R$ {{netProfit}}

DESPESAS POR CATEGORIA:
{{#each expensesByCategory}}
- {{@key}}: R$ {{this}}
{{/each}}

DIRETRIZES DE ANÁLISE:
1. CMV Ideal: Entre 28% e 35%. Acima de 35% é ALERTA. Acima de 40% é CRÍTICO.
2. Lucro Líquido Ideal: Acima de 15% do faturamento.
3. Analise se alguma despesa específica (Marketing, Pessoal, Logística) está muito alta em relação ao faturamento.

Retorne um diagnóstico estruturado em: Status, Insights, Pontos de Atenção e Sugestões Práticas.
`,
});

const analyzeFinancialsFlow = ai.defineFlow(
  {
    name: 'analyzeFinancialsFlow',
    inputSchema: AnalyzeFinancialsInputSchema,
    outputSchema: AnalyzeFinancialsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
