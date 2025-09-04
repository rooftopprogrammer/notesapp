// Goals and Habits Management Library
import { db } from './firebase';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';

export interface Goal {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  status: 'not-started' | 'in-progress' | 'completed' | 'on-hold';
  targetDate: string;
  progress: number;
  milestones: string[];
  completedMilestones: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Habit {
  id: string;
  title: string;
  description: string;
  category: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  targetDays: number;
  currentStreak: number;
  longestStreak: number;
  completedDates: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Goals Functions
export const addGoal = async (goalData: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>) => {
  try {
    const now = new Date().toISOString();
    const cleanedData = {
      ...goalData,
      title: goalData.title || '',
      description: goalData.description || '',
      category: goalData.category || 'personal',
      priority: goalData.priority || 'medium',
      status: goalData.status || 'not-started',
      targetDate: goalData.targetDate || '',
      progress: goalData.progress || 0,
      milestones: goalData.milestones || [],
      completedMilestones: goalData.completedMilestones || [],
      createdAt: now,
      updatedAt: now
    };

    if (db) {
      const docRef = await addDoc(collection(db, 'personalGoals'), cleanedData);
      return docRef.id;
    } else {
      // Fallback to localStorage
      const goals = JSON.parse(localStorage.getItem('personalGoals') || '[]');
      const newGoal = { ...cleanedData, id: Date.now().toString() };
      goals.push(newGoal);
      localStorage.setItem('personalGoals', JSON.stringify(goals));
      return newGoal.id;
    }
  } catch (error) {
    console.error('Error adding goal:', error);
    // Fallback to localStorage on error
    const goals = JSON.parse(localStorage.getItem('personalGoals') || '[]');
    const now = new Date().toISOString();
    const newGoal = { 
      ...goalData, 
      id: Date.now().toString(),
      createdAt: now,
      updatedAt: now
    };
    goals.push(newGoal);
    localStorage.setItem('personalGoals', JSON.stringify(goals));
    return newGoal.id;
  }
};

export const getGoals = async (): Promise<Goal[]> => {
  try {
    if (db) {
      const q = query(collection(db, 'personalGoals'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Goal[];
    } else {
      // Fallback to localStorage
      return JSON.parse(localStorage.getItem('personalGoals') || '[]');
    }
  } catch (error) {
    console.error('Error getting goals:', error);
    // Fallback to localStorage on error
    return JSON.parse(localStorage.getItem('personalGoals') || '[]');
  }
};

export const updateGoal = async (goalId: string, updates: Partial<Goal>) => {
  try {
    const updatedData = {
      ...updates,
      updatedAt: new Date().toISOString()
    };

    if (db) {
      const goalRef = doc(db, 'personalGoals', goalId);
      await updateDoc(goalRef, updatedData);
    } else {
      // Fallback to localStorage
      const goals = JSON.parse(localStorage.getItem('personalGoals') || '[]');
      const index = goals.findIndex((goal: Goal) => goal.id === goalId);
      if (index !== -1) {
        goals[index] = { ...goals[index], ...updatedData };
        localStorage.setItem('personalGoals', JSON.stringify(goals));
      }
    }
  } catch (error) {
    console.error('Error updating goal:', error);
    // Fallback to localStorage on error
    const goals = JSON.parse(localStorage.getItem('personalGoals') || '[]');
    const index = goals.findIndex((goal: Goal) => goal.id === goalId);
    if (index !== -1) {
      goals[index] = { ...goals[index], ...updates, updatedAt: new Date().toISOString() };
      localStorage.setItem('personalGoals', JSON.stringify(goals));
    }
  }
};

export const deleteGoal = async (goalId: string) => {
  try {
    if (db) {
      await deleteDoc(doc(db, 'personalGoals', goalId));
    } else {
      // Fallback to localStorage
      const goals = JSON.parse(localStorage.getItem('personalGoals') || '[]');
      const filteredGoals = goals.filter((goal: Goal) => goal.id !== goalId);
      localStorage.setItem('personalGoals', JSON.stringify(filteredGoals));
    }
  } catch (error) {
    console.error('Error deleting goal:', error);
    // Fallback to localStorage on error
    const goals = JSON.parse(localStorage.getItem('personalGoals') || '[]');
    const filteredGoals = goals.filter((goal: Goal) => goal.id !== goalId);
    localStorage.setItem('personalGoals', JSON.stringify(filteredGoals));
  }
};

// Habits Functions
export const addHabit = async (habitData: Omit<Habit, 'id' | 'createdAt' | 'updatedAt'>) => {
  try {
    const now = new Date().toISOString();
    const cleanedData = {
      ...habitData,
      title: habitData.title || '',
      description: habitData.description || '',
      category: habitData.category || 'health',
      frequency: habitData.frequency || 'daily',
      targetDays: habitData.targetDays || 7,
      currentStreak: habitData.currentStreak || 0,
      longestStreak: habitData.longestStreak || 0,
      completedDates: habitData.completedDates || [],
      isActive: habitData.isActive !== undefined ? habitData.isActive : true,
      createdAt: now,
      updatedAt: now
    };

    if (db) {
      const docRef = await addDoc(collection(db, 'personalHabits'), cleanedData);
      return docRef.id;
    } else {
      // Fallback to localStorage
      const habits = JSON.parse(localStorage.getItem('personalHabits') || '[]');
      const newHabit = { ...cleanedData, id: Date.now().toString() };
      habits.push(newHabit);
      localStorage.setItem('personalHabits', JSON.stringify(habits));
      return newHabit.id;
    }
  } catch (error) {
    console.error('Error adding habit:', error);
    // Fallback to localStorage on error
    const habits = JSON.parse(localStorage.getItem('personalHabits') || '[]');
    const now = new Date().toISOString();
    const newHabit = { 
      ...habitData, 
      id: Date.now().toString(),
      createdAt: now,
      updatedAt: now
    };
    habits.push(newHabit);
    localStorage.setItem('personalHabits', JSON.stringify(habits));
    return newHabit.id;
  }
};

export const getHabits = async (): Promise<Habit[]> => {
  try {
    if (db) {
      const q = query(collection(db, 'personalHabits'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Habit[];
    } else {
      // Fallback to localStorage
      return JSON.parse(localStorage.getItem('personalHabits') || '[]');
    }
  } catch (error) {
    console.error('Error getting habits:', error);
    // Fallback to localStorage on error
    return JSON.parse(localStorage.getItem('personalHabits') || '[]');
  }
};

export const updateHabit = async (habitId: string, updates: Partial<Habit>) => {
  try {
    const updatedData = {
      ...updates,
      updatedAt: new Date().toISOString()
    };

    if (db) {
      const habitRef = doc(db, 'personalHabits', habitId);
      await updateDoc(habitRef, updatedData);
    } else {
      // Fallback to localStorage
      const habits = JSON.parse(localStorage.getItem('personalHabits') || '[]');
      const index = habits.findIndex((habit: Habit) => habit.id === habitId);
      if (index !== -1) {
        habits[index] = { ...habits[index], ...updatedData };
        localStorage.setItem('personalHabits', JSON.stringify(habits));
      }
    }
  } catch (error) {
    console.error('Error updating habit:', error);
    // Fallback to localStorage on error
    const habits = JSON.parse(localStorage.getItem('personalHabits') || '[]');
    const index = habits.findIndex((habit: Habit) => habit.id === habitId);
    if (index !== -1) {
      habits[index] = { ...habits[index], ...updates, updatedAt: new Date().toISOString() };
      localStorage.setItem('personalHabits', JSON.stringify(habits));
    }
  }
};

export const deleteHabit = async (habitId: string) => {
  try {
    if (db) {
      await deleteDoc(doc(db, 'personalHabits', habitId));
    } else {
      // Fallback to localStorage
      const habits = JSON.parse(localStorage.getItem('personalHabits') || '[]');
      const filteredHabits = habits.filter((habit: Habit) => habit.id !== habitId);
      localStorage.setItem('personalHabits', JSON.stringify(filteredHabits));
    }
  } catch (error) {
    console.error('Error deleting habit:', error);
    // Fallback to localStorage on error
    const habits = JSON.parse(localStorage.getItem('personalHabits') || '[]');
    const filteredHabits = habits.filter((habit: Habit) => habit.id !== habitId);
    localStorage.setItem('personalHabits', JSON.stringify(filteredHabits));
  }
};

export const markHabitComplete = async (habitId: string, date: string) => {
  try {
    // First get the current habit data
    const habits = await getHabits();
    const habit = habits.find(h => h.id === habitId);
    
    if (!habit) {
      throw new Error('Habit not found');
    }

    // Check if already completed for this date
    if (habit.completedDates.includes(date)) {
      return; // Already completed
    }

    // Add the completion date
    const updatedCompletedDates = [...habit.completedDates, date].sort();
    
    // Calculate new streak
    let currentStreak = 0;
    const today = new Date();
    const sortedDates = updatedCompletedDates.map(d => new Date(d)).sort((a, b) => b.getTime() - a.getTime());
    
    // Calculate streak from most recent date backwards
    for (let i = 0; i < sortedDates.length; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      checkDate.setHours(0, 0, 0, 0);
      
      const completedDate = new Date(sortedDates[i]);
      completedDate.setHours(0, 0, 0, 0);
      
      if (completedDate.getTime() === checkDate.getTime()) {
        currentStreak++;
      } else {
        break;
      }
    }

    // Update longest streak if needed
    const longestStreak = Math.max(habit.longestStreak, currentStreak);

    // Update the habit
    await updateHabit(habitId, {
      completedDates: updatedCompletedDates,
      currentStreak,
      longestStreak
    });

  } catch (error) {
    console.error('Error marking habit complete:', error);
    throw error;
  }
};

// Analytics Functions
export const getGoalStats = async () => {
  try {
    const goals = await getGoals();
    return {
      total: goals.length,
      completed: goals.filter(g => g.status === 'completed').length,
      inProgress: goals.filter(g => g.status === 'in-progress').length,
      notStarted: goals.filter(g => g.status === 'not-started').length,
      onHold: goals.filter(g => g.status === 'on-hold').length
    };
  } catch (error) {
    console.error('Error getting goal stats:', error);
    return { total: 0, completed: 0, inProgress: 0, notStarted: 0, onHold: 0 };
  }
};

export const getHabitStats = async () => {
  try {
    const habits = await getHabits();
    const today = new Date().toISOString().split('T')[0];
    
    return {
      total: habits.length,
      active: habits.filter(h => h.isActive).length,
      completedToday: habits.filter(h => h.completedDates.includes(today)).length,
      totalStreaks: habits.reduce((sum, h) => sum + h.currentStreak, 0)
    };
  } catch (error) {
    console.error('Error getting habit stats:', error);
    return { total: 0, active: 0, completedToday: 0, totalStreaks: 0 };
  }
};
