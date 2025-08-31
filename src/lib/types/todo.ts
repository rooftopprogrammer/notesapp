// lib/types/todo.ts
// Types for the todo and project management system

export interface Project {
  id: string;
  name: string;
  description?: string;
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Todo {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'inprogress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  projectId: string;
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TodoColumn {
  id: 'todo' | 'inprogress' | 'completed';
  title: string;
  color: string;
  count: number;
}
