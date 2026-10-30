
import type { Timestamp } from "firebase/firestore";

export type UserRole = 'Master' | 'Gerente' | 'Colaborador';

export type AppUser = {
    uid: string;
    email: string;
    displayName: string;
    role: UserRole;
    storeId?: string; // Required if role is 'Gerente' or 'Colaborador'
    storeName?: string; // For display purposes
};

export type Store = {
  id: string;
  name: string;
  location?: string;
};

export type Supplier = {
  id: string;
  name: string;
  contactInfo: string;
  storeId: string; 
};

export type IngredientCategory = 'Alimentos' | 'Bebidas' | 'Descartáveis' | 'Limpeza';

export type Ingredient = {
  id: string;
  name: string;
  unit: 'kg' | 'g' | 'L' | 'ml' | 'un';
  category: IngredientCategory;
  currentCostPerUnit: number;
  averageCostPerUnit: number;
  priceHistory: { date: Date | Timestamp; cost: number }[];
  stockQuantity: number;
  storeId: string;
};

export type PurchaseItem = {
  ingredientId: string;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
};

export type Installment = {
    amount: number;
    dueDate: Date | Timestamp;
    barcode?: string;
}

export type Purchase = {
  id: string;
  supplierId?: string;
  supplierName: string;
  invoiceNumber: string;
  purchaseDate: Date;
  totalAmount: number;
  items: PurchaseItem[];
  paymentMethod: 'Boleto' | 'Cartão de Crédito' | 'PIX' | 'Dinheiro';
  installments?: Installment[];
  pixStatus?: 'pago' | 'agendado';
  pixDueDate?: Date | Timestamp;
  storeId: string; 
  invoiceUrl?: string;
  invoiceFileType?: string;
};

export type ExpenseCategory = 'Marketing' | 'Utilidades' | 'Aluguel' | 'Manutenção' | 'Pessoal' | 'Impostos' | 'Software' | 'Logística e Entregas' | 'Outros';

export type Expense = {
  id: string;
  description: string;
  category: ExpenseCategory;
  amount: number;
  expenseDate: Date | Timestamp;
  dueDate?: Date | Timestamp;
  paymentMethod: 'Boleto' | 'Cartão de Crédito' | 'PIX' | 'Dinheiro';
  status: 'Pago' | 'Pendente';
  storeId: string;
  invoiceUrl?: string;
  invoiceFileType?: string;
};

export type RecipeIngredient = {
  ingredientId: string;
  quantity: number;
};

export type RecipeCategory = 'Lanches' | 'Porções' | 'Pratos' | 'Bebidas' | 'Sobremesas' | 'Receitas';

export type Recipe = {
  id:string;
  name: string;
  category: RecipeCategory;
  ingredientsList: RecipeIngredient[];
  productionCost: number;
  sellingPrice?: number;
  productCMV?: number;
  description: string;
  allergens?: string[];
  nutritionalInfo?: string;
  storeId: string;
  yield?: number; // Rendimento da receita
  yieldUnit?: string; // Unidade do rendimento (kg, L, un...)
};

export type StockAdjustment = {
  id: string;
  adjustmentDate: Date;
  ingredientId: string;
  ingredientName: string;
  ingredientUnit: string;
  quantity: number;
  reason: string;
  type: 'entrada' | 'saida';
  storeId: string; 
  userName?: string;
  batchId?: string;
};

export type AppSettings = {
  id: string; // Should be `appSettings` or `appSettings_{storeId}`
  monthlySpendingGoal: number;
  monthlyRevenueGoal: number;
  storeId: string;
};

export type Revenue = {
    id?: string;
    date: Date | Timestamp;
    description: string;
    amount: number;
    storeId: string;
};

export type PayableAccount = {
    id: string;
    purchaseId?: string;
    expenseId?: string;
    supplierName: string;
    description: string;
    amount: number;
    dueDate?: Date | Timestamp;
    status: 'Pendente' | 'Lançada' | 'Pago';
    paymentDate?: Date | Timestamp;
    role?: string;
    boletoBarcode?: string;
    storeId: string;
};

export type MonthlyClosing = {
    id: string;
    month: string; // "YYYY-MM"
    initialStockValue: number;
    finalStockValue: number;
    totalPurchases: number;
    totalRevenue: number;
    cmvValue: number;
    cmvPercentage: number;
    createdAt: Timestamp;
    storeId: string;
};

export type ChecklistItemType = 'checkbox' | 'text' | 'number' | 'photo';

export type ChecklistItem = {
    description: string;
    type: ChecklistItemType;
};

export type ChecklistCategory = 'Abertura' | 'Fechamento' | 'POPs' | 'Limpeza';

export type Checklist = {
    id: string;
    name: string;
    description: string;
    category: ChecklistCategory;
    items: ChecklistItem[];
    storeId: string;
};

export type ChecklistExecutionItem = {
    itemId: string; // References the original item description or a unique ID within the checklist model
    description: string;
    type: ChecklistItemType;
    answer: string | number | boolean | null;
    photoUrl?: string; // For photo type
};

export type ChecklistExecution = {
    id: string;
    checklistId: string;
    checklistName: string;
    executionDate: Timestamp;
    completedByUserId: string;
    completedByUserName: string;
    status: 'Completo' | 'Incompleto';
    answers: ChecklistExecutionItem[];
    storeId: string;
};

export type Manual = {
  id: string;
  topic: string;
  storeId: string;
  createdAt: Timestamp;
  // Um manual pode ter conteúdo de texto OU um arquivo, mas não ambos.
  content?: string;      // Para manuais criados via IA/texto
  fileUrl?: string;      // URL para o arquivo no Firebase Storage
  fileType?: string;     // ex: 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
};
