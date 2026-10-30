
'use client';

import * as React from 'react';
import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { Textarea } from '../ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface ManualPreviewProps {
    topic: string;
    content: string;
    onContentChange: (newContent: string) => void;
}

export default function ManualPreview({ topic, content, onContentChange }: ManualPreviewProps) {
    const { toast } = useToast();

    const handleDownloadPdf = () => {
        if (!content) {
            toast({ title: "Conteúdo vazio", description: "Não há nada para baixar.", variant: "destructive" });
            return;
        }

        const doc = new jsPDF();
        
        doc.setFontSize(18);
        doc.text(topic, 14, 22);

        // Adiciona um subtítulo com a data de emissão
        doc.setFontSize(10);
        doc.text(`Data de Emissão: ${format(new Date(), 'dd/MM/yyyy')}`, 14, 30);
        
        // Adiciona o conteúdo do manual, com quebras de linha
        const splitContent = doc.splitTextToSize(content, 180); // 180 é a largura do texto
        doc.setFontSize(12);
        doc.text(splitContent, 14, 45);

        // Rodapé simples
        const pageCount = doc.internal.pages.length -1;
        for(let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(10);
            doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.width - 40, doc.internal.pageSize.height - 10);
        }

        const fileName = `Manual_${topic.replace(/\s+/g, '_')}.pdf`;
        doc.save(fileName);
        toast({
            title: "Download Iniciado!",
            description: `Seu manual "${topic}" está sendo baixado.`
        });
    }

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Editor do Manual</CardTitle>
                    <CardDescription>
                        Ajuste o conteúdo gerado pela IA como desejar. O texto suporta a formatação Markdown para títulos (`#`), negrito (`**texto**`) e listas (`- item`).
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Textarea
                        value={content}
                        onChange={(e) => onContentChange(e.target.value)}
                        className="min-h-[400px] text-base font-mono"
                        placeholder="O conteúdo do seu manual aparecerá aqui..."
                    />
                </CardContent>
                <CardFooter>
                    <Button onClick={handleDownloadPdf} disabled={!content}>
                        <Download className="mr-2 h-4 w-4" />
                        Baixar PDF
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
