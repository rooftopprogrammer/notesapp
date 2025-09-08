import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  addExpense,
  updateExpense,
  deleteExpense,
  listExpenses,
  getTotalExpenses,
  getExpensesByCategory
} from '@/lib/firebase/expenses';
import { Expense } from '@/lib/types/temple';

export const useExpenses = (planId: string) => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [expensesByCategory, setExpensesByCategory] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load all expenses for the plan
  const loadExpenses = useCallback(async () => {
    if (!user?.uid || !planId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const [fetchedExpenses, total, byCategory] = await Promise.all([
        listExpenses(user.uid, planId),
        getTotalExpenses(user.uid, planId),
        getExpensesByCategory(user.uid, planId)
      ]);
      
      setExpenses(fetchedExpenses);
      setTotalExpenses(total);
      setExpensesByCategory(byCategory);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load expenses');
    } finally {
      setLoading(false);
    }
  }, [user?.uid, planId]);

  // Add a new expense
  const createExpense = useCallback(async (expenseData: Omit<Expense, 'id' | 'createdAt'>): Promise<string | null> => {
    if (!user?.uid || !planId) {
      setError('User not authenticated or plan not specified');
      return null;
    }
    
    setError(null);
    
    try {
      const expenseId = await addExpense(user.uid, planId, expenseData);
      await loadExpenses(); // Reload expenses
      return expenseId;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create expense');
      return null;
    }
  }, [user?.uid, planId, loadExpenses]);

  // Update an existing expense
  const updateExpenseById = useCallback(async (expenseId: string, updates: Partial<Expense>): Promise<boolean> => {
    if (!user?.uid || !planId) {
      setError('User not authenticated or plan not specified');
      return false;
    }
    
    setError(null);
    
    try {
      await updateExpense(user.uid, planId, expenseId, updates);
      await loadExpenses(); // Reload expenses
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update expense');
      return false;
    }
  }, [user?.uid, planId, loadExpenses]);

  // Delete an expense
  const deleteExpenseById = useCallback(async (expenseId: string): Promise<boolean> => {
    if (!user?.uid || !planId) {
      setError('User not authenticated or plan not specified');
      return false;
    }
    
    setError(null);
    
    try {
      await deleteExpense(user.uid, planId, expenseId);
      await loadExpenses(); // Reload expenses
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete expense');
      return false;
    }
  }, [user?.uid, planId, loadExpenses]);

  // Load expenses on mount
  useEffect(() => {
    if (user?.uid && planId) {
      loadExpenses();
    }
  }, [user?.uid, planId, loadExpenses]);

  return {
    expenses,
    totalExpenses,
    expensesByCategory,
    loading,
    error,
    loadExpenses,
    createExpense,
    updateExpenseById,
    deleteExpenseById,
  };
};
