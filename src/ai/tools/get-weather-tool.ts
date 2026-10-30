'use server';
/**
 * @fileOverview Uma ferramenta de IA para buscar a previsão do tempo.
 */

import { ai } from '@/ai/genkit';
import { fetchWeatherForLocation } from '@/services/weather';
import { z } from 'zod';

export const getWeatherForecast = ai.defineTool(
  {
    name: 'getWeatherForecast',
    description: 'Busca a previsão do tempo para os próximos dias em uma cidade específica.',
    inputSchema: z.object({
      location: z.string().describe('O nome da cidade para buscar a previsão. Ex: "Xangri-Lá" ou "Capão da Canoa"'),
    }),
    outputSchema: z.string(),
  },
  async ({ location }) => {
    return await fetchWeatherForLocation(location);
  }
);
