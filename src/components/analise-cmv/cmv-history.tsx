
'use client';
import type { MonthlyClosing } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Pencil, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { formatCurrency } from '@/lib/utils';

interface CmvHistoryProps {
  closings: MonthlyClosing[];
  onEdit: (closing: MonthlyClosing) => void;
  onDelete: (closingId: string) => void;
}

export function CmvHistory({ closings, onEdit, onDelete }: CmvHistoryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico de Fechamentos</CardTitle>
        <CardDescription>Acompanhe os resultados de CMV dos meses anteriores.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mês</TableHead>
              <TableHead className="text-right">Est. Inicial</TableHead>
              <TableHead className="text-right">Compras</TableHead>
              <TableHead className="text-right">Faturamento</TableHead>
              <TableHead className="text-right">Est. Final</TableHead>
              <TableHead className="text-right">CMV (R$)</TableHead>
              <TableHead className="text-right">CMV (%)</TableHead>
              <TableHead className="text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {closings.length > 0 ? (
                closings.map(closing => (
                    <TableRow key={closing.id}>
                        <TableCell className="font-medium capitalize">
                            {format(new Date(closing.month + '-02'), 'MMMM yyyy', { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(closing.initialStockValue)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(closing.totalPurchases)}</TableCell>
                        <TableCell className="text-right text-primary">{formatCurrency(closing.totalRevenue)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(closing.finalStockValue)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(closing.cmvValue)}</TableCell>
                        <TableCell className="text-right">
                             <Badge variant={(closing.cmvPercentage || 0) > 35 ? "destructive" : "secondary"}>
                                {(closing.cmvPercentage || 0).toFixed(2)}%
                            </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                            <div className="flex justify-center items-center">
                                <Button variant="ghost" size="icon" onClick={() => onEdit(closing)}>
                                    <Pencil className="h-4 w-4" />
                                    <span className="sr-only">Editar Fechamento</span>
                                </Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10">
                                            <Trash2 className="h-4 w-4" />
                                            <span className="sr-only">Excluir Fechamento</span>
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Essa ação não pode ser desfeita. Isso excluirá permanentemente o fechamento de <span className="font-bold">{format(new Date(closing.month + '-02'), 'MMMM yyyy', { locale: ptBR })}</span>.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => onDelete(closing.id)}>
                                                Excluir
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </TableCell>
                    </TableRow>
                ))
            ) : (
                <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground h-24">
                        Nenhum fechamento registrado.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
