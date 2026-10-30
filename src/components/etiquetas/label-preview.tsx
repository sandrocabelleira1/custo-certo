'use client';

import * as React from 'react';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Printer } from 'lucide-react';
import { type LabelFormValues } from './label-form';
import { Separator } from '../ui/separator';

interface LabelPreviewProps {
  data: LabelFormValues;
}

export default function LabelPreview({ data }: LabelPreviewProps) {
  const labelRef = React.useRef<HTMLDivElement>(null);
  
  const now = new Date();
  const fabricationDate = data.fabricationDate;
  fabricationDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
  
  const expirationDate = addDays(fabricationDate, data.validityDays);

  const handlePrint = () => {
    const fabricationDateFormatted = format(fabricationDate, 'dd/MM/yyyy - HH:mm:ss');
    const expirationDateFormatted = format(expirationDate, 'dd/MM/yyyy - HH:mm:ss');
    
    let optionalFieldsHtml = '';
    if (data.displayQuantity) {
        optionalFieldsHtml += `<div class="bold">QUANTIDADE:</div><div>${data.displayQuantity}</div>`;
    }
    if (data.originalValidityDate) {
        optionalFieldsHtml += `<div class="bold">VALIDADE ORIGINAL:</div><div>${data.originalValidityDate}</div>`;
    }
    if (data.healthSeal) {
        optionalFieldsHtml += `<div class="bold">REGISTRO:</div><div>${data.healthSeal}</div>`;
    }
    if (data.marcaDeOrigem) {
        optionalFieldsHtml += `<div class="bold">MARCA DE ORIGEM:</div><div>${data.marcaDeOrigem}</div>`;
    }
    
    let ingredientsHtml = '';
    if (data.ingredientsList && data.ingredientsList.length > 0) {
        ingredientsHtml = `
            <div class="separator"></div>
            <div class="ingredients">
                <div class="bold uppercase">Ingredientes:</div>
                <div class="ingredients-list">${data.ingredientsList.join(', ')}</div>
            </div>
        `;
    }

    let nutritionalHtml = '';
    if (data.includeNutritionalInfo) {
        if (data.allergens && data.allergens.length > 0) {
            nutritionalHtml += `
                <div class="separator"></div>
                <div class="ingredients">
                    <div class="bold uppercase">ALÉRGICOS: ${data.allergens.join(', ').toUpperCase()}</div>
                </div>
            `;
        }
        if (data.nutritionalInfo) {
            nutritionalHtml += `
                <div class="separator"></div>
                <div class="ingredients">
                    <div class="bold uppercase">Informação Nutricional:</div>
                    <div class="ingredients-list">${data.nutritionalInfo}</div>
                </div>
            `;
        }
    }

    const isSimpleFormat = data.labelFormat === 'simple';
    
    let pageCss = '';
    let labelHtml = '';

    if (isSimpleFormat) {
        pageCss = `
            @page { 
                size: 60mm 40mm;
                margin: 0;
            }
            body { 
                font-family: 'Arial', sans-serif;
                font-size: 10pt;
                color: #000;
                width: 60mm;
                height: 40mm;
                margin: 0;
                padding: 2mm;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
                justify-content: center;
                text-align: center;
            }
            .label {
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
                height: 100%;
                width: 100%;
                justify-content: space-around;
            }
            .bold { font-weight: bold; }
            .uppercase { text-transform: uppercase; }
            .title { font-size: 14pt; margin-bottom: 4px; text-align: center; }
            .info-grid {
                display: grid;
                grid-template-columns: auto 1fr;
                gap: 1px 5px;
                align-items: center;
                text-align: left;
            }
        `;
        
        labelHtml = `
            <div class="label">
                <div class="title bold uppercase">${data.productName}</div>
                <div class="info-grid">
                    <div class="bold">FAB:</div><div>${format(fabricationDate, 'dd/MM/yy HH:mm')}</div>
                    <div class="bold">VAL:</div><div>${format(expirationDate, 'dd/MM/yy HH:mm')}</div>
                    <div class="bold">LOTE:</div><div>${data.lote}</div>
                </div>
            </div>
        `;

    } else { // 'default' format
        pageCss = `
            @page { 
                size: 80mm auto; 
                margin: 2mm;
            }
            body { 
                font-family: 'Arial', sans-serif;
                font-size: 9pt;
                color: #000;
                width: 76mm;
                margin: 0;
            }
            .label {
                padding: 1.5mm;
                box-sizing: border-box;
                margin-bottom: 2mm;
                display: flex;
                flex-direction: column;
            }
            .label:last-child {
                margin-bottom: 0;
            }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .uppercase { text-transform: uppercase; }
            .title { font-size: 12pt; margin-bottom: 1px; }
            .subtitle { font-size: 10pt; }
            .info-grid {
                display: grid;
                grid-template-columns: auto 1fr;
                gap: 0 3px;
                align-items: center;
            }
            .info-grid > div {
                 padding: 0.5px 0;
            }
            .footer-grid > [colspan="2"] {
                grid-column: span 2;
                margin-top: 2px;
            }
            .separator { 
                border-top: 1px solid black;
                margin: 2px 0;
            }
            .ingredients {
                font-size: 8pt;
                text-align: justify;
            }
            .ingredients-list {
                 line-height: 1.1;
            }
        `;

        labelHtml = `
            <div class="label">
                <div class="center">
                    <div class="title bold uppercase">${data.productName}</div>
                    <div class="subtitle bold uppercase">${data.productState}</div>
                </div>
                <div class="separator"></div>
                <div class="info-grid">
                    <div class="bold">MANIPULAÇÃO:</div><div>${fabricationDateFormatted}</div>
                    <div class="bold">VALIDADE:</div><div>${expirationDateFormatted}</div>
                    <div class="bold">MARCA / FORN:</div><div>${data.fabricante}</div>
                    <div class="bold">LOTE:</div><div>${data.lote}</div>
                    ${optionalFieldsHtml}
                </div>
                ${ingredientsHtml}
                ${nutritionalHtml}
                <div class="separator"></div>
                <div class="info-grid footer-grid">
                    <div class="bold">RESP.:</div><div>${data.responsavel}</div>
                    <div class="bold">CNPJ:</div><div>29.218.387.0001/39</div>
                    <div colspan="2" class="center bold">CUSTO CERTO XANGRI-LÁ</div>
                </div>
            </div>
        `;
    }

    const allLabelsHtml = Array(data.quantity).fill(labelHtml).join('');
    
    const printWindow = window.open('', '_blank', 'height=600,width=800');
    if (printWindow) {
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Impressão de Etiquetas</title>
                    <style>
                        ${pageCss}
                    </style>
                </head>
                <body>
                    ${allLabelsHtml}
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus(); // Essencial para alguns navegadores
        
        // Timeout para dar tempo para o conteúdo carregar antes de imprimir
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500); 
    }
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle>Pré-visualização da Etiqueta</CardTitle>
        <CardDescription>
          Esta é a aparência da sua etiqueta. Use o botão abaixo para imprimir ${data.quantity > 1 ? `${data.quantity} cópias` : 'a etiqueta'}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div ref={labelRef} className="border p-2 rounded-md bg-white text-black font-sans w-fit">
          {data.labelFormat === 'simple' ? (
            <div className="w-[227px] h-[151px] p-1 flex flex-col justify-around text-center">
              <h3 className="font-bold text-sm uppercase">{data.productName}</h3>
              <div className="grid grid-cols-[auto_1fr] gap-x-2 text-xs text-left">
                  <span className="font-bold">FAB:</span>
                  <span>${format(fabricationDate, 'dd/MM/yy HH:mm')}</span>

                  <span className="font-bold">VAL:</span>
                  <span>${format(expirationDate, 'dd/MM/yy HH:mm')}</span>

                  <span className="font-bold">LOTE:</span>
                  <span>${data.lote}</span>
              </div>
            </div>
          ) : (
            <div className="w-[288px] flex flex-col text-[10px] leading-tight">
                <div className="text-center">
                    <h3 className="font-bold text-base uppercase">${data.productName}</h3>
                    <p className="font-bold text-sm uppercase">${data.productState}</p>
                </div>
                <Separator className="bg-black my-0.5" />
                <div className="grid grid-cols-[auto_1fr] gap-x-2">
                    <span className="font-bold">MANIPULAÇÃO:</span>
                    <span>${format(fabricationDate, 'dd/MM/yyyy - HH:mm:ss')}</span>

                    <span className="font-bold">VALIDADE:</span>
                    <span>${format(expirationDate, 'dd/MM/yyyy - HH:mm:ss')}</span>

                    <span className="font-bold">MARCA / FORN:</span>
                    <span>${data.fabricante}</span>
                    
                    <span className="font-bold">LOTE:</span>
                    <span>${data.lote}</span>

                    ${data.displayQuantity && (
                        <>
                            <span className="font-bold">QUANTIDADE:</span>
                            <span>${data.displayQuantity}</span>
                        </>
                    )}

                    ${data.originalValidityDate && (
                        <>
                            <span className="font-bold">VALIDADE ORIGINAL:</span>
                            <span>${data.originalValidityDate}</span>
                        </>
                    )}

                    ${data.healthSeal && (
                        <>
                            <span className="font-bold">REGISTRO:</span>
                            <span>${data.healthSeal}</span>
                        </>
                    )}
                    ${data.marcaDeOrigem && (
                        <>
                            <span className="font-bold">MARCA DE ORIGEM:</span>
                            <span>${data.marcaDeOrigem}</span>
                        </>
                    )}
                </div>

                ${data.ingredientsList && data.ingredientsList.length > 0 && (
                    <>
                        <Separator className="bg-black my-0.5" />
                        <div className="text-justify text-[9px] leading-tight">
                            <span className="font-bold uppercase">Ingredientes: </span>
                            <span>${data.ingredientsList?.join(", ")}</span>
                        </div>
                    </>
                )}

                ${data.includeNutritionalInfo && (
                    <>
                        ${data.allergens && data.allergens.length > 0 && (
                            <>
                                <Separator className="bg-black my-0.5" />
                                <div className="text-justify text-[9px] leading-tight">
                                    <span className="font-bold uppercase">ALÉRGICOS: ${data.allergens.join(', ').toUpperCase()}</span>
                                </div>
                            </>
                        )}
                        ${data.nutritionalInfo && (
                            <>
                                <Separator className="bg-black my-0.5" />
                                <div className="text-justify text-[9px] leading-tight">
                                    <span className="font-bold uppercase">Informação Nutricional: </span>
                                    <span>${data.nutritionalInfo}</span>
                                </div>
                            </>
                        )}
                    </>
                )}

                <Separator className="bg-black my-0.5" />
                <div className="grid grid-cols-[auto_1fr] gap-x-2">
                    <span className="font-bold">RESP.:</span>
                    <span>${data.responsavel}</span>

                    <span className="font-bold">CNPJ:</span>
                    <span>29.218.387.0001/39</span>

                    <div className="col-span-2 text-center font-bold mt-0.5">
                        CUSTO CERTO XANGRI-LÁ
                    </div>
                </div>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" />
          Imprimir ${data.quantity > 1 ? `${data.quantity} Etiquetas` : 'Etiqueta'}
        </Button>
      </CardFooter>
    </Card>
  );
}
