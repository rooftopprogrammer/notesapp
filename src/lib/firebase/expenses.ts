import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
  DocumentSnapshot
} from 'firebase/firestore';
import { db } from '../firebase';
import { Expense } from '@/lib/types/temple';

// Get user's temple plan expenses collection reference
const getPlanExpensesRef = (uid: string, planId: string) => 
  collection(db, 'users', uid, 'templePlans', planId, 'expenses');

// Get specific expense document reference
const getExpenseRef = (uid: string, planId: string, expenseId: string) => 
  doc(db, 'users', uid, 'templePlans', planId, 'expenses', expenseId);

// Convert Firestore document to Expense
const convertToExpense = (doc: DocumentSnapshot): Expense | null => {
  if (!doc.exists()) return null;
  
  const data = doc.data();
  return {
    id: doc.id,
    createdAt: data.createdAt?.toMillis() || Date.now(),
    date: data.date?.toMillis() || Date.now(),
    category: data.category,
    amount: data.amount,
    notes: data.notes,
    receiptPath: data.receiptPath,
  } as Expense;
};

// Add a new expense
export const addExpense = async (
  uid: string, 
  planId: string, 
  expenseData: Omit<Expense, 'id' | 'createdAt'>
): Promise<string> => {
  try {
    const expensesRef = getPlanExpensesRef(uid, planId);
    
    const docData = {
      ...expenseData,
      createdAt: serverTimestamp(),
      date: Timestamp.fromMillis(expenseData.date),
    };
    
    const docRef = await addDoc(expensesRef, docData);
    return docRef.id;
  } catch (error) {
    console.error('Error adding expense:', error);
    throw new Error('Failed to add expense');
  }
};

// Update an expense
export const updateExpense = async (
  uid: string, 
  planId: string, 
  expenseId: string, 
  updates: Partial<Expense>
): Promise<void> => {
  try {
    const expenseRef = getExpenseRef(uid, planId, expenseId);
    
    const updateData = {
      ...updates,
      date: updates.date ? Timestamp.fromMillis(updates.date) : undefined,
    };
    
    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key as keyof typeof updateData] === undefined) {
        delete updateData[key as keyof typeof updateData];
      }
    });
    
    await updateDoc(expenseRef, updateData);
  } catch (error) {
    console.error('Error updating expense:', error);
    throw new Error('Failed to update expense');
  }
};

// Delete an expense
export const deleteExpense = async (
  uid: string, 
  planId: string, 
  expenseId: string
): Promise<void> => {
  try {
    const expenseRef = getExpenseRef(uid, planId, expenseId);
    await deleteDoc(expenseRef);
  } catch (error) {
    console.error('Error deleting expense:', error);
    throw new Error('Failed to delete expense');
  }
};

// Get a single expense
export const getExpense = async (
  uid: string, 
  planId: string, 
  expenseId: string
): Promise<Expense | null> => {
  try {
    const expenseRef = getExpenseRef(uid, planId, expenseId);
    const doc = await getDoc(expenseRef);
    return convertToExpense(doc);
  } catch (error) {
    console.error('Error getting expense:', error);
    throw new Error('Failed to get expense');
  }
};

// List all expenses for a temple plan
export const listExpenses = async (uid: string, planId: string): Promise<Expense[]> => {
  try {
    const expensesRef = getPlanExpensesRef(uid, planId);
    const q = query(expensesRef, orderBy('date', 'desc'));
    
    const snapshot = await getDocs(q);
    const expenses: Expense[] = [];
    
    snapshot.forEach(doc => {
      const expense = convertToExpense(doc);
      if (expense) {
        expenses.push(expense);
      }
    });
    
    return expenses;
  } catch (error) {
    console.error('Error listing expenses:', error);
    throw new Error('Failed to list expenses');
  }
};

// Get total expenses for a plan
export const getTotalExpenses = async (uid: string, planId: string): Promise<number> => {
  try {
    const expenses = await listExpenses(uid, planId);
    return expenses.reduce((total, expense) => total + expense.amount, 0);
  } catch (error) {
    console.error('Error calculating total expenses:', error);
    return 0;
  }
};

// Get expenses by category
export const getExpensesByCategory = async (uid: string, planId: string): Promise<Record<string, number>> => {
  try {
    const expenses = await listExpenses(uid, planId);
    const byCategory: Record<string, number> = {};
    
    expenses.forEach(expense => {
      byCategory[expense.category] = (byCategory[expense.category] || 0) + expense.amount;
    });
    
    return byCategory;
  } catch (error) {
    console.error('Error getting expenses by category:', error);
    return {};
  }
};
