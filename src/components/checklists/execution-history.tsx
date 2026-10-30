
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { ChecklistExecution, ChecklistExecutionItem } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Eye, Check, Pilcrow, Hash, ImageIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';

interface ExecutionHistoryProps {
  executions: ChecklistExecution[];
}

export function ExecutionHistory({ executions }: ExecutionHistoryProps) {

  const getItemIcon = (type: string) => {
    switch(type) {
        case 'checkbox': return <Check className="h-4 w-4 text-muted-foreground" />;
        case 'text': return <Pilcrow className="h-4 w-4 text-muted-foreground" />;
        case 'number': return <Hash className="h-4 w-4 text-muted-foreground" />;
        case 'photo': return <ImageIcon className="h-4 w-4 text-muted-foreground" />;
        default: return null;
    }
  }

  const renderAnswer = (item: ChecklistExecutionItem) => {
    if (item.type === 'checkbox') {
        return <Badge variant={item.answer ? 'default' : 'destructive'}>{item.answer ? 'Sim' : 'Não'}</Badge>;
    }
    if (item.type === 'photo') {
        // TODO: Render image preview
        return <span className="text-sm text-muted-foreground italic">Upload de foto pendente</span>;
    }
    return <span className="text-sm">{item.answer}</span>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico de Execuções</CardTitle>
        <CardDescription>
          Visualize todos os checklists que já foram preenchidos pela equipe.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data e Hora</TableHead>
              <TableHead>Checklist</TableHead>
              <TableHead>Executado por</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {executions.length > 0 ? (
              executions.map(exec => (
                <TableRow key={exec.id}>
                  <TableCell className="font-medium">
                    {format(exec.executionDate.toDate(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                  </TableCell>
                  <TableCell>{exec.checklistName}</TableCell>
                  <TableCell>{exec.completedByUserName}</TableCell>
                  <TableCell>
                    <Badge variant={exec.status === 'Completo' ? 'secondary' : 'outline'}>
                      {exec.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                                <Eye className="mr-2 h-4 w-4" />
                                Visualizar
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                            <DialogHeader>
                                <DialogTitle>{exec.checklistName}</DialogTitle>
                                <DialogDescription>
                                    Executado por {exec.completedByUserName} em {format(exec.executionDate.toDate(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="max-h-[60vh] overflow-y-auto space-y-4 pr-4">
                                {exec.answers.map(answer => (
                                    <div key={answer.itemId} className="p-3 border rounded-lg grid md:grid-cols-2 gap-4 items-center">
                                        <div className="flex items-center gap-2 font-medium">
                                            {getItemIcon(answer.type)}
                                            <span>{answer.description}</span>
                                        </div>
                                        <div>
                                            {renderAnswer(answer)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                  Nenhuma execução de checklist encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
