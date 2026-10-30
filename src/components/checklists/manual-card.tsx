
'use client';

import * as React from 'react';
import jsPDF from 'jspdf';
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
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Manual } from "@/lib/types";
import { Pencil, Trash2, Download, BookOpen, FileText } from "lucide-react";
import { useToast } from '@/hooks/use-toast';

interface ManualCardProps {
  manual: Manual;
  onEdit: () => void;
  onDelete: () => void;
}

export function ManualCard({ manual, onEdit, onDelete }: ManualCardProps) {
  const { toast } = useToast();

  const handleDownload = () => {
    // If it's an uploaded file, just open the URL
    if (manual.fileUrl) {
      window.open(manual.fileUrl, '_blank');
      return;
    }

    // If it's a text-based manual, generate PDF
    if (manual.content) {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text(manual.topic, 14, 22);
      doc.setFontSize(10);
      doc.text(`Data de Emissão: ${format(new Date(), 'dd/MM/yyyy')}`, 14, 30);
      const splitContent = doc.splitTextToSize(manual.content, 180);
      doc.setFontSize(12);
      doc.text(splitContent, 14, 45);
      const pageCount = doc.internal.pages.length - 1;
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.width - 40, doc.internal.pageSize.height - 10);
      }
      const fileName = `Manual_${manual.topic.replace(/\s+/g, '_')}.pdf`;
      doc.save(fileName);
      toast({
        title: "Download Iniciado!",
        description: `O manual ${fileName} está sendo gerado.`
      });
    }
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-row items-start gap-4 space-y-0">
        <div className="p-2 bg-muted rounded-md">
            {manual.fileUrl ? (
                <FileText className="h-6 w-6 text-primary" />
            ) : (
                <BookOpen className="h-6 w-6 text-primary" />
            )}
        </div>
        <div className="grid gap-1 flex-1">
            <CardTitle>{manual.topic}</CardTitle>
             <CardDescription className="line-clamp-2 text-xs">
                {manual.content || `Arquivo: ${manual.fileType || 'Desconhecido'}`}
            </CardDescription>
        </div>
      </CardHeader>
      <CardFooter className="justify-end gap-2 mt-auto border-t pt-4">
        <Button variant="outline" size="sm" onClick={handleDownload}>
          <Download className="mr-2 h-4 w-4" />
          {manual.fileUrl ? 'Baixar Arquivo' : 'Gerar PDF'}
        </Button>
        <Button variant="secondary" size="sm" onClick={onEdit}>
          <Pencil className="mr-2 h-4 w-4" />
          Editar
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
                Essa ação não pode ser desfeita. Isso excluirá permanentemente o manual "{manual.topic}".
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
      </CardFooter>
    </Card>
  );
}
