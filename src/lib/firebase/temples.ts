import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  DocumentSnapshot
} from 'firebase/firestore';
import { db } from '../firebase';
import { TemplePlan, PlanStatus } from '@/lib/types/temple';

const COLLECTION_NAME = 'templePlans';

// Get user's temple plans collection reference
const getUserPlansRef = (uid: string) => collection(db, 'users', uid, COLLECTION_NAME);

// Get specific plan document reference
const getPlanRef = (uid: string, planId: string) => doc(db, 'users', uid, COLLECTION_NAME, planId);

// Convert Firestore document to TemplePlan
const convertToTemplePlan = (doc: DocumentSnapshot): TemplePlan | null => {
  if (!doc.exists()) return null;
  
  const data = doc.data();
  return {
    id: doc.id,
    ownerId: data.ownerId,
    createdAt: data.createdAt?.toMillis() || Date.now(),
    updatedAt: data.updatedAt?.toMillis() || Date.now(),
    status: data.status,
    templeName: data.templeName,
    deity: data.deity,
    address: data.address,
    location: data.location,
    vowReason: data.vowReason,
    vowMadeOn: data.vowMadeOn?.toMillis(),
    due: data.due,
    targetVisitDate: data.targetVisitDate?.toMillis(),
    soloOrGroup: data.soloOrGroup,
    companions: data.companions,
    transportMode: data.transportMode,
    routeMap: data.routeMap,
    stayPlan: data.stayPlan,
    checklist: data.checklist,
    budget: data.budget,
    lastVisit: data.lastVisit ? {
      ...data.lastVisit,
      visitedOn: data.lastVisit.visitedOn?.toMillis() || data.lastVisit.visitedOn
    } : undefined,
    tags: data.tags,
    coverMedia: data.coverMedia,
  } as TemplePlan;
};

// Create a new temple plan
export const createTemplePlan = async (uid: string, planData: Omit<TemplePlan, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const plansRef = getUserPlansRef(uid);
    
    // Compute initial status
    const status = computePlanStatus(planData);
    
    const docData = {
      ...planData,
      ownerId: uid,
      status,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      // Convert date numbers to Timestamps for due dates and visit dates
      targetVisitDate: planData.targetVisitDate ? Timestamp.fromMillis(planData.targetVisitDate) : null,
      vowMadeOn: planData.vowMadeOn ? Timestamp.fromMillis(planData.vowMadeOn) : null,
      lastVisit: planData.lastVisit ? {
        ...planData.lastVisit,
        visitedOn: Timestamp.fromMillis(planData.lastVisit.visitedOn)
      } : null,
    };
    
    const docRef = await addDoc(plansRef, docData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating temple plan:', error);
    throw new Error('Failed to create temple plan');
  }
};

// Update a temple plan
export const updateTemplePlan = async (uid: string, planId: string, updates: Partial<TemplePlan>): Promise<void> => {
  try {
    const planRef = getPlanRef(uid, planId);
    
    // Recompute status if relevant fields changed
    if (updates.status || updates.due || updates.targetVisitDate) {
      const currentDoc = await getDoc(planRef);
      if (currentDoc.exists()) {
        const currentPlan = convertToTemplePlan(currentDoc);
        if (currentPlan) {
          const updatedPlan = { ...currentPlan, ...updates };
          updates.status = computePlanStatus(updatedPlan);
        }
      }
    }
    
    const updateData = {
      ...updates,
      updatedAt: serverTimestamp(),
      // Convert timestamps
      targetVisitDate: updates.targetVisitDate ? Timestamp.fromMillis(updates.targetVisitDate) : undefined,
      vowMadeOn: updates.vowMadeOn ? Timestamp.fromMillis(updates.vowMadeOn) : undefined,
      lastVisit: updates.lastVisit ? {
        ...updates.lastVisit,
        visitedOn: Timestamp.fromMillis(updates.lastVisit.visitedOn)
      } : undefined,
    };
    
    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key as keyof typeof updateData] === undefined) {
        delete updateData[key as keyof typeof updateData];
      }
    });
    
    await updateDoc(planRef, updateData);
  } catch (error) {
    console.error('Error updating temple plan:', error);
    throw new Error('Failed to update temple plan');
  }
};

