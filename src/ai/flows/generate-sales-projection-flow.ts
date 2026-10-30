
'use server';
/**
 * @fileOverview Um agente de IA para projetar metas de vendas diárias.
 *
 * - generateSalesProjection - Uma função que distribui uma meta de faturamento restante entre os dias restantes no mês.
 * - GenerateSalesProjectionInput - O tipo de entrada para a função.
 * - GenerateSalesProjectionOutput - O tipo de retorno para a função.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { addDays, format } from 'date-fns';
import { getWeatherForecast } from '../tools/get-weather-tool';

const GenerateSalesProjectionInputSchema = z.object({
  remainingRevenue: z.number().describe("O valor total de faturamento que ainda precisa ser alcançado no mês."),
  remainingDays: z.number().int().describe("O número de dias restantes no mês, incluindo o dia de hoje."),
  today: z.string().describe("A data de hoje no formato 'yyyy-MM-dd'."),
  storeLocation: z.string().describe("A cidade onde a loja está localizada, para contexto de eventos e clima. Ex: 'Capão da Canoa'"),
});
export type GenerateSalesProjectionInput = z.infer<typeof GenerateSalesProjectionInputSchema>;

const DailyGoalSchema = z.object({
    date: z.string().describe("A data da meta no formato 'yyyy-MM-dd'."),
    goal: z.number().describe("O valor da meta de faturamento para este dia específico."),
    justification: z.string().describe("Uma breve justificativa para a meta, mencionando fatores como dia da semana, previsão do tempo ou eventos locais. Ex: 'Fim de semana com previsão de sol.'"),
    contextIcon: z.enum(['default', 'weekend', 'rain', 'sun', 'event']).describe("Um ícone para representar o principal contexto da justificativa."),
});
export type DailyGoal = z.infer<typeof DailyGoalSchema>;

const GenerateSalesProjectionOutputSchema = z.object({
  dailyGoals: z.array(DailyGoalSchema).describe("Uma lista de metas de faturamento diárias para os próximos dias."),
});
export type GenerateSalesProjectionOutput = z.infer<typeof GenerateSalesProjectionOutputSchema>;


export async function generateSalesProjection(input: GenerateSalesProjectionInput): Promise<GenerateSalesProjectionOutput> {
  const projectionDays = input.remainingDays;

  const days = Array.from({ length: projectionDays }).map((_, i) => {
    const date = addDays(new Date(input.today + 'T00:00:00'), i);
    return {
      date: format(date, 'yyyy-MM-dd'),
    };
  });

  const flowInput = {
    ...input,
    days: days,
  };
  
  return generateSalesProjectionFlow(flowInput);
}

const prompt = ai.definePrompt({
  name: 'generateSalesProjectionPrompt',
  input: { schema: z.any() }, // A entrada é um pouco mais complexa agora
  output: { schema: GenerateSalesProjectionOutputSchema },
  tools: [getWeatherForecast],
  prompt: `Você é um especialista em gestão financeira de restaurantes localizados em cidades de praia no sul do Brasil. Sua tarefa é distribuir uma meta de faturamento restante entre os dias que faltam no mês, considerando fatores que influenciam o movimento.

Meta de Faturamento Restante: {{{remainingRevenue}}}
Localização da Loja: {{{storeLocation}}}
Dias para distribuir a meta:
{{#each days}}
- Data: {{date}}
{{/each}}

Instruções:
1. Use a ferramenta 'getWeatherForecast' para obter a previsão do tempo para a cidade fornecida em 'storeLocation'.
2. Distribua a "Meta de Faturamento Restante" entre os dias listados. A soma de todas as metas diárias ("goal") DEVE ser exatamente igual à "Meta de Faturamento Restante".
3. Aplique um peso maior para Sextas-feiras, Sábados e Domingos, pois eles costumam ter mais movimento.
4. Para cada dia, crie uma "justification" curta e plausível. Utilize a previsão do tempo que você obteve para justificar as metas. A justificativa deve mencionar se há previsão de sol ou chuva.
   - Exemplo para Sábado com sol: "Sábado com previsão de sol, alto movimento esperado." (contextIcon: 'sun' ou 'weekend')
   - Exemplo para Terça chuvosa: "Terça com chuva, movimento deve ser menor." (contextIcon: 'rain')
   - Exemplo sem dados de tempo: "Sexta-feira, início de fim de semana, movimento tende a ser maior." (contextIcon: 'weekend')
5. Para cada dia, defina o "contextIcon" mais apropriado: 'weekend' para sextas/sábados/domingos, 'sun' para previsão de sol, 'rain' para chuva, 'event' para feriados/eventos, ou 'default' para dias normais.
6. Retorne a lista de metas no campo "dailyGoals". Gere metas para todos os dias fornecidos. Não repita o mesmo padrão de valores para semanas diferentes.
`,
});

const generateSalesProjectionFlow = ai.defineFlow(
  {
    name: 'generateSalesProjectionFlow',
    inputSchema: z.any(),
    outputSchema: GenerateSalesProjectionOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    
    // Verificação e ajuste final para garantir que a soma bate com o total.
    if (output && output.dailyGoals && output.dailyGoals.length > 0) {
        const totalProjected = output.dailyGoals.reduce((sum, goal) => sum + goal.goal, 0);
        const difference = input.remainingRevenue - totalProjected;

        if (Math.abs(difference) > 0.01) {
            // Distribui a diferença igualmente. Uma abordagem simples para corrigir pequenos desvios da IA.
            const adjustment = difference / output.dailyGoals.length;
            output.dailyGoals.forEach(goal => {
                goal.goal += adjustment;
            });
        }
    }
    
    return output!;
  }
);
