// Firebase Migration Utility for Home Inventory
// Run this once to migrate localStorage data to Firestore

import { db } from '../../../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  itemType: string;
  brand?: string;
  model?: string;
  purchaseDate: string;
  purchasePrice?: number;
  warranty?: string;
  location: string;
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  serialNumber?: string;
  notes?: string;
  images: string[];
  createdAt: string;
  updatedAt?: string;
}

export async function migrateLocalStorageToFirestore(): Promise<{ success: boolean; message: string; migratedCount: number }> {
  try {
    const savedItems = localStorage.getItem('homeInventory');
    
    if (!savedItems) {
      return { success: true, message: 'No items found in localStorage to migrate', migratedCount: 0 };
    }

    const parsedItems = JSON.parse(savedItems);
    let migratedCount = 0;

    for (const item of parsedItems) {
      // Clean up the item data for Firestore
      const cleanItem = {
        name: item.name || 'Unknown Item',
        category: item.category || 'Other',
        itemType: item.itemType || '',
        brand: item.brand || '',
        model: item.model || '',
        purchaseDate: item.purchaseDate || new Date().toISOString().split('T')[0],
        purchasePrice: item.purchasePrice || null,
        warranty: item.warranty || '',
        location: item.location || 'Unknown',
        condition: item.condition || 'good',
        serialNumber: item.serialNumber || '',
        notes: item.notes || '',
        images: item.images || [],
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: item.updatedAt || null,
      };

      // Add to Firestore
      await addDoc(collection(db, 'homeInventory'), cleanItem);
      migratedCount++;
    }

    // Clear localStorage after successful migration
    localStorage.removeItem('homeInventory');
    
    return { 
      success: true, 
      message: `Successfully migrated ${migratedCount} items to Firestore and cleared localStorage`, 
      migratedCount 
    };
    
  } catch (error) {
    console.error('Migration error:', error);
    return { 
      success: false, 
      message: `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 
      migratedCount: 0 
    };
  }
}

export async function checkLocalStorageForMigration(): Promise<boolean> {
  try {
    const savedItems = localStorage.getItem('homeInventory');
    return savedItems !== null && savedItems.length > 0;
  } catch {
    return false;
  }
}