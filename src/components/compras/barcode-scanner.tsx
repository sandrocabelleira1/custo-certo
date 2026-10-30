
'use client';

import * as React from 'react';
import { readBarcode } from '@/ai/flows/read-barcode-flow';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Loader2 } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';

interface BarcodeScannerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onBarcodeScanned: (barcode: string) => void;
}

export function BarcodeScanner({ open, onOpenChange, onBarcodeScanned }: BarcodeScannerProps) {
    const { toast } = useToast();
    const videoRef = React.useRef<HTMLVideoElement>(null);
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const [hasCameraPermission, setHasCameraPermission] = React.useState<boolean | null>(null);
    const [isProcessing, setIsProcessing] = React.useState(false);

    React.useEffect(() => {
        if (!open) return;

        const getCameraPermission = async () => {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            setHasCameraPermission(true);
    
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
            }
          } catch (error) {
            console.error('Erro ao acessar a câmera:', error);
            setHasCameraPermission(false);
            toast({
              variant: 'destructive',
              title: 'Acesso à Câmera Negado',
              description: 'Por favor, habilite as permissões de câmera nas configurações do seu navegador para usar este recurso.',
            });
          }
        };

        getCameraPermission();
        
        // Cleanup: parar a stream da câmera quando o diálogo for fechado
        return () => {
            if (videoRef.current && videoRef.current.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
            }
        };

    }, [open, toast]);

    const handleScan = async () => {
        if (!videoRef.current || !canvasRef.current) return;
        setIsProcessing(true);

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        
        if (!context) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível obter o contexto do canvas.' });
            setIsProcessing(false);
            return;
        }

        // Define o tamanho do canvas igual ao do vídeo para capturar o frame corretamente
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Desenha o frame atual do vídeo no canvas
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

        // Obtém o Data URI da imagem no canvas
        const photoDataUri = canvas.toDataURL('image/jpeg');

        try {
            const result = await readBarcode({ photoDataUri });
            if (result.barcode) {
                onBarcodeScanned(result.barcode);
                toast({ title: 'Sucesso!', description: 'Código de barras lido.' });
            } else {
                toast({ variant: 'destructive', title: 'Falha na Leitura', description: 'Não foi possível extrair um código de barras. Tente novamente com uma imagem mais nítida.' });
            }
        } catch (error) {
            console.error('Erro ao ler código de barras:', error);
            toast({ variant: 'destructive', title: 'Erro de IA', description: 'Ocorreu um erro ao processar a imagem.' });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Leitor de Código de Barras</DialogTitle>
                    <DialogDescription>
                        Posicione o código de barras em frente à câmera e clique em "Escanear".
                    </DialogDescription>
                </DialogHeader>
                <div className="my-4 space-y-4">
                    {hasCameraPermission === null && <Skeleton className="w-full aspect-video rounded-md" />}
                    
                    <div className="relative">
                        <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay muted playsInline />
                        {isProcessing && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-md">
                                <Loader2 className="h-8 w-8 text-white animate-spin" />
                            </div>
                        )}
                    </div>
                    {/* Canvas oculto para processamento de imagem */}
                    <canvas ref={canvasRef} style={{ display: 'none' }} />

                    {hasCameraPermission === false && (
                        <Alert variant="destructive">
                            <AlertTitle>Acesso à Câmera Necessário</AlertTitle>
                            <AlertDescription>
                                Por favor, permita o acesso à câmera para usar este recurso.
                            </AlertDescription>
                        </Alert>
                    )}
                </div>
                <DialogFooter>
                    <Button onClick={handleScan} disabled={!hasCameraPermission || isProcessing}>
                        {isProcessing ? 'Processando...' : 'Escanear Código de Barras'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
