'use client';
import * as React from 'react';
import type { Purchase } from '@/lib/types';
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
import { Button } from '../ui/button';
import { Trash2, FileText, ChevronDown } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatCurrency } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';

interface PurchaseHistoryProps {
  purchases: Purchase[];
  onDeletePurchase: (purchaseId: string) => void;
}

export function PurchaseHistory({ purchases, onDeletePurchase }: PurchaseHistoryProps) {
  const [openPurchaseId, setOpenPurchaseId] = React.useState<string | null>(null);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[50px]"></TableHead>
          <TableHead>Data</TableHead>
          <TableHead>Fornecedor</TableHead>
          <TableHead>Nº da Nota</TableHead>
          <TableHead>Forma Pgto.</TableHead>
          <TableHead className="text-right">Valor</TableHead>
          <TableHead className="w-[80px] text-center">Ações</TableHead>
        </TableRow>
      </TableHeader>
      
      {purchases.length > 0 ? (
          purchases.map(purchase => (
            <Collapsible 
              key={purchase.id} 
              open={openPurchaseId === purchase.id} 
              onOpenChange={() => setOpenPurchaseId(prev => prev === purchase.id ? null : purchase.id)}
              asChild
            >
              <TableBody>
                <TableRow>
                    <TableCell>
                      <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                              <ChevronDown className={`h-4 w-4 transition-transform ${openPurchaseId === purchase.id ? 'rotate-180' : ''}`} />
                          </Button>
                      </CollapsibleTrigger>
                    </TableCell>
                    <TableCell>{format(purchase.purchaseDate, 'dd/MM/yy', { locale: ptBR })}</TableCell>
                    <TableCell className="font-medium">{purchase.supplierName}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                          <span className="truncate max-w-[100px] inline-block">
                              {purchase.invoiceNumber || 'N/A'}
                          </span>
                          {purchase.invoiceUrl && (
                              <Button asChild variant="ghost" size="icon" className="h-7 w-7 text-primary hover:text-primary hover:bg-primary/10 shrink-0" title="Visualizar Nota Fiscal">
                                  <a href={purchase.invoiceUrl} target="_blank" rel="noopener noreferrer">
                                      <FileText className="h-4 w-4" />
                                  </a>
                              </Button>
                          )}
                      </div>
                    </TableCell>
                    <TableCell>{purchase.paymentMethod}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(purchase.totalAmount)}</TableCell>
                    <TableCell className="text-center">
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10">
                                    <Trash2 className="h-4 w-4" />
                                    <span className="sr-only">Excluir compra</span>
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Essa ação não pode ser desfeita. Isso excluirá permanentemente a compra de{' '}
                                    <span className="font-bold">{purchase.supplierName}</span> no valor de{' '}
                                    <span className="font-bold">{formatCurrency(purchase.totalAmount)}</span>, 
                                    revertendo a entrada no estoque e removendo a conta a pagar associada.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => onDeletePurchase(purchase.id)}>
                                    Confirmar Exclusão
                                </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </TableCell>
                </TableRow>
                <CollapsibleContent asChild>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableCell colSpan={7} className="p-4">
                            <div className="space-y-4">
                                <div>
                                    <h4 className="font-semibold mb-2 text-sm uppercase tracking-wider text-muted-foreground">Itens da Compra</h4>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Produto</TableHead>
                                                <TableHead className="text-center">Quantidade</TableHead>
                                                <TableHead className="text-right">Custo Unit.</TableHead>
                                                <TableHead className="text-right">Custo Total</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {purchase.items.map((item, index) => (
                                                <TableRow key={index}>
                                                    <TableCell>{item.productName}</TableCell>
                                                    <TableCell className="text-center">{item.quantity.toFixed(3)} {item.unit}</TableCell>
                                                    <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                                                    <TableCell className="text-right font-medium">{formatCurrency(item.totalPrice)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                                {purchase.invoiceUrl && (
                                    <div className="flex justify-end">
                                        <Button asChild variant="outline" size="sm">
                                            <a href={purchase.invoiceUrl} target="_blank" rel="noopener noreferrer">
                                                <FileText className="mr-2 h-4 w-4" />
                                                Abrir Nota Fiscal Completa
                                            </a>
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </TableCell>
                    </TableRow>
                </CollapsibleContent>
              </TableBody>
            </Collapsible>
          ))
      ) : (
          <TableBody>
            <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground h-24">
                    Nenhuma compra registrada.
                </TableCell>
            </TableRow>
          </TableBody>
      )}
    </Table>
  );
}