
'use client';

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import type { Manual } from '@/lib/types';
import { ManualCard } from './manual-card';
import { Button } from '../ui/button';
import { PlusCircle } from 'lucide-react';

interface ManualsLibraryProps {
    manuals: Manual[];
    onNew: () => void;
    onEdit: (manual: Manual) => void;
    onDelete: (manualId: string) => void;
}

export function ManualsLibrary({ manuals, onNew, onEdit, onDelete }: ManualsLibraryProps) {
    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <Button onClick={onNew}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Novo Manual com IA
                </Button>
            </div>
            {manuals.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {manuals.map(manual => (
                        <ManualCard 
                            key={manual.id}
                            manual={manual}
                            onEdit={() => onEdit(manual)}
                            onDelete={() => onDelete(manual.id)}
                        />
                    ))}
                </div>
            ) : (
                <Card>
                    <CardContent className="py-12">
                        <div className="text-center text-muted-foreground">
                            <p>Nenhum manual encontrado na biblioteca.</p>
                            <p className="text-sm">Clique em "Novo Manual com IA" para criar o seu primeiro.</p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
