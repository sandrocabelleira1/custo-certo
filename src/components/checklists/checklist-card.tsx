
'use client';

import * as React from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';

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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { Checklist } from "@/lib/types";
import { Eye, Pencil, PlayCircle, Trash2, Download } from "lucide-react";
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

interface ChecklistCardProps {
  checklist: Checklist;
  onEdit: () => void;
  onDelete: () => void;
}

export function ChecklistCard({ checklist, onEdit, onDelete }: ChecklistCardProps) {
  const { toast } = useToast();

  const handleDownloadPop = () => {
    const doc = new jsPDF();
    const tableColumn = ["Passo", "Tarefa", "Tipo de Verificação"];
    const tableRows: any[] = [];

    checklist.items.forEach((item, index) => {
        const itemData = [
            index + 1,
            item.description,
            item.type
        ];
        tableRows.push(itemData);
    });
    
    // Header
    doc.setFontSize(18);
    doc.text("Procedimento Operacional Padrão (POP)", 14, 22);
    doc.setFontSize(12);
    doc.text(checklist.name, 14, 32);

    // Sub-header
    doc.setFontSize(10);
    doc.text(`Categoria: ${checklist.category}`, 14, 40);
    doc.text(`Data de Emissão: ${format(new Date(), 'dd/MM/yyyy')}`, 14, 46);
    
    let startY = 60;
    // Description
    if(checklist.description) {
        doc.text("Descrição:", 14, 56);
        const splitDescription = doc.splitTextToSize(checklist.description, 180);
        doc.text(splitDescription, 14, 62);
        startY = 62 + (splitDescription.length * 5) + 5; // Adjust startY based on description length
    }

    // Table
    (doc as any).autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: startY,
        headStyles: { fillColor: [30, 30, 30] }, // Dark gray
        styles: { halign: 'left', valign: 'middle' },
        columnStyles: {
            0: { halign: 'center', cellWidth: 15 },
        }
    });

    // Footer
    const finalY = (doc as any).lastAutoTable.finalY || doc.internal.pageSize.height - 30;
    doc.setFontSize(10);
    doc.text("Responsável pela Execução: __________________________", 14, finalY + 20);
    doc.text("Data da Execução: ___/___/______", 14, finalY + 30);
    
    const fileName = `POP_${checklist.name.replace(/\s+/g, '_')}.pdf`;
    doc.save(fileName);

    toast({
      title: "Download Iniciado!",
      description: `O documento ${fileName} está sendo gerado.`
    });
  }


  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start gap-4">
          <CardTitle className="flex-1">{checklist.name}</CardTitle>
          <Badge variant="outline">{checklist.category}</Badge>
        </div>
        <CardDescription>{checklist.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-sm text-muted-foreground">
          {checklist.items.length} item(s) no checklist.
        </p>
      </CardContent>
      <CardFooter className="justify-between">
        <Button asChild variant="secondary">
          <Link href={`/checklists/executar/${checklist.id}`}>
            <PlayCircle className="mr-2 h-4 w-4" />
            Executar
          </Link>
        </Button>
        <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={handleDownloadPop}>
              <Download className="mr-2 h-4 w-4" />
              Baixar POP
            </Button>
            <Sheet>
                <SheetTrigger asChild>
                    <Button variant="ghost" size="icon">
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">Visualizar</span>
                    </Button>
                </SheetTrigger>
                 <SheetContent>
                    <SheetHeader>
                    <SheetTitle>{checklist.name}</SheetTitle>
                    <SheetDescription>
                        {checklist.description}
                    </SheetDescription>
                    </SheetHeader>
                    <div className="py-4">
                        <ul className="space-y-2 text-sm list-disc list-inside">
                            {checklist.items.map((item, index) => (
                                <li key={index}>{item.description} <span className="text-muted-foreground">({item.type})</span></li>
                            ))}
                        </ul>
                    </div>
                </SheetContent>
            </Sheet>
            <Button variant="ghost" size="icon" onClick={onEdit}>
                <Pencil className="h-4 w-4" />
                <span className="sr-only">Editar</span>
            </Button>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Excluir</span>
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Essa ação não pode ser desfeita. Isso excluirá permanentemente o modelo de checklist "{checklist.name}".
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={onDelete}>
                        Confirmar Exclusão
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
      </CardFooter>
    </Card>
  );
}
