
import { collection, writeBatch, doc } from 'firebase/firestore';
import { db } from './firebase';
import type { IngredientCategory } from './types';

const initialIngredients: { name: string; unit: string; price: number; category: IngredientCategory }[] = [
    // Alimentos
    { name: 'FILÉ MIGNON', unit: 'kg', price: 59.00, category: 'Alimentos' },
    { name: 'STROGONOFF DE CARNE', unit: 'kg', price: 48.98, category: 'Alimentos' },
    { name: 'STROGONOFF DE FRANGO', unit: 'kg', price: 29.90, category: 'Alimentos' },
    { name: 'HAMBURGUER', unit: 'kg', price: 22.00, category: 'Alimentos' },
    { name: 'FRANGO DESFIADO', unit: 'kg', price: 16.50, category: 'Alimentos' },
    { name: 'CORAÇÃO', unit: 'kg', price: 32.50, category: 'Alimentos' },
    { name: 'CALABRESA', unit: 'kg', price: 22.00, category: 'Alimentos' },
    { name: 'BACON', unit: 'kg', price: 22.90, category: 'Alimentos' },
    { name: 'FRANGO', unit: 'kg', price: 15.50, category: 'Alimentos' },
    { name: 'SALSICHA', unit: 'kg', price: 8.50, category: 'Alimentos' },
    { name: 'LINGUICINHA CALABRESA', unit: 'un', price: 2.02, category: 'Alimentos' },
    { name: 'ATUM', unit: 'un', price: 4.00, category: 'Alimentos' },
    { name: 'PICANHA', unit: 'kg', price: 78.90, category: 'Alimentos' },
    { name: 'ALCATRA', unit: 'kg', price: 51.90, category: 'Alimentos' },
    { name: 'CARNE DE PANELA', unit: 'kg', price: 58.63, category: 'Alimentos' },
    { name: 'PRESUNTO', unit: 'kg', price: 19.90, category: 'Alimentos' },
    { name: 'QUEIJO MUSSARELA FATIADO', unit: 'kg', price: 31.90, category: 'Alimentos' },
    { name: 'QUEIJO MUSSARELA INTEIRO', unit: 'kg', price: 30.90, category: 'Alimentos' },
    { name: '4 QUEIJOS', unit: 'kg', price: 15.90, category: 'Alimentos' },
    { name: 'CHEDDAR', unit: 'kg', price: 11.90, category: 'Alimentos' },
    { name: 'CATUPIRY', unit: 'kg', price: 11.20, category: 'Alimentos' },
    { name: 'FRITAS', unit: 'kg', price: 16.18, category: 'Alimentos' },
    { name: 'POLENTA', unit: 'kg', price: 5.99, category: 'Alimentos' },
    { name: 'AIPIM', unit: 'kg', price: 17.99, category: 'Alimentos' },
    { name: 'ANEIS CEBOLA', unit: 'kg', price: 0, category: 'Alimentos' },
    { name: 'MOLHO 4 QUEIJOS', unit: 'kg', price: 39.66, category: 'Alimentos' },
    { name: 'MOLHO MOSTARDA', unit: 'kg', price: 17.30, category: 'Alimentos' },
    { name: 'MOLHO NATA', unit: 'kg', price: 40.92, category: 'Alimentos' },
    { name: 'MOLHO CESAR', unit: 'kg', price: 29.00, category: 'Alimentos' },
    { name: 'CHEDDAR FATIADO', unit: 'kg', price: 37.80, category: 'Alimentos' },
    { name: 'TOMATE', unit: 'kg', price: 4.50, category: 'Alimentos' },
    { name: 'ALFACE CRESPA', unit: 'un', price: 2.99, category: 'Alimentos' },
    { name: 'CEBOLA', unit: 'kg', price: 4.50, category: 'Alimentos' },
    { name: 'LIMÃO', unit: 'kg', price: 5.99, category: 'Alimentos' },
    { name: 'OVOS', unit: 'un', price: 0.48, category: 'Alimentos' },
    { name: 'OVO DESIDRATADO', unit: 'un', price: 49.50, category: 'Alimentos' },
    { name: 'PIMENTÃO', unit: 'kg', price: 6.99, category: 'Alimentos' },
    { name: 'ARROZ', unit: 'kg', price: 2.55, category: 'Alimentos' },
    { name: 'FEIJÃO', unit: 'kg', price: 2.26, category: 'Alimentos' },
    { name: 'MASSA ESPAGUETE', unit: 'kg', price: 3.99, category: 'Alimentos' },
    { name: 'MASSA PENNE', unit: 'kg', price: 3.99, category: 'Alimentos' },
    { name: 'SAL', unit: 'kg', price: 2.02, category: 'Alimentos' },
    { name: 'ACUÇAR', unit: 'kg', price: 4.29, category: 'Alimentos' },
    { name: 'OLEO DE SOJA', unit: 'L', price: 5.89, category: 'Alimentos' },
    { name: 'CREME DE LEITE', unit: 'un', price: 3.29, category: 'Alimentos' },
    { name: 'FAROFA TEMPERADA', unit: 'kg', price: 5.89, category: 'Alimentos' },
    { name: 'MOSTARDA', unit: 'kg', price: 6.51, category: 'Alimentos' },
    { name: 'CATCHUP', unit: 'kg', price: 7.35, category: 'Alimentos' },
    { name: 'MOSTARDA SACHE', unit: 'un', price: 10.71, category: 'Alimentos' },
    { name: 'CATCHUP SACHE', unit: 'un', price: 11.46, category: 'Alimentos' },
    { name: 'MOLHO DE TOMATE', unit: 'kg', price: 2.20, category: 'Alimentos' },
    { name: 'MILHO', unit: 'kg', price: 13.76, category: 'Alimentos' },
    { name: 'ERVILHA', unit: 'kg', price: 10.22, category: 'Alimentos' },
    { name: 'AZEITONA FATIADA', unit: 'kg', price: 27.49, category: 'Alimentos' },
    { name: 'AZEITONA INTEIRA', unit: 'kg', price: 19.99, category: 'Alimentos' },
    { name: 'OVO DE CODORNA', unit: 'kg', price: 39.66, category: 'Alimentos' },
    { name: 'PEPINO', unit: 'kg', price: 13.49, category: 'Alimentos' },
    { name: 'PÃO GR', unit: 'un', price: 1.26, category: 'Alimentos' },
    { name: 'PÃO MINI', unit: 'un', price: 0.79, category: 'Alimentos' },
    { name: 'PÃO DOCE', unit: 'un', price: 2.30, category: 'Alimentos' },
    { name: 'PÃO DE CACHORRO', unit: 'un', price: 2.30, category: 'Alimentos' },
    { name: 'PÃO DE FORMA', unit: 'un', price: 0.36, category: 'Alimentos' },
    { name: 'PÃO KIDS', unit: 'un', price: 2.30, category: 'Alimentos' },
    { name: 'BALA KIDS', unit: 'un', price: 0.69, category: 'Alimentos' },
    { name: 'BATATA PALHA', unit: 'kg', price: 21.14, category: 'Alimentos' },

    // Bebidas
    { name: 'AGUA COM GAS', unit: 'un', price: 1.20, category: 'Bebidas' },
    { name: 'AGUA SEM GAS', unit: 'un', price: 1.07, category: 'Bebidas' },
    { name: 'COCA COLA LATA', unit: 'un', price: 2.77, category: 'Bebidas' },
    { name: 'COCA COLA ZERO LATA', unit: 'un', price: 2.77, category: 'Bebidas' },
    { name: 'FANTA LARANJA', unit: 'un', price: 2.56, category: 'Bebidas' },
    { name: 'FANTA GUARANÁ', unit: 'un', price: 2.56, category: 'Bebidas' },
    { name: 'SPRITE', unit: 'un', price: 2.56, category: 'Bebidas' },
    { name: 'COCA 600', unit: 'un', price: 3.68, category: 'Bebidas' },
    { name: 'GUARANA FRUKI 600', unit: 'un', price: 2.86, category: 'Bebidas' },
    { name: 'GUARANA FRUKI LATA', unit: 'un', price: 2.00, category: 'Bebidas' },
    { name: 'SUCO DEL VALE', unit: 'un', price: 2.00, category: 'Bebidas' },
    
    // Maionese como Alimento
    { name: 'MAIONESE BRUXAS', unit: 'kg', price: 9.21, category: 'Alimentos' },
];


function normalizeUnit(unit: string) {
    const lowerUnit = unit.toLowerCase();
    if (lowerUnit.startsWith('kg') || lowerUnit.startsWith('kilo')) return 'kg';
    if (lowerUnit.startsWith('g')) return 'g';
    if (lowerUnit.startsWith('l') || lowerUnit.startsWith('litro')) return 'L';
    if (lowerUnit.startsWith('ml')) return 'ml';
    return 'un';
}


export async function seedIngredientsForStore(storeId: string) {
    const batch = writeBatch(db);

    initialIngredients.forEach(ing => {
        const docRef = doc(collection(db, 'ingredients')); 
        batch.set(docRef, {
            storeId: storeId,
            name: ing.name,
            unit: normalizeUnit(ing.unit),
            category: ing.category,
            currentCostPerUnit: ing.price,
            averageCostPerUnit: ing.price,
            priceHistory: ing.price > 0 ? [{ date: new Date(), cost: ing.price }] : [],
            stockQuantity: 0,
        });
    });

    await batch.commit();
}
