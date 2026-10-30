
'use server';
/**
 * @fileOverview Um agente de IA para gerar manuais e Procedimentos Operacionais Padrão (POPs).
 *
 * - generateManual - Uma função que gera o conteúdo de um manual com base em um tópico.
 * - GenerateManualInput - O tipo de entrada para a função.
 * - GenerateManualOutput - O tipo de retorno para a função.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const GenerateManualInputSchema = z.object({
  topic: z.string().describe("O tópico do manual ou POP. Ex: 'Manual de Boas Práticas', 'POP de Higienização de Hortifruti'."),
});
export type GenerateManualInput = z.infer<typeof GenerateManualInputSchema>;


const GenerateManualOutputSchema = z.object({
  content: z.string().describe("O conteúdo completo do manual gerado em formato Markdown."),
});
export type GenerateManualOutput = z.infer<typeof GenerateManualOutputSchema>;


export async function generateManual(input: GenerateManualInput): Promise<GenerateManualOutput> {
  return generateManualFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateManualPrompt',
  input: { schema: GenerateManualInputSchema },
  output: { schema: GenerateManualOutputSchema },
  prompt: `Você é uma especialista em segurança alimentar e consultora de operações para restaurantes, com vasta experiência na criação de Manuais de Boas Práticas e Procedimentos Operacionais Padrão (POPs) para a Vigilância Sanitária.

Sua tarefa é criar um manual ou POP detalhado e profissional sobre o tópico: "{{topic}}".

O documento deve ser bem estruturado e formatado em Markdown. Utilize títulos, subtítulos, listas e negrito para organizar o conteúdo de forma clara e legível.

O manual deve conter, no mínimo, as seguintes seções (adapte-as conforme o tópico):
- Objetivo
- Documentos de Referência (se aplicável)
- Campo de Aplicação
- Responsabilidades
- Descrição dos Procedimentos (o passo a passo detalhado)
- Monitoramento (o que será verificado e com que frequência)
- Ações Corretivas (o que fazer em caso de desvios)
- Registros (quais planilhas ou formulários devem ser preenchidos)
- Verificação (quem e como verifica se o POP está sendo seguido)

Seja extremamente completo e técnico, utilizando a terminologia correta da área. O resultado deve ser um documento robusto, pronto para ser impresso e utilizado em uma auditoria da Vigilância Sanitária.
Gere apenas o conteúdo do documento em Markdown.
`,
});

const generateManualFlow = ai.defineFlow(
  {
    name: 'generateManualFlow',
    inputSchema: GenerateManualInputSchema,
    outputSchema: GenerateManualOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
