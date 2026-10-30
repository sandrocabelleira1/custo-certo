
'use server';
/**
 * @fileOverview Um agente de IA para analisar receitas.
 *
 * - analyzeRecipe - Uma função que analisa os ingredientes de uma receita para gerar informações nutricionais e de alergênicos.
 * - AnalyzeRecipeInput - O tipo de entrada para a função analyzeRecipe.
 * - AnalyzeRecipeOutput - O tipo de retorno para a função analyzeRecipe.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const AnalyzeRecipeInputSchema = z.object({
  ingredients: z.array(z.string()).describe('Uma lista dos nomes dos ingredientes em uma receita.'),
});
export type AnalyzeRecipeInput = z.infer<typeof AnalyzeRecipeInputSchema>;

const AnalyzeRecipeOutputSchema = z.object({
  allergens: z.array(z.string()).describe('Uma lista de possíveis alergênicos encontrados nos ingredientes, como "Contém glúten", "Contém lactose", "Pode conter nozes".'),
  nutritionalInfo: z.string().describe('Uma tabela nutricional estimada para a receita, formatada como texto simples. Exemplo: "Calorias: 350kcal, Proteínas: 15g, Carboidratos: 30g, Gorduras: 18g".'),
});
export type AnalyzeRecipeOutput = z.infer<typeof AnalyzeRecipeOutputSchema>;

export async function analyzeRecipe(input: AnalyzeRecipeInput): Promise<AnalyzeRecipeOutput> {
  return analyzeRecipeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeRecipePrompt',
  input: { schema: AnalyzeRecipeInputSchema },
  output: { schema: AnalyzeRecipeOutputSchema },
  prompt: `Você é um nutricionista especialista. Analise a seguinte lista de ingredientes e forneça uma lista de alergênicos comuns e uma estimativa da informação nutricional.

Ingredientes:
{{#each ingredients}}
- {{{this}}}
{{/each}}

Alergênicos: Identifique alergênicos comuns como glúten, lactose, nozes, soja, ovos, etc.
Informação Nutricional: Forneça uma estimativa resumida em texto da tabela nutricional (calorias, proteínas, carboidratos, gorduras).
`,
});

const analyzeRecipeFlow = ai.defineFlow(
  {
    name: 'analyzeRecipeFlow',
    inputSchema: AnalyzeRecipeInputSchema,
    outputSchema: AnalyzeRecipeOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
