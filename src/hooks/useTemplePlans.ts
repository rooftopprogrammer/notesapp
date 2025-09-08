import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  createTemplePlan,
  updateTemplePlan,
  getTemplePlan,
  listTemplePlans,
  deleteTemplePlan,
  markPlanCompleted,
  getDaysToDue,
  getBudgetProgress,
  isOverdue
} from '@/lib/firebase/temples';
import { TemplePlan, PlanStatus, DerivedPlanData, TempleFilters } from '@/lib/types/temple';

export const useTemplePlans = (filters?: TempleFilters) => {
  const { user } = useAuth();
  const [plans, setPlans] = useState<TemplePlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load all plans for the user
  const loadPlans = useCallback(async (searchFilters?: TempleFilters) => {
    if (!user?.uid) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Convert TempleFilters to simple format for now
      const simpleFilters = searchFilters?.status?.length ? 
        { status: searchFilters.status[0] } : 
        undefined;
      const fetchedPlans = await listTemplePlans(user.uid, simpleFilters);
      setPlans(fetchedPlans);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load plans');
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  // Create a new plan
  const createPlan = useCallback(async (planData: Omit<TemplePlan, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>): Promise<string | null> => {
    if (!user?.uid) {
      setError('User not authenticated');
      return null;
    }
    
    setError(null);
    
    try {
      const planId = await createTemplePlan(user.uid, planData);
      await loadPlans(); // Reload plans
      return planId;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create plan');
      return null;
    }
  }, [user?.uid, loadPlans]);

  // Update an existing plan
  const updatePlan = useCallback(async (planId: string, updates: Partial<TemplePlan>): Promise<boolean> => {
    if (!user?.uid) {
      setError('User not authenticated');
      return false;
    }
    
    setError(null);
    
    try {
      await updateTemplePlan(user.uid, planId, updates);
      await loadPlans(); // Reload plans
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update plan');
      return false;
    }
  }, [user?.uid, loadPlans]);

  // Delete a plan
  const deletePlan = useCallback(async (planId: string): Promise<boolean> => {
    if (!user?.uid) {
      setError('User not authenticated');
      return false;
    }
    
    setError(null);
    
    try {
      await deleteTemplePlan(user.uid, planId);
      await loadPlans(); // Reload plans
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete plan');
      return false;
    }
  }, [user?.uid, loadPlans]);

  // Mark plan as completed
  const completePlan = useCallback(async (planId: string, visitDetails: TemplePlan['lastVisit']): Promise<boolean> => {
    if (!user?.uid || !visitDetails) {
      setError('Invalid parameters for completing plan');
      return false;
    }
    
    setError(null);
    
    try {
      await markPlanCompleted(user.uid, planId, visitDetails);
      await loadPlans(); // Reload plans
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete plan');
      return false;
    }
  }, [user?.uid, loadPlans]);

  // Get derived data for a plan
  const getPlanDerivedData = useCallback((plan: TemplePlan): DerivedPlanData => {
    return {
      daysToDue: getDaysToDue(plan),
      isOverdue: isOverdue(plan),
      budgetProgress: getBudgetProgress(plan),
      spentVsBudget: plan.lastVisit ? plan.lastVisit.totalSpent / plan.budget.planned : 0,
      totalSpent: plan.lastVisit?.totalSpent || 0
    };
  }, []);

  // Load plans on mount and when filters change
  useEffect(() => {
    if (user?.uid) {
      loadPlans(filters);
    }
  }, [user?.uid, loadPlans, filters]);

  return {
    plans,
    loading,
    error,
    loadPlans,
    createPlan,
    updatePlan,
    deletePlan,
    completePlan,
    getPlanDerivedData,
  };
};

// Hook for working with a single plan
export const useTemplePlan = (planId: string) => {
  const { user } = useAuth();
  const [plan, setPlan] = useState<TemplePlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load a specific plan
  const loadPlan = useCallback(async () => {
    if (!user?.uid || !planId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const fetchedPlan = await getTemplePlan(user.uid, planId);
      setPlan(fetchedPlan);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load plan');
    } finally {
      setLoading(false);
    }
  }, [user?.uid, planId]);

  // Update the plan
  const updatePlan = useCallback(async (updates: Partial<TemplePlan>): Promise<boolean> => {
    if (!user?.uid || !planId) {
      setError('Invalid parameters for updating plan');
      return false;
    }
    
    setError(null);
    
    try {
      await updateTemplePlan(user.uid, planId, updates);
      await loadPlan(); // Reload plan
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update plan');
      return false;
    }
  }, [user?.uid, planId, loadPlan]);

  // Get derived data for the current plan
  const derivedData = plan ? {
    daysToDue: getDaysToDue(plan),
    isOverdue: isOverdue(plan),
    budgetProgress: getBudgetProgress(plan),
    spentVsBudget: plan.lastVisit ? plan.lastVisit.totalSpent / plan.budget.planned : 0,
    totalSpent: plan.lastVisit?.totalSpent || 0
  } : null;

  // Load plan on mount
  useEffect(() => {
    if (user?.uid && planId) {
      loadPlan();
    }
  }, [user?.uid, planId, loadPlan]);

  return {
    plan,
    loading,
    error,
    loadPlan,
    updatePlan,
    derivedData,
  };
};