// Get a single temple plan
export const getTemplePlan = async (uid: string, planId: string): Promise<TemplePlan | null> => {
  try {
    const planRef = getPlanRef(uid, planId);
    const doc = await getDoc(planRef);
    return convertToTemplePlan(doc);
  } catch (error) {
    console.error('Error getting temple plan:', error);
    throw new Error('Failed to get temple plan');
  }
};

// List all temple plans for a user with optional filters
export const listTemplePlans = async (
  uid: string, 
  filters?: { status?: PlanStatus; orderBy?: string }
): Promise<TemplePlan[]> => {
  try {
    const plansRef = getUserPlansRef(uid);
    let q = query(plansRef);
    
    // Apply filters
    if (filters?.status) {
      q = query(q, where('status', '==', filters.status));
    }
    
    // Apply ordering
    if (filters?.orderBy === 'dueDate') {
      q = query(q, orderBy('due.value', 'asc'));
    } else {
      q = query(q, orderBy('updatedAt', 'desc'));
    }
    
    const snapshot = await getDocs(q);
    const plans: TemplePlan[] = [];
    
    snapshot.forEach(doc => {
      const plan = convertToTemplePlan(doc);
      if (plan) {
        plans.push(plan);
      }
    });
    
    return plans;
  } catch (error) {
    console.error('Error listing temple plans:', error);
    throw new Error('Failed to list temple plans');
  }
};

// Delete a temple plan
export const deleteTemplePlan = async (uid: string, planId: string): Promise<void> => {
  try {
    const planRef = getPlanRef(uid, planId);
    await deleteDoc(planRef);
  } catch (error) {
    console.error('Error deleting temple plan:', error);
    throw new Error('Failed to delete temple plan');
  }
};

// Mark plan as completed with visit details
export const markPlanCompleted = async (
  uid: string, 
  planId: string, 
  visitDetails: TemplePlan['lastVisit']
): Promise<void> => {
  try {
    const updates: Partial<TemplePlan> = {
      status: 'COMPLETED',
      lastVisit: visitDetails
    };
    
    await updateTemplePlan(uid, planId, updates);
  } catch (error) {
    console.error('Error marking plan as completed:', error);
    throw new Error('Failed to mark plan as completed');
  }
};

// Utility function to compute plan status
const computePlanStatus = (plan: Partial<TemplePlan>): PlanStatus => {
  if (plan.status === 'COMPLETED' || plan.status === 'CANCELLED') {
    return plan.status;
  }
  
  if (!plan.due) return 'PLANNED';
  
  const now = Date.now();
  let dueTimestamp: number;
  
  switch (plan.due.type) {
    case 'DATE':
      dueTimestamp = plan.due.value;
      break;
    case 'MONTH':
      // Convert YYYYMM to end of month
      const year = Math.floor(plan.due.value / 100);
      const month = plan.due.value % 100;
      dueTimestamp = new Date(year, month, 0, 23, 59, 59).getTime();
      break;
    case 'YEAR':
      // End of the year
      dueTimestamp = new Date(plan.due.value, 11, 31, 23, 59, 59).getTime();
      break;
    default:
      return 'PLANNED';
  }
  
  return now > dueTimestamp ? 'OVERDUE' : 'PLANNED';
};

// Utility functions for derived data
export const getDaysToDue = (plan: TemplePlan): number => {
  if (!plan.due) return Infinity;
  
  const now = Date.now();
  let dueTimestamp: number;
  
  switch (plan.due.type) {
    case 'DATE':
      dueTimestamp = plan.due.value;
      break;
    case 'MONTH':
      const year = Math.floor(plan.due.value / 100);
      const month = plan.due.value % 100;
      dueTimestamp = new Date(year, month - 1, 1).getTime();
      break;
    case 'YEAR':
      dueTimestamp = new Date(plan.due.value, 0, 1).getTime();
      break;
    default:
      return Infinity;
  }
  
  return Math.ceil((dueTimestamp - now) / (1000 * 60 * 60 * 24));
};

export const getBudgetProgress = (plan: TemplePlan): number => {
  if (!plan.budget.planned || plan.budget.planned === 0) return 0;
  return (plan.budget.savedSoFar || 0) / plan.budget.planned;
};

export const isOverdue = (plan: TemplePlan): boolean => {
  return plan.status === 'OVERDUE';
};
