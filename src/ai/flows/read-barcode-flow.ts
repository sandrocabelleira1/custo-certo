
'use server';
/**
 * @fileOverview Um agente de IA para ler códigos de barras de imagens.
 * 
 * - readBarcode - Uma função que lida com a leitura do código de barras de uma imagem.
 * - ReadBarcodeInput - O tipo de entrada para a função readBarcode.
 * - ReadBarcodeOutput - O tipo de retorno para a função readBarcode.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import sharp from 'sharp';

const ReadBarcodeInputSchema = z.object({
  photoDataUri: z.string().describe(
    "Uma foto de um código de barras, como um data URI que deve incluir um tipo MIME e usar codificação Base64. Formato esperado: 'data:<mimetype>;base64,<dados_codificados>'."
  ),
});
export type ReadBarcodeInput = z.infer<typeof ReadBarcodeInputSchema>;

const ReadBarcodeOutputSchema = z.object({
  barcode: z.string().describe('Os números extraídos do código de barras.'),
});
export type ReadBarcodeOutput = z.infer<typeof ReadBarcodeOutputSchema>;

export async function readBarcode(input: ReadBarcodeInput): Promise<ReadBarcodeOutput> {
  return readBarcodeFlow(input);
}

// Helper para pré-processar a imagem para melhor desempenho do OCR
async function preprocessImage(photoDataUri: string): Promise<string> {
    const base64Data = photoDataUri.split(',')[1];
    const buffer = Buffer.from(base64Data, 'base64');
    
    const processedBuffer = await sharp(buffer)
        .grayscale() // Converte para escala de cinza
        .resize(1000) // Redimensiona para uma largura razoável
        .sharpen() // Aumenta a nitidez
        .normalize() // Aumenta o contraste
        .toFormat('jpeg')
        .toBuffer();

    return `data:image/jpeg;base64,${processedBuffer.toString('base64')}`;
}


const prompt = ai.definePrompt({
  name: 'readBarcodePrompt',
  input: { schema: ReadBarcodeInputSchema },
  output: { schema: ReadBarcodeOutputSchema },
  prompt: `Você é um especialista em OCR (Reconhecimento Óptico de Caracteres). Sua tarefa é extrair a sequência numérica exata de um código de barras a partir da imagem fornecida. Ignore qualquer outro texto ou símbolo na imagem. Forneça apenas os números do código de barras.

Imagem: {{media url=photoDataUri}}`,
});

const readBarcodeFlow = ai.defineFlow(
  {
    name: 'readBarcodeFlow',
    inputSchema: ReadBarcodeInputSchema,
    outputSchema: ReadBarcodeOutputSchema,
  },
  async (input) => {
    const processedImageUri = await preprocessImage(input.photoDataUri);
    const { output } = await prompt({ photoDataUri: processedImageUri });
    
    // Remove quaisquer caracteres não numéricos da saída
    const numericBarcode = output?.barcode.replace(/\D/g, '') || '';

    return { barcode: numericBarcode };
  }
);
