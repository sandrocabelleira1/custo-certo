

import type { Ingredient, Recipe } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "../ui/button";
import { Pencil, Copy, Trash2, Eye, Download } from "lucide-react";
import { Badge } from "../ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
} from "@/components/ui/alert-dialog"
import { Checkbox } from "../ui/checkbox";
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface RecipeCardProps {
  recipe: Recipe;
  ingredients: Ingredient[];
  isSelected: boolean;
  onSelectChange: (isSelected: boolean) => void;
  onEdit: (recipe: Recipe) => void;
  onCopy: (recipe: Recipe) => void;
  onDelete: (recipeId: string) => void;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value);
};

export function RecipeCard({ recipe, ingredients, isSelected, onSelectChange, onEdit, onCopy, onDelete }: RecipeCardProps) {
  const { toast } = useToast();

  const getIngredientDetails = (ingredientId: string) => {
    return ingredients.find(ing => ing.id === ingredientId);
  }

  const handleDownloadPdf = () => {
    const doc = new jsPDF();
    const tableColumn = ["Insumo", "Qtd.", "Unidade", "Custo Unit.", "Custo Total"];
    const tableRows: any[] = [];
    
    doc.setFontSize(18);
    doc.text(`Ficha Técnica - ${recipe.name}`, 14, 22);
    doc.setFontSize(11);
    doc.text(`Categoria: ${recipe.category}`, 14, 30);
    if(recipe.description) {
        const splitDescription = doc.splitTextToSize(recipe.description, 180);
        doc.text(splitDescription, 14, 36);
    }

    recipe.ingredientsList.forEach(item => {
        const ingredient = getIngredientDetails(item.ingredientId);
        if (!ingredient) return;
        const itemCost = item.quantity * ingredient.currentCostPerUnit;
        const ingredientData = [
            ingredient.name,
            item.quantity.toFixed(3),
            ingredient.unit,
            formatCurrency(ingredient.currentCostPerUnit),
            formatCurrency(itemCost)
        ];
        tableRows.push(ingredientData);
    });

    const startY = recipe.description ? 50 : 40;
    (doc as any).autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: startY,
        headStyles: { fillColor: [80, 200, 120] },
    });
    
    let finalY = (doc as any).lastAutoTable.finalY;

    // Totals section
    doc.setFontSize(12);
    doc.text("Resumo de Custos e Venda", 14, finalY + 15);
    finalY += 20;

    const summaryData = [
        ['Custo de Produção', formatCurrency(recipe.productionCost)],
    ];
    
    if(recipe.sellingPrice && recipe.sellingPrice > 0) {
        summaryData.push(['Preço de Venda', formatCurrency(recipe.sellingPrice)]);
        summaryData.push(['CMV do Produto', `${(recipe.productCMV ?? 0).toFixed(2)}%`]);
    }
    
    (doc as any).autoTable({
        body: summaryData,
        startY: finalY,
        theme: 'plain',
        styles: { fontSize: 11 },
    });

    finalY = (doc as any).lastAutoTable.finalY;

    // Nutritional Info and Allergens
    if (recipe.allergens?.length || recipe.nutritionalInfo) {
      doc.setFontSize(12);
      doc.text("Informações Adicionais", 14, finalY + 15);
      finalY += 20;
      if (recipe.allergens?.length) {
        doc.setFontSize(10);
        doc.text(`Alergênicos: ${recipe.allergens.join(', ')}`, 14, finalY);
        finalY += 7;
      }
      if (recipe.nutritionalInfo) {
        doc.setFontSize(10);
        const splitNutritional = doc.splitTextToSize(`Info. Nutricional: ${recipe.nutritionalInfo}`, 180);
        doc.text(splitNutritional, 14, finalY);
      }
    }


    doc.save(`ficha_tecnica_${recipe.name.replace(/\s+/g, '_')}.pdf`);
    toast({
      title: "Download Iniciado!",
      description: "Sua ficha técnica está sendo gerada em PDF."
    });
  };

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start gap-4">
            <div className="flex items-start gap-2 flex-1">
                <Checkbox
                    id={`select-${recipe.id}`}
                    checked={isSelected}
                    onCheckedChange={onSelectChange}
                    className="mt-1"
                />
                <div className="grid gap-0.5">
                    <label htmlFor={`select-${recipe.id}`} className="cursor-pointer">
                        <CardTitle>{recipe.name}</CardTitle>
                    </label>
                    <CardDescription>{recipe.description}</CardDescription>
                </div>
            </div>
            {recipe.category && <Badge variant="outline">{recipe.category}</Badge>}
        </div>
      </CardHeader>
      <CardContent className="flex-grow grid gap-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Custo de Produção</span>
          <span className="font-medium">{formatCurrency(recipe.productionCost)}</span>
        </div>
        {recipe.sellingPrice && recipe.sellingPrice > 0 && (
            <>
                <div className="flex justify-between">
                <span className="text-muted-foreground">Preço de Venda</span>
                <span className="font-medium">{formatCurrency(recipe.sellingPrice)}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">CMV do Produto</span>
                    <Badge variant={(recipe.productCMV ?? 0) > 35 ? "destructive" : "secondary"}>
                        {(recipe.productCMV ?? 0).toFixed(2)}%
                    </Badge>
                </div>
            </>
        )}
      </CardContent>
      <CardFooter className="flex gap-2">
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" size="icon">
                    <Eye className="h-4 w-4" />
                    <span className="sr-only">Visualizar</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                <DialogTitle>{recipe.name}</DialogTitle>
                <DialogDescription>
                    {recipe.description}
                </DialogDescription>
                </DialogHeader>
                <div className="my-4">
                    <h4 className="font-semibold mb-2">Ingredientes</h4>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Insumo</TableHead>
                                <TableHead>Qtd.</TableHead>
                                <TableHead className="text-right">Custo</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {recipe.ingredientsList.map((item, index) => {
                                const ingredient = getIngredientDetails(item.ingredientId);
                                if (!ingredient) return null;
                                const itemCost = item.quantity * ingredient.currentCostPerUnit;
                                return (
                                    <TableRow key={index}>
                                        <TableCell>{ingredient.name}</TableCell>
                                        <TableCell>{item.quantity} {ingredient.unit}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(itemCost)}</TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm font-medium">
                    <div className="flex justify-between items-center border-t pt-4">
                        <span>Custo Total:</span>
                        <span>{formatCurrency(recipe.productionCost)}</span>
                    </div>
                     {recipe.sellingPrice && recipe.sellingPrice > 0 && (
                        <div className="flex justify-between items-center border-t pt-4">
                            <span>Preço de Venda:</span>
                            <span>{formatCurrency(recipe.sellingPrice)}</span>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
         <Button variant="outline" size="icon" onClick={() => onCopy(recipe)}>
            <Copy className="h-4 w-4" />
            <span className="sr-only">Copiar</span>
        </Button>
         <Button variant="outline" size="icon" onClick={handleDownloadPdf}>
            <Download className="h-4 w-4" />
            <span className="sr-only">Download PDF</span>
        </Button>
        <Button variant="outline" size="icon" onClick={() => onEdit(recipe)}>
          <Pencil className="h-4 w-4" />
          <span className="sr-only">Editar</span>
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="icon" className="ml-auto">
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Excluir</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
              <AlertDialogDescription>
                Essa ação não pode ser desfeita. Isso excluirá permanentemente a ficha técnica
                 "{recipe.name}" dos nossos servidores.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => onDelete(recipe.id)}>
                Continuar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
}
