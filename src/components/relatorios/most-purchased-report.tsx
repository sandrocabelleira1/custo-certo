
'use client';

import * as React from 'react';
import { collection, query, onSnapshot, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Purchase, Ingredient } from '@/lib/types';
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

interface ReportProps {
  startDate?: Date;
  endDate?: Date;
}

export default function MostPurchasedReport({ startDate, endDate }: ReportProps) {
  const { currentStore } = useStore();
  const [reportData, setReportData] = React.useState<{ id: string; name: string; unit: string; totalQuantity: number; }[]>([]);
  
  React.useEffect(() => {
    if (!currentStore) return;
    let q = query(collection(db, 'purchases'), where('storeId', '==', currentStore.id));

    if (startDate || endDate) {
        const start = startDate ? Timestamp.fromDate(startDate) : null;
        const end = endDate ? Timestamp.fromDate(endDate) : null;

        if (start && end) {
            q = query(q, where('purchaseDate', '>=', start), where('purchaseDate', '<=', end));
        } else if (start) {
            q = query(q, where('purchaseDate', '>=', start));
        } else if (end) {
            q = query(q, where('purchaseDate', '<=', end));
        }
    }
    
    const unsubscribePurchases = onSnapshot(q, (purchaseSnapshot) => {
      const purchases: Purchase[] = [];
      purchaseSnapshot.forEach(doc => {
        const data = doc.data();
        purchases.push({ ...data, id: doc.id, purchaseDate: (data.purchaseDate as Timestamp).toDate() } as Purchase);
      });

      const qIngredients = query(collection(db, 'ingredients'), where('storeId', '==', currentStore.id));
      const unsubscribeIngredients = onSnapshot(qIngredients, (ingredientSnapshot) => {
        const ingredients: Ingredient[] = [];
        ingredientSnapshot.forEach(doc => {
            ingredients.push({ ...doc.data(), id: doc.id } as Ingredient);
        });

        const purchaseCounts = purchases.flatMap(p => p.items).reduce((acc, item) => {
            acc[item.ingredientId] = (acc[item.ingredientId] || 0) + item.quantity;
            return acc;
        }, {} as Record<string, number>);

        const sortedIngredients = Object.entries(purchaseCounts)
            .sort(([, a], [, b]) => b - a)
            .map(([id, quantity]) => {
                const ingredient = ingredients.find(ing => ing.id === id);
                return {
                    id: id,
                    name: ingredient?.name || 'Desconhecido',
                    unit: ingredient?.unit || 'un',
                    totalQuantity: quantity
                };
            });
        
        setReportData(sortedIngredients);
      });

      return () => unsubscribeIngredients();
    });

    return () => unsubscribePurchases();
  }, [startDate, endDate, currentStore]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Relatório de Insumos Mais Comprados</CardTitle>
        <CardDescription>
          Insumos ordenados pela quantidade total comprada no período selecionado.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ranking</TableHead>
              <TableHead>Nome do Insumo</TableHead>
              <TableHead className="text-right">Quantidade Comprada</TableHead>
              <TableHead>Unidade</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reportData.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={4} className="text-center">Nenhuma compra encontrada no período.</TableCell>
                </TableRow>
            ) : (
                reportData.map((ingredient, index) => (
                <TableRow key={ingredient.id}>
                    <TableCell className="font-medium">#{index + 1}</TableCell>
                    <TableCell>{ingredient.name}</TableCell>
                    <TableCell className="text-right">{ingredient.totalQuantity.toFixed(2)}</TableCell>
                    <TableCell>{ingredient.unit}</TableCell>
                </TableRow>
                ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
