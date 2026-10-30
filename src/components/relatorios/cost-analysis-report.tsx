
'use client';

import * as React from 'react';
import { collection, query, onSnapshot, orderBy, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Ingredient } from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useStore } from '../auth/store-provider';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value);
};

interface ReportProps {
  startDate?: Date;
  endDate?: Date;
}

export default function CostAnalysisReport({ startDate, endDate }: ReportProps) {
  const { currentStore } = useStore();
  const [ingredients, setIngredients] = React.useState<Ingredient[]>([]);

  React.useEffect(() => {
    if (!currentStore) return;
    
    // Ensure we only query ingredients for the current store
    const q = query(
        collection(db, 'ingredients'), 
        where('storeId', '==', currentStore.id), 
        orderBy('currentCostPerUnit', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ingredientsData: Ingredient[] = [];
      snapshot.forEach(doc => {
        ingredientsData.push({ ...doc.data(), id: doc.id } as Ingredient);
      });
      setIngredients(ingredientsData);
    });

    return () => unsubscribe();
  }, [currentStore]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Relatório de Análise de Custo - {currentStore?.name}</CardTitle>
        <CardDescription>
          Insumos desta unidade ordenados pelo maior custo unitário atual.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome do Insumo</TableHead>
              <TableHead className="text-right">Custo por Unidade</TableHead>
              <TableHead>Unidade</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ingredients.length > 0 ? (
                ingredients.map((ingredient) => (
                <TableRow key={ingredient.id}>
                    <TableCell className="font-medium">{ingredient.name}</TableCell>
                    <TableCell className="text-right text-destructive font-semibold">{formatCurrency(ingredient.currentCostPerUnit)}</TableCell>
                    <TableCell>{ingredient.unit}</TableCell>
                </TableRow>
                ))
            ) : (
                <TableRow>
                    <TableCell colSpan={3} className="text-center py-10 text-muted-foreground">
                        Nenhum insumo cadastrado para esta loja.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
