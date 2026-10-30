
'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import type { DailyGoal } from '@/ai/flows/generate-sales-projection-flow';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Sun, CloudRain, PartyPopper, Calendar, Briefcase } from 'lucide-react';

interface DailyGoalCardProps {
    goal: DailyGoal;
}

const iconMap = {
    sun: <Sun className="h-4 w-4 text-yellow-500" />,
    rain: <CloudRain className="h-4 w-4 text-blue-500" />,
    event: <PartyPopper className="h-4 w-4 text-purple-500" />,
    weekend: <Calendar className="h-4 w-4 text-green-500" />,
    default: <Briefcase className="h-4 w-4 text-muted-foreground" />,
}

export function DailyGoalCard({ goal }: DailyGoalCardProps) {
    const date = new Date(goal.date + 'T00:00:00');
    const dayOfWeek = format(date, 'EEEE', { locale: ptBR });
    const dayOfMonth = format(date, 'dd/MM');
    const isWeekend = date.getDay() === 5 || date.getDay() === 6 || date.getDay() === 0;

    return (
        <Card className={cn('flex flex-col', isWeekend && 'bg-muted/50')}>
            <CardHeader className="pb-2">
                <CardTitle className="text-base text-center capitalize">
                    {dayOfWeek}
                </CardTitle>
                <p className="text-xs text-center text-muted-foreground">{dayOfMonth}</p>
            </CardHeader>
            <CardContent className="flex-grow flex items-center justify-center">
                 <div className="text-2xl font-bold text-primary text-center">
                    {formatCurrency(goal.goal)}
                </div>
            </CardContent>
            <CardFooter className="flex-col items-start text-xs text-muted-foreground border-t pt-2 pb-2 px-3">
                <div className="flex items-start gap-2">
                     {iconMap[goal.contextIcon] || iconMap.default}
                    <p className="flex-1">{goal.justification}</p>
                </div>
            </CardFooter>
        </Card>
    )
}
