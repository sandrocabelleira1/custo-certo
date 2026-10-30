
'use server';
/**
 * @fileOverview Um agente de IA para gerar itens de checklist para operações de restaurante.
 *
 * - generateChecklist - Uma função que gera uma lista de tarefas para um checklist com base em um tópico.
 * - GenerateChecklistInput - O tipo de entrada para a função.
 * - GenerateChecklistOutput - O tipo de retorno para a função.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ChecklistItemSchema = z.object({
  description: z.string().describe("A descrição clara e concisa da tarefa a ser executada."),
  type: z.enum(['checkbox', 'text', 'number', 'photo']).describe("O tipo de resposta esperado para a tarefa. 'checkbox' para sim/não, 'text' para uma resposta escrita, 'number' para um valor numérico (ex: temperatura), 'photo' para um upload de imagem como comprovante."),
});

const GenerateChecklistInputSchema = z.object({
  topic: z.string().describe("O tópico ou objetivo do checklist. Ex: 'Abertura de cozinha', 'Limpeza da fritadeira', 'Recebimento de mercadorias frias'."),
  category: z.string().describe("A categoria do checklist, para dar contexto adicional à IA. Ex: 'Abertura', 'Fechamento', 'POPs', 'Limpeza'."),
});
export type GenerateChecklistInput = z.infer<typeof GenerateChecklistInputSchema>;


const GenerateChecklistOutputSchema = z.object({
  items: z.array(ChecklistItemSchema).describe("Uma lista de itens de checklist gerados pela IA."),
});
export type GenerateChecklistOutput = z.infer<typeof GenerateChecklistOutputSchema>;


export async function generateChecklist(input: GenerateChecklistInput): Promise<GenerateChecklistOutput> {
  return generateChecklistFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateChecklistPrompt',
  input: { schema: GenerateChecklistInputSchema },
  output: { schema: GenerateChecklistOutputSchema },
  prompt: `Você é um especialista em segurança alimentar e operações de restaurantes, com vasta experiência na criação de Procedimentos Operacionais Padrão (POPs).
Sua tarefa é criar uma lista de verificação (checklist) detalhada e profissional para o seguinte tópico: "{{topic}}", dentro da categoria "{{category}}".

Para cada item da lista, forneça uma descrição clara da tarefa e sugira o tipo de resposta mais adequado.

Tipos de resposta disponíveis:
- 'checkbox': Para tarefas simples de sim/não ou verificação visual.
- 'text': Quando uma anotação escrita é necessária.
- 'number': Para registrar valores numéricos, como temperaturas ou contagens.
- 'photo': Para tarefas que exigem um comprovante visual (ex: limpeza concluída).

Seja completo e considere todos os aspectos de segurança, qualidade e eficiência relevantes para a tarefa.
Gere uma lista de itens que cubra todo o procedimento.
`,
});

const generateChecklistFlow = ai.defineFlow(
  {
    name: 'generateChecklistFlow',
    inputSchema: GenerateChecklistInputSchema,
    outputSchema: GenerateChecklistOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
