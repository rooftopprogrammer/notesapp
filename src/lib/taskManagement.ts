// lib/taskManagement.ts
// Firestore utilities for task management

import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp,
  query,
  orderBy
} from 'firebase/firestore';
import { db, isFirebaseAvailable } from './firebase';

export interface Task {
  id: string;
  serialNo: number;
  type: string;
  category: string;
  status: 'pending' | 'in-progress' | 'completed' | 'on-hold';
  link: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

const COLLECTION_NAME = 'tasks';
const STORAGE_KEY = 'taskManagementData';

/**
 * Get all tasks - fallback to localStorage if Firebase not available
 */
export async function getTasks(): Promise<Task[]> {
  if (!isFirebaseAvailable()) {
    // Fallback to localStorage for development/offline
    const savedTasks = localStorage.getItem(STORAGE_KEY);
    if (savedTasks) {
      const parsedTasks = JSON.parse(savedTasks) as (Omit<Task, 'createdAt' | 'updatedAt'> & {
        createdAt: string;
        updatedAt: string;
      })[];
      return parsedTasks.map((task) => ({
        ...task,
        createdAt: new Date(task.createdAt),
        updatedAt: new Date(task.updatedAt)
      }));
    }
    return [];
  }

  try {
    const tasksRef = collection(db, COLLECTION_NAME);
    const q = query(tasksRef, orderBy('serialNo', 'asc'));
    const querySnapshot = await getDocs(q);
    
    const tasks: Task[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      tasks.push({
        id: doc.id,
        serialNo: data.serialNo,
        type: data.type,
        category: data.category,
        status: data.status,
        link: data.link || '',
        title: data.title,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      });
    });
    
    return tasks;
  } catch (error) {
    console.error('Error fetching tasks from Firestore:', error);
    // Fallback to localStorage on error
    return getTasksFromLocalStorage();
  }
}

/**
 * Add a new task
 */
export async function addTask(taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
  const newTask: Omit<Task, 'id'> = {
    ...taskData,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  if (!isFirebaseAvailable()) {
    // Fallback to localStorage
    const localTask: Task = {
      ...newTask,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
    };
    const tasks = await getTasks();
    const updatedTasks = [...tasks, localTask];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTasks));
    return localTask;
  }

  try {
    const tasksRef = collection(db, COLLECTION_NAME);
    const docRef = await addDoc(tasksRef, {
      ...newTask,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return {
      ...newTask,
      id: docRef.id
    };
  } catch (error) {
    console.error('Error adding task to Firestore:', error);
    throw error;
  }
}

/**
 * Update an existing task
 */
export async function updateTask(taskId: string, updates: Partial<Omit<Task, 'id' | 'createdAt'>>): Promise<void> {
  if (!isFirebaseAvailable()) {
    // Fallback to localStorage
    const tasks = await getTasks();
    const updatedTasks = tasks.map(task => 
      task.id === taskId 
        ? { ...task, ...updates, updatedAt: new Date() }
        : task
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTasks));
    return;
  }

  try {
    const taskRef = doc(db, COLLECTION_NAME, taskId);
    await updateDoc(taskRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating task in Firestore:', error);
    throw error;
  }
}

/**
 * Delete a task
 */
export async function deleteTask(taskId: string): Promise<void> {
  if (!isFirebaseAvailable()) {
    // Fallback to localStorage
    const tasks = await getTasks();
    const filteredTasks = tasks.filter(task => task.id !== taskId);
    // Reorder serial numbers
    const reorderedTasks = filteredTasks.map((task, index) => ({
      ...task,
      serialNo: index + 1
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reorderedTasks));
    return;
  }

  try {
    const taskRef = doc(db, COLLECTION_NAME, taskId);
    await deleteDoc(taskRef);
  } catch (error) {
    console.error('Error deleting task from Firestore:', error);
    throw error;
  }
}

/**
 * Reorder serial numbers after deletion (Firestore only)
 */
export async function reorderTasks(tasks: Task[]): Promise<void> {
  if (!isFirebaseAvailable()) {
    return; // Local storage handles this in deleteTask
  }

  try {
    const promises = tasks.map((task, index) => {
      const taskRef = doc(db, COLLECTION_NAME, task.id);
      return updateDoc(taskRef, {
        serialNo: index + 1,
        updatedAt: serverTimestamp()
      });
    });
    
    await Promise.all(promises);
  } catch (error) {
    console.error('Error reordering tasks in Firestore:', error);
    throw error;
  }
}

/**
 * Get next serial number
 */
export async function getNextSerialNo(): Promise<number> {
  const tasks = await getTasks();
  return tasks.length > 0 ? Math.max(...tasks.map(t => t.serialNo)) + 1 : 1;
}

/**
 * Helper function to get tasks from localStorage
 */
function getTasksFromLocalStorage(): Task[] {
  const savedTasks = localStorage.getItem(STORAGE_KEY);
  if (savedTasks) {
    const parsedTasks = JSON.parse(savedTasks) as (Omit<Task, 'createdAt' | 'updatedAt'> & {
      createdAt: string;
      updatedAt: string;
    })[];
    return parsedTasks.map((task) => ({
      ...task,
      createdAt: new Date(task.createdAt),
      updatedAt: new Date(task.updatedAt)
    }));
  }
  return [];
}
