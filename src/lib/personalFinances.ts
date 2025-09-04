// lib/personalFinances.ts
// Firestore utilities for personal finances

import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  addDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp,
  query,
  orderBy
} from 'firebase/firestore';
import { db, isFirebaseAvailable } from './firebase';

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  type: 'income' | 'expense';
  createdAt: Date;
}

export interface Budget {
  id?: string;
  category: string;
  budgetAmount: number;
  spentAmount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface EMI {
  id?: string;
  name: string;
  principalAmount: number;
  monthlyEMI: number;
  remainingAmount: number;
  interestRate: number;
  tenure: number; // in months
  remainingTenure: number;
  startDate: string;
  nextDueDate: string;
  type: 'home' | 'car' | 'personal' | 'education' | 'other';
  status: 'active' | 'completed' | 'defaulted';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Loan {
  id?: string;
  name: string;
  principalAmount: number;
  currentBalance: number;
  interestRate: number;
  lenderName: string;
  icon?: string; // Bank icon or logo URL/identifier
  monthlyEMI: number;
  totalTenure: number; // Total months
  paidMonths: number; // Months already paid
  pendingMonths: number; // Remaining months
  nextDueDate: string;
  lastPaidDate?: string;
  missedEMIs: number; // Count of missed EMIs
  type: 'personal' | 'business' | 'home' | 'car' | 'education' | 'gold' | 'credit_card' | 'other';
  startDate: string;
  dueDate?: string;
  status: 'active' | 'closed' | 'overdue';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreditCard {
  id?: string;
  cardName: string;
  bankName: string;
  cardType: 'visa' | 'mastercard' | 'rupay' | 'amex' | 'diners';
  creditLimit: number;
  currentBalance: number;
  availableCredit: number;
  minimumDue: number;
  totalDue: number;
  dueDate: string;
  interestRate: number;
  lastFourDigits: string;
  status: 'active' | 'blocked' | 'closed';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Subscription {
  id?: string;
  name: string;
  provider: string;
  description?: string;
  amount: number;
  currency: string;
  billingCycle: 'monthly' | 'quarterly' | 'annually' | 'custom';
  customCycleDays?: number;
  nextBillingDate: string;
  category: string;
  icon?: string; // URL or base64 string for uploaded icon
  autoRenewal: boolean;
  reminderDays: number; // Days before billing to send reminder
  status: 'active' | 'cancelled' | 'paused';
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const TRANSACTIONS_COLLECTION = 'personalFinanceTransactions';
const SUBSCRIPTIONS_COLLECTION = 'personalFinanceSubscriptions';
const BUDGETS_COLLECTION = 'personalFinanceBudgets';
const EMIS_COLLECTION = 'personalFinanceEMIs';
const LOANS_COLLECTION = 'personalFinanceLoans';
const CREDIT_CARDS_COLLECTION = 'personalFinanceCreditCards';

const TRANSACTIONS_STORAGE_KEY = 'personalFinanceTransactions';
const BUDGETS_STORAGE_KEY = 'personalFinanceBudgets';
const EMIS_STORAGE_KEY = 'personalFinanceEMIs';
const LOANS_STORAGE_KEY = 'personalFinanceLoans';
const CREDIT_CARDS_STORAGE_KEY = 'personalFinanceCreditCards';
const SUBSCRIPTIONS_STORAGE_KEY = 'personalFinanceSubscriptions';

/**
 * Get all transactions - fallback to localStorage if Firebase not available
 */
export async function getTransactions(): Promise<Transaction[]> {
  if (!isFirebaseAvailable()) {
    // Fallback to localStorage for development/offline
    const savedTransactions = localStorage.getItem(TRANSACTIONS_STORAGE_KEY);
    if (savedTransactions) {
      const parsedTransactions = JSON.parse(savedTransactions) as (Omit<Transaction, 'createdAt'> & {
        createdAt: string;
      })[];
      return parsedTransactions.map((transaction) => ({
        ...transaction,
        createdAt: new Date(transaction.createdAt)
      }));
    }
    return [];
  }

  try {
    const transactionsRef = collection(db, TRANSACTIONS_COLLECTION);
    const q = query(transactionsRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const transactions: Transaction[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      transactions.push({
        id: doc.id,
        date: data.date,
        description: data.description,
        amount: data.amount,
        category: data.category,
        type: data.type,
        createdAt: data.createdAt?.toDate() || new Date()
      });
    });
    
    return transactions;
  } catch (error) {
    console.error('Error fetching transactions from Firestore:', error);
    // Fallback to localStorage on error
    return getTransactionsFromLocalStorage();
  }
}

/**
 * Get all budgets - fallback to localStorage if Firebase not available
 */
export async function getBudgets(): Promise<Budget[]> {
  if (!isFirebaseAvailable()) {
    // Fallback to localStorage for development/offline
    const savedBudgets = localStorage.getItem(BUDGETS_STORAGE_KEY);
    if (savedBudgets) {
      return JSON.parse(savedBudgets) as Budget[];
    }
    return [];
  }

  try {
    const budgetsRef = collection(db, BUDGETS_COLLECTION);
    const q = query(budgetsRef, orderBy('category', 'asc'));
    const querySnapshot = await getDocs(q);
    
    const budgets: Budget[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      budgets.push({
        id: doc.id,
        category: data.category,
        budgetAmount: data.budgetAmount,
        spentAmount: data.spentAmount || 0,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      });
    });
    
    return budgets;
  } catch (error) {
    console.error('Error fetching budgets from Firestore:', error);
    // Fallback to localStorage on error
    return getBudgetsFromLocalStorage();
  }
}

/**
 * Add a new transaction
 */
export async function addTransaction(transactionData: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction> {
  const newTransaction: Omit<Transaction, 'id'> = {
    ...transactionData,
    createdAt: new Date()
  };

  if (!isFirebaseAvailable()) {
    // Fallback to localStorage
    const localTransaction: Transaction = {
      ...newTransaction,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
    };
    const transactions = await getTransactions();
    const updatedTransactions = [localTransaction, ...transactions];
    localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(updatedTransactions));
    return localTransaction;
  }

  try {
    const transactionsRef = collection(db, TRANSACTIONS_COLLECTION);
    const docRef = await addDoc(transactionsRef, {
      ...newTransaction,
      createdAt: serverTimestamp()
    });
    
    return {
      ...newTransaction,
      id: docRef.id
    };
  } catch (error) {
    console.error('Error adding transaction to Firestore:', error);
    throw error;
  }
}

/**
 * Add a new budget
 */
export async function addBudget(budgetData: Omit<Budget, 'id' | 'createdAt' | 'updatedAt'>): Promise<Budget> {
  const newBudget: Omit<Budget, 'id'> = {
    ...budgetData,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  if (!isFirebaseAvailable()) {
    // Fallback to localStorage
    const localBudget: Budget = {
      ...newBudget,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
    };
    const budgets = await getBudgets();
    const updatedBudgets = [...budgets, localBudget];
    localStorage.setItem(BUDGETS_STORAGE_KEY, JSON.stringify(updatedBudgets));
    return localBudget;
  }

  try {
    const budgetsRef = collection(db, BUDGETS_COLLECTION);
    const docRef = await addDoc(budgetsRef, {
      ...newBudget,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return {
      ...newBudget,
      id: docRef.id
    };
  } catch (error) {
    console.error('Error adding budget to Firestore:', error);
    throw error;
  }
}

/**
 * Update a budget's spent amount
 */
export async function updateBudgetSpentAmount(budgetId: string, spentAmount: number): Promise<void> {
  if (!isFirebaseAvailable()) {
    // Fallback to localStorage
    const budgets = await getBudgets();
    const updatedBudgets = budgets.map(budget => 
      budget.id === budgetId 
        ? { ...budget, spentAmount, updatedAt: new Date() }
        : budget
    );
    localStorage.setItem(BUDGETS_STORAGE_KEY, JSON.stringify(updatedBudgets));
    return;
  }

  try {
    const budgetRef = doc(db, BUDGETS_COLLECTION, budgetId);
    await updateDoc(budgetRef, {
      spentAmount,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating budget in Firestore:', error);
    throw error;
  }
}

/**
 * Delete a transaction
 */
export async function deleteTransaction(transactionId: string): Promise<void> {
  if (!isFirebaseAvailable()) {
    // Fallback to localStorage
    const transactions = await getTransactions();
    const filteredTransactions = transactions.filter(transaction => transaction.id !== transactionId);
    localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(filteredTransactions));
    return;
  }

  try {
    const transactionRef = doc(db, TRANSACTIONS_COLLECTION, transactionId);
    await deleteDoc(transactionRef);
  } catch (error) {
    console.error('Error deleting transaction from Firestore:', error);
    throw error;
  }
}

// EMI Functions
export async function getEMIs(): Promise<EMI[]> {
  if (!isFirebaseAvailable()) {
    const savedEMIs = localStorage.getItem(EMIS_STORAGE_KEY);
    if (savedEMIs) {
      return JSON.parse(savedEMIs);
    }
    return [];
  }

  try {
    const emiCollection = collection(db, EMIS_COLLECTION);
    const emiQuery = query(emiCollection, orderBy('createdAt', 'desc'));
    const emiSnapshot = await getDocs(emiQuery);
    
    return emiSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as EMI[];
  } catch (error) {
    console.error('Error fetching EMIs:', error);
    return [];
  }
}

export async function addEMI(emi: Omit<EMI, 'id' | 'createdAt' | 'updatedAt'>): Promise<EMI> {
  const newEMI: EMI = {
    ...emi,
    id: Math.random().toString(36).substr(2, 9),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  if (!isFirebaseAvailable()) {
    const savedEMIs = localStorage.getItem(EMIS_STORAGE_KEY);
    const emis = savedEMIs ? JSON.parse(savedEMIs) : [];
    emis.unshift(newEMI);
    localStorage.setItem(EMIS_STORAGE_KEY, JSON.stringify(emis));
    return newEMI;
  }

  try {
    const emiCollection = collection(db, EMIS_COLLECTION);
    const docRef = await addDoc(emiCollection, {
      ...emi,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    return {
      ...newEMI,
      id: docRef.id,
    };
  } catch (error) {
    console.error('Error adding EMI:', error);
    throw error;
  }
}

/**
 * Update an EMI
 */
export async function updateEMI(emiId: string, emiData: Partial<EMI>): Promise<EMI | null> {
  try {
    if (!isFirebaseAvailable()) {
      const savedEMIs = localStorage.getItem(EMIS_STORAGE_KEY);
      if (savedEMIs) {
        const emis = JSON.parse(savedEMIs);
        const emiIndex = emis.findIndex((emi: EMI) => emi.id === emiId);
        if (emiIndex !== -1) {
          emis[emiIndex] = { ...emis[emiIndex], ...emiData, updatedAt: new Date() };
          localStorage.setItem(EMIS_STORAGE_KEY, JSON.stringify(emis));
          return emis[emiIndex];
        }
      }
      return null;
    }

    if (db) {
      const emiRef = doc(db, EMIS_COLLECTION, emiId);
      const updateData = {
        ...emiData,
        updatedAt: new Date()
      };
      
      await updateDoc(emiRef, updateData);
      
      const updatedEMISnap = await getDoc(emiRef);
      if (updatedEMISnap.exists()) {
        return { id: updatedEMISnap.id, ...updatedEMISnap.data() } as EMI;
      }
    }
    return null;
  } catch (error) {
    console.error('Error updating EMI:', error);
    throw error;
  }
}

/**
 * Delete an EMI
 */
export async function deleteEMI(emiId: string): Promise<void> {
  try {
    if (!isFirebaseAvailable()) {
      const savedEMIs = localStorage.getItem(EMIS_STORAGE_KEY);
      if (savedEMIs) {
        const emis = JSON.parse(savedEMIs);
        const filteredEMIs = emis.filter((emi: EMI) => emi.id !== emiId);
        localStorage.setItem(EMIS_STORAGE_KEY, JSON.stringify(filteredEMIs));
      }
      return;
    }

    if (db) {
      const emiRef = doc(db, EMIS_COLLECTION, emiId);
      await deleteDoc(emiRef);
    }
  } catch (error) {
    console.error('Error deleting EMI:', error);
    throw error;
  }
}

// Loan Functions
export async function getLoans(): Promise<Loan[]> {
  if (!isFirebaseAvailable()) {
    const savedLoans = localStorage.getItem(LOANS_STORAGE_KEY);
    if (savedLoans) {
      return JSON.parse(savedLoans);
    }
    return [];
  }

  try {
    const loanCollection = collection(db, LOANS_COLLECTION);
    const loanQuery = query(loanCollection, orderBy('createdAt', 'desc'));
    const loanSnapshot = await getDocs(loanQuery);
    
    return loanSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as Loan[];
  } catch (error) {
    console.error('Error fetching loans:', error);
    return [];
  }
}

export async function addLoan(loan: Omit<Loan, 'id' | 'createdAt' | 'updatedAt'>): Promise<Loan> {
  const newLoan: Loan = {
    ...loan,
    id: Math.random().toString(36).substr(2, 9),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  if (!isFirebaseAvailable()) {
    const savedLoans = localStorage.getItem(LOANS_STORAGE_KEY);
    const loans = savedLoans ? JSON.parse(savedLoans) : [];
    loans.unshift(newLoan);
    localStorage.setItem(LOANS_STORAGE_KEY, JSON.stringify(loans));
    return newLoan;
  }

  try {
    const loanCollection = collection(db, LOANS_COLLECTION);
    const docRef = await addDoc(loanCollection, {
      ...loan,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    return {
      ...newLoan,
      id: docRef.id,
    };
  } catch (error) {
    console.error('Error adding loan:', error);
    throw error;
  }
}

// Credit Card Functions
export async function getCreditCards(): Promise<CreditCard[]> {
  if (!isFirebaseAvailable()) {
    const savedCards = localStorage.getItem(CREDIT_CARDS_STORAGE_KEY);
    if (savedCards) {
      return JSON.parse(savedCards);
    }
    return [];
  }

  try {
    const cardCollection = collection(db, CREDIT_CARDS_COLLECTION);
    const cardQuery = query(cardCollection, orderBy('createdAt', 'desc'));
    const cardSnapshot = await getDocs(cardQuery);
    
    return cardSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as CreditCard[];
  } catch (error) {
    console.error('Error fetching credit cards:', error);
    return [];
  }
}

export async function addCreditCard(card: Omit<CreditCard, 'id' | 'createdAt' | 'updatedAt'>): Promise<CreditCard> {
  const newCard: CreditCard = {
    ...card,
    id: Math.random().toString(36).substr(2, 9),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  if (!isFirebaseAvailable()) {
    const savedCards = localStorage.getItem(CREDIT_CARDS_STORAGE_KEY);
    const cards = savedCards ? JSON.parse(savedCards) : [];
    cards.unshift(newCard);
    localStorage.setItem(CREDIT_CARDS_STORAGE_KEY, JSON.stringify(cards));
    return newCard;
  }

  try {
    const cardCollection = collection(db, CREDIT_CARDS_COLLECTION);
    const docRef = await addDoc(cardCollection, {
      ...card,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    return {
      ...newCard,
      id: docRef.id,
    };
  } catch (error) {
    console.error('Error adding credit card:', error);
    throw error;
  }
}

// Helper function to get daily spending data for charts
export async function getDailySpendingData(days: number = 7): Promise<{ date: string; amount: number }[]> {
  const transactions = await getTransactions();
  const expenseTransactions = transactions.filter(t => t.type === 'expense');
  
  const today = new Date();
  const dailyData: { date: string; amount: number }[] = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateString = date.toISOString().split('T')[0];
    
    const dayExpenses = expenseTransactions
      .filter(t => t.date === dateString)
      .reduce((sum, t) => sum + t.amount, 0);
    
    dailyData.push({
      date: dateString,
      amount: dayExpenses
    });
  }
  
  return dailyData;
}

/**
 * Calculate spent amount for a category
 */
export async function calculateSpentAmount(category: string): Promise<number> {
  const transactions = await getTransactions();
  return transactions
    .filter(t => t.category === category && t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
}

/**
 * Update all budget spent amounts based on transactions
 */
export async function updateAllBudgetSpentAmounts(): Promise<void> {
  const budgets = await getBudgets();
  const transactions = await getTransactions();

  for (const budget of budgets) {
    const spentAmount = transactions
      .filter(t => t.category === budget.category && t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    if (budget.id && spentAmount !== budget.spentAmount) {
      await updateBudgetSpentAmount(budget.id, spentAmount);
    }
  }
}

/**
 * Helper function to get transactions from localStorage
 */
function getTransactionsFromLocalStorage(): Transaction[] {
  const savedTransactions = localStorage.getItem(TRANSACTIONS_STORAGE_KEY);
  if (savedTransactions) {
    const parsedTransactions = JSON.parse(savedTransactions) as (Omit<Transaction, 'createdAt'> & {
      createdAt: string;
    })[];
    return parsedTransactions.map((transaction) => ({
      ...transaction,
      createdAt: new Date(transaction.createdAt)
    }));
  }
  return [];
}

/**
 * Helper function to get budgets from localStorage
 */
function getBudgetsFromLocalStorage(): Budget[] {
  const savedBudgets = localStorage.getItem(BUDGETS_STORAGE_KEY);
  if (savedBudgets) {
    return JSON.parse(savedBudgets) as Budget[];
  }
  return [];
}

/**
 * Mark EMI as paid for a loan
 */
export async function markEMIPaid(loanId: string): Promise<Loan | null> {
  try {
    if (db) {
      const loanRef = doc(db, LOANS_COLLECTION, loanId);
      const loanSnap = await getDoc(loanRef);
      
      if (loanSnap.exists()) {
        const loanData = { id: loanSnap.id, ...loanSnap.data() } as Loan;
        
        // Calculate next due date (add 1 month)
        const currentDueDate = new Date(loanData.nextDueDate);
        const nextDueDate = new Date(currentDueDate);
        nextDueDate.setMonth(nextDueDate.getMonth() + 1);
        
        // Update loan data
        const updatedData = {
          paidMonths: loanData.paidMonths + 1,
          pendingMonths: Math.max(0, loanData.pendingMonths - 1),
          currentBalance: Math.max(0, loanData.currentBalance - loanData.monthlyEMI),
          nextDueDate: nextDueDate.toISOString().split('T')[0],
          lastPaidDate: new Date().toISOString().split('T')[0],
          status: loanData.pendingMonths <= 1 ? 'closed' : loanData.status,
          updatedAt: new Date()
        };
        
        await updateDoc(loanRef, updatedData);
        return { ...loanData, ...updatedData };
      }
    }
    return null;
  } catch (error) {
    console.error('Error marking EMI as paid:', error);
    throw error;
  }
}

/**
 * Update loan information
 */
export async function updateLoan(loanId: string, loanData: Partial<Loan>): Promise<Loan | null> {
  try {
    if (db) {
      const loanRef = doc(db, LOANS_COLLECTION, loanId);
      const updateData = {
        ...loanData,
        updatedAt: new Date()
      };
      
      await updateDoc(loanRef, updateData);
      
      const updatedLoanSnap = await getDoc(loanRef);
      if (updatedLoanSnap.exists()) {
        return { id: updatedLoanSnap.id, ...updatedLoanSnap.data() } as Loan;
      }
    }
    return null;
  } catch (error) {
    console.error('Error updating loan:', error);
    throw error;
  }
}

/**
 * Delete a loan
 */
export async function deleteLoan(loanId: string): Promise<void> {
  try {
    if (db) {
      const loanRef = doc(db, LOANS_COLLECTION, loanId);
      await deleteDoc(loanRef);
    }
  } catch (error) {
    console.error('Error deleting loan:', error);
    throw error;
  }
}

/**
 * Delete a credit card
 */
export async function deleteCreditCard(cardId: string): Promise<void> {
  try {
    if (!isFirebaseAvailable()) {
      const savedCards = localStorage.getItem(CREDIT_CARDS_STORAGE_KEY);
      if (savedCards) {
        const cards = JSON.parse(savedCards);
        const updatedCards = cards.filter((card: CreditCard) => card.id !== cardId);
        localStorage.setItem(CREDIT_CARDS_STORAGE_KEY, JSON.stringify(updatedCards));
      }
      return;
    }
    
    if (db) {
      const cardRef = doc(db, CREDIT_CARDS_COLLECTION, cardId);
      await deleteDoc(cardRef);
    }
  } catch (error) {
    console.error('Error deleting credit card:', error);
    throw error;
  }
}

/**
 * Get all subscriptions
 */
export async function getSubscriptions(): Promise<Subscription[]> {
  if (!isFirebaseAvailable()) {
    const savedSubscriptions = localStorage.getItem(SUBSCRIPTIONS_STORAGE_KEY);
    if (savedSubscriptions) {
      return JSON.parse(savedSubscriptions);
    }
    return [];
  }

  try {
    const subscriptionCollection = collection(db, SUBSCRIPTIONS_COLLECTION);
    const subscriptionQuery = query(subscriptionCollection, orderBy('createdAt', 'desc'));
    const subscriptionSnapshot = await getDocs(subscriptionQuery);
    
    return subscriptionSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as Subscription[];
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    return [];
  }
}

/**
 * Add a new subscription
 */
export async function addSubscription(subscription: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>): Promise<Subscription> {
  const newSubscription: Subscription = {
    ...subscription,
    id: Math.random().toString(36).substr(2, 9),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  if (!isFirebaseAvailable()) {
    const savedSubscriptions = localStorage.getItem(SUBSCRIPTIONS_STORAGE_KEY);
    const subscriptions = savedSubscriptions ? JSON.parse(savedSubscriptions) : [];
    subscriptions.unshift(newSubscription);
    localStorage.setItem(SUBSCRIPTIONS_STORAGE_KEY, JSON.stringify(subscriptions));
    return newSubscription;
  }

  try {
    // Clean the subscription data by removing undefined values
    const cleanSubscriptionData = Object.fromEntries(
      Object.entries(subscription).filter(([, value]) => value !== undefined)
    );

    const subscriptionCollection = collection(db, SUBSCRIPTIONS_COLLECTION);
    const docRef = await addDoc(subscriptionCollection, {
      ...cleanSubscriptionData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    return {
      ...newSubscription,
      id: docRef.id,
    };
  } catch (error) {
    console.error('Error adding subscription:', error);
    throw error;
  }
}

/**
 * Update a subscription
 */
export async function updateSubscription(subscriptionId: string, subscriptionData: Partial<Subscription>): Promise<Subscription | null> {
  try {
    if (!isFirebaseAvailable()) {
      const savedSubscriptions = localStorage.getItem(SUBSCRIPTIONS_STORAGE_KEY);
      if (savedSubscriptions) {
        const subscriptions = JSON.parse(savedSubscriptions);
        const index = subscriptions.findIndex((sub: Subscription) => sub.id === subscriptionId);
        
        if (index !== -1) {
          const updatedSubscription = {
            ...subscriptions[index],
            ...subscriptionData,
            updatedAt: new Date()
          };
          subscriptions[index] = updatedSubscription;
          localStorage.setItem(SUBSCRIPTIONS_STORAGE_KEY, JSON.stringify(subscriptions));
          return updatedSubscription;
        }
      }
      return null;
    }
    
    if (db) {
      const subscriptionRef = doc(db, SUBSCRIPTIONS_COLLECTION, subscriptionId);
      
      // Clean the subscription data by removing undefined values
      const cleanSubscriptionData = Object.fromEntries(
        Object.entries(subscriptionData).filter(([, value]) => value !== undefined)
      );
      
      const updateData = {
        ...cleanSubscriptionData,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(subscriptionRef, updateData);
      
      const updatedSubscriptionSnap = await getDoc(subscriptionRef);
      if (updatedSubscriptionSnap.exists()) {
        const data = updatedSubscriptionSnap.data();
        return { 
          id: updatedSubscriptionSnap.id, 
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate()
        } as Subscription;
      }
    }
    return null;
  } catch (error) {
    console.error('Error updating subscription:', error);
    throw error;
  }
}

/**
 * Delete a subscription
 */
export async function deleteSubscription(subscriptionId: string): Promise<void> {
  try {
    if (!isFirebaseAvailable()) {
      const savedSubscriptions = localStorage.getItem(SUBSCRIPTIONS_STORAGE_KEY);
      if (savedSubscriptions) {
        const subscriptions = JSON.parse(savedSubscriptions);
        const updatedSubscriptions = subscriptions.filter((sub: Subscription) => sub.id !== subscriptionId);
        localStorage.setItem(SUBSCRIPTIONS_STORAGE_KEY, JSON.stringify(updatedSubscriptions));
      }
      return;
    }
    
    if (db) {
      const subscriptionRef = doc(db, SUBSCRIPTIONS_COLLECTION, subscriptionId);
      await deleteDoc(subscriptionRef);
    }
  } catch (error) {
    console.error('Error deleting subscription:', error);
    throw error;
  }
}
