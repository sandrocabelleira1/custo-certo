
'use server';

import { z } from 'zod';

const WeatherResponseSchema = z.object({
    cod: z.union([z.string(), z.number()]),
    message: z.union([z.string(), z.number()]).optional(),
    list: z.array(z.object({
        dt: z.number(),
        main: z.object({
            temp: z.number(),
        }),
        weather: z.array(z.object({
            main: z.string(),
            description: z.string(),
        })),
        dt_txt: z.string(),
    })).optional(),
});


export async function fetchWeatherForLocation(location: string): Promise<string> {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
        console.warn('API Key do OpenWeather não configurada. Usando dados simulados.');
        return 'Previsão indisponível. Usando simulação: tempo bom, sem chuva.';
    }

    // A API do OpenWeather pode usar "Nome da Cidade, Código do País"
    const locationQuery = `${location},BR`;
    const url = `https://api.openweathermap.org/data/2.5/forecast?q=${locationQuery}&appid=${apiKey}&units=metric&lang=pt_br`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Erro na API do OpenWeather: ${errorData.message}`);
        }
        const data = await response.json();
        
        const parsedData = WeatherResponseSchema.safeParse(data);
        if (!parsedData.success || !parsedData.data.list) {
             throw new Error('Formato de resposta da API do OpenWeather inesperado.');
        }

        const forecastByDay: Record<string, { temps: number[], weather: string[] }> = {};

        parsedData.data.list.forEach(item => {
            const date = item.dt_txt.split(' ')[0]; // Pega apenas a parte da data
            if (!forecastByDay[date]) {
                forecastByDay[date] = { temps: [], weather: [] };
            }
            forecastByDay[date].temps.push(item.main.temp);
            // CORREÇÃO: Usar 'description' em vez de 'main' para obter a previsão detalhada e traduzida.
            forecastByDay[date].weather.push(item.weather[0].description);
        });

        let summarizedForecast = 'Resumo da previsão para os próximos dias:\n';
        Object.entries(forecastByDay).slice(0, 7).forEach(([date, dailyData]) => {
            const avgTemp = dailyData.temps.reduce((a, b) => a + b, 0) / dailyData.temps.length;
            const mostCommonWeather = dailyData.weather
                .sort((a,b) => dailyData.weather.filter(v => v===a).length - dailyData.weather.filter(v => v===b).length)
                .pop();
            summarizedForecast += `- ${date}: ${mostCommonWeather}, temperatura média de ${avgTemp.toFixed(1)}°C.\n`;
        });
        
        return summarizedForecast;

    } catch (error) {
        console.error('Falha ao buscar previsão do tempo:', error);
        return 'Erro ao obter previsão. Usando simulação: tempo bom, sem chuva.';
    }
}
