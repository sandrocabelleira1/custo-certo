import type { Supplier, Ingredient, Purchase, Recipe, DailyRevenue } from './types';

export const mockSuppliers: Supplier[] = [
  { id: 'sup1', name: 'Fornecedor de Carnes S.A.', contactInfo: 'contato@carnessa.com' },
  { id: 'sup2', name: 'Hortifruti Frescor', contactInfo: 'vendas@frescor.com.br' },
  { id: 'sup3', name: 'Distribuidora de Bebidas Gelada', contactInfo: 'pedidos@gelada.com' },
];

const today = new Date();
const daysAgo = (days: number) => new Date(today.getTime() - days * 24 * 60 * 60 * 1000);

export const mockIngredients: Ingredient[] = [
  {
    id: 'ing1',
    name: 'Picanha',
    unit: 'kg',
    currentCostPerUnit: 75.5,
    priceHistory: [
      { date: daysAgo(30), cost: 72.0 },
      { date: daysAgo(20), cost: 73.5 },
      { date: daysAgo(10), cost: 75.0 },
      { date: daysAgo(1), cost: 75.5 },
    ],
  },
  {
    id: 'ing2',
    name: 'Tomate',
    unit: 'kg',
    currentCostPerUnit: 8.99,
    priceHistory: [
      { date: daysAgo(30), cost: 7.5 },
      { date: daysAgo(20), cost: 9.2 },
      { date: daysAgo(10), cost: 8.5 },
      { date: daysAgo(1), cost: 8.99 },
    ],
  },
  {
    id: 'ing3',
    name: 'Alface Crespa',
    unit: 'un',
    currentCostPerUnit: 3.5,
    priceHistory: [
      { date: daysAgo(30), cost: 3.0 },
      { date: daysAgo(20), cost: 3.2 },
      { date: daysAgo(10), cost: 3.8 },
      { date: daysAgo(1), cost: 3.5 },
    ],
  },
  {
    id: 'ing4',
    name: 'Refrigerante 2L',
    unit: 'un',
    currentCostPerUnit: 7.0,
    priceHistory: [
      { date: daysAgo(30), cost: 6.8 },
      { date: daysAgo(20), cost: 6.9 },
      { date: daysAgo(10), cost: 7.2 },
      { date: daysAgo(1), cost: 7.0 },
    ],
  },
  {
    id: 'ing5',
    name: 'Farinha de Trigo',
    unit: 'kg',
    currentCostPerUnit: 5.5,
     priceHistory: [
      { date: daysAgo(30), cost: 5.0 },
      { date: daysAgo(20), cost: 5.2 },
      { date: daysAgo(10), cost: 5.3 },
      { date: daysAgo(1), cost: 5.5 },
    ],
  },
    {
    id: 'ing6',
    name: 'Ovo',
    unit: 'un',
    currentCostPerUnit: 0.8,
     priceHistory: [
      { date: daysAgo(30), cost: 0.7 },
      { date: daysAgo(20), cost: 0.75 },
      { date: daysAgo(10), cost: 0.9 },
      { date: daysAgo(1), cost: 0.8 },
    ],
  },
];

export const mockPurchases: Purchase[] = [
  {
    id: 'pur1',
    supplierId: 'sup1',
    supplierName: 'Fornecedor de Carnes S.A.',
    invoiceNumber: 'NF-102030',
    purchaseDate: daysAgo(1),
    totalAmount: 755.0,
    items: [
      { ingredientId: 'ing1', productName: 'Picanha', quantity: 10, unit: 'kg', unitPrice: 75.5, totalPrice: 755.0 },
    ],
  },
  {
    id: 'pur2',
    supplierId: 'sup2',
    supplierName: 'Hortifruti Frescor',
    invoiceNumber: 'NF-506070',
    purchaseDate: daysAgo(2),
    totalAmount: 124.9,
    items: [
      { ingredientId: 'ing2', productName: 'Tomate', quantity: 10, unit: 'kg', unitPrice: 8.99, totalPrice: 89.9 },
      { ingredientId: 'ing3', productName: 'Alface Crespa', quantity: 10, unit: 'un', unitPrice: 3.5, totalPrice: 35.0 },
    ],
  },
];

export const mockRecipes: Recipe[] = [
    {
        id: 'rec1',
        name: 'Salada Caesar',
        ingredientsList: [
            { ingredientId: 'ing3', quantity: 1 }, // Alface
            { ingredientId: 'ing2', quantity: 0.2 }, // Tomate
        ],
        productionCost: 5.29,
        sellingPrice: 25.00,
        productCMV: 21.16,
        description: 'Uma salada clássica com um toque da casa.'
    },
    {
        id: 'rec2',
        name: 'Bife à Parmegiana',
        ingredientsList: [
            { ingredientId: 'ing1', quantity: 0.25 }, // Picanha
            { ingredientId: 'ing2', quantity: 0.3 }, // Tomate
            { ingredientId: 'ing5', quantity: 0.1 }, // Farinha
            { ingredientId: 'ing6', quantity: 2 }, // Ovos
        ],
        productionCost: 23.59,
        sellingPrice: 65.00,
        productCMV: 36.29,
        description: 'Generosa porção de bife empanado e coberto com molho de tomate e queijo.'
    }
]

export const mockDailyRevenue: DailyRevenue[] = [
    { date: daysAgo(0), amount: 1250.75 },
    { date: daysAgo(1), amount: 1100.50 },
    { date: daysAgo(2), amount: 980.00 },
];

export const mockMonthlySpending = mockPurchases.reduce((acc, p) => acc + p.totalAmount, 0);

export const mockSettings = {
    monthlySpendingGoal: 5000,
}

// Recalculating mockRevenue based on mockDailyRevenue
const getRevenueForPeriod = (startDate: Date, endDate: Date) => {
    return mockDailyRevenue
        .filter(r => r.date >= startDate && r.date <= endDate)
        .reduce((acc, r) => acc + r.amount, 0);
}

const todayStart = new Date();
todayStart.setHours(0, 0, 0, 0);
const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
const yearStart = new Date(today.getFullYear(), 0, 1);


export const mockRevenue = {
    today: getRevenueForPeriod(todayStart, today),
    month: getRevenueForPeriod(monthStart, today),
    year: getRevenueForPeriod(yearStart, today)
}

export const mockTotalCosts = {
    today: 400.25,
    month: 8120.90,
    year: 96840.20
}
