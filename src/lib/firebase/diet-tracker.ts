// Firebase Firestore schema and operations for Diet Tracker
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  FamilyMember, 
  DailyDietPlan, 
  ConsumptionEntry, 
  DailyFeedback, 
  GroceryPlan,
  GroceryItem,
  ApiResponse
} from '../types/diet-tracker';

// Collection names
export const COLLECTIONS = {
  FAMILY_MEMBERS: 'familyMembers',
  DAILY_DIET_PLANS: 'dailyDietPlans',
  CONSUMPTION_ENTRIES: 'consumptionEntries',
  DAILY_FEEDBACK: 'dailyFeedback',
  GROCERY_PLANS: 'groceryPlans',
  GROCERY_ITEMS: 'groceryItems'
} as const;

// Family Members Operations
export const familyMemberService = {
  async getAll(): Promise<ApiResponse<FamilyMember[]>> {
    try {
      const querySnapshot = await getDocs(
        query(collection(db, COLLECTIONS.FAMILY_MEMBERS), orderBy('name'))
      );
      
      const members = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      } as FamilyMember));
      
      return { success: true, data: members };
    } catch (error) {
      return { 
        success: false, 
        error: { 
          code: 'FETCH_FAILED', 
          message: 'Failed to fetch family members',
          details: { error }
        } 
      };
    }
  },

  async getById(id: string): Promise<ApiResponse<FamilyMember>> {
    try {
      const docSnap = await getDoc(doc(db, COLLECTIONS.FAMILY_MEMBERS, id));
      
      if (!docSnap.exists()) {
        return { 
          success: false, 
          error: { 
            code: 'NOT_FOUND', 
            message: 'Family member not found' 
          } 
        };
      }
      
      const member = {
        id: docSnap.id,
        ...docSnap.data(),
        createdAt: docSnap.data().createdAt?.toDate(),
        updatedAt: docSnap.data().updatedAt?.toDate(),
      } as FamilyMember;
      
      return { success: true, data: member };
    } catch (error) {
      return { 
        success: false, 
        error: { 
          code: 'FETCH_FAILED', 
          message: 'Failed to fetch family member',
          details: { error }
        } 
      };
    }
  },

  async create(member: Omit<FamilyMember, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<FamilyMember>> {
    try {
      const now = Timestamp.now();
      const docRef = await addDoc(collection(db, COLLECTIONS.FAMILY_MEMBERS), {
        ...member,
        createdAt: now,
        updatedAt: now
      });
      
      const newMember = {
        id: docRef.id,
        ...member,
        createdAt: now.toDate(),
        updatedAt: now.toDate()
      };
      
      return { success: true, data: newMember };
    } catch (error) {
      return { 
        success: false, 
        error: { 
          code: 'CREATE_FAILED', 
          message: 'Failed to create family member',
          details: { error }
        } 
      };
    }
  },

  async update(id: string, updates: Partial<FamilyMember>): Promise<ApiResponse<FamilyMember>> {
    try {
      const docRef = doc(db, COLLECTIONS.FAMILY_MEMBERS, id);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: Timestamp.now()
      });
      
      const result = await this.getById(id);
      return result;
    } catch (error) {
      return { 
        success: false, 
        error: { 
          code: 'UPDATE_FAILED', 
          message: 'Failed to update family member',
          details: { error }
        } 
      };
    }
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      await deleteDoc(doc(db, COLLECTIONS.FAMILY_MEMBERS, id));
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: { 
          code: 'DELETE_FAILED', 
          message: 'Failed to delete family member',
          details: { error }
        } 
      };
    }
  },

  // Batch creation with smart merging for PDF extraction
  async createOrUpdateFromPDF(extractedMembers: Partial<FamilyMember>[]): Promise<ApiResponse<{
    created: FamilyMember[];
    updated: FamilyMember[];
    skipped: { member: Partial<FamilyMember>; reason: string }[];
  }>> {
    try {
      const results = {
        created: [] as FamilyMember[],
        updated: [] as FamilyMember[],
        skipped: [] as { member: Partial<FamilyMember>; reason: string }[]
      };

      // Get existing family members for comparison
      const existingResponse = await this.getAll();
      if (!existingResponse.success) {
        return {
          success: false,
          error: {
            code: 'FETCH_FAILED',
            message: 'Failed to fetch existing family members'
          }
        };
      }

      const existingMembers = existingResponse.data || [];

      for (const extractedMember of extractedMembers) {
        // Skip if missing required fields
        if (!extractedMember.name || !extractedMember.role) {
          results.skipped.push({
            member: extractedMember,
            reason: 'Missing required fields (name or role)'
          });
          continue;
        }

        // Check if member already exists by role (primary matching criteria)
        const existingMember = existingMembers.find(m => m.role === extractedMember.role);

        if (existingMember) {
          // Smart merge: only update if extracted data provides new information
          const shouldUpdate = this.shouldUpdateExistingMember(existingMember, extractedMember);
          
          if (shouldUpdate.update) {
            const updateResponse = await this.update(existingMember.id, shouldUpdate.updates);
            if (updateResponse.success && updateResponse.data) {
              results.updated.push(updateResponse.data);
            } else {
              results.skipped.push({
                member: extractedMember,
                reason: 'Failed to update existing member'
              });
            }
          } else {
            results.skipped.push({
              member: extractedMember,
              reason: 'No new information to update'
            });
          }
        } else {
          // Create new member with complete data
          const completeData = this.completeExtractedMemberData(extractedMember);
          const createResponse = await this.create(completeData);
          
          if (createResponse.success && createResponse.data) {
            results.created.push(createResponse.data);
          } else {
            results.skipped.push({
              member: extractedMember,
              reason: 'Failed to create new member'
            });
          }
        }
      }

      return { success: true, data: results };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'BATCH_OPERATION_FAILED',
          message: 'Failed to process family members from PDF',
          details: { error }
        }
      };
    }
  },

  // Helper function to determine if existing member should be updated
  shouldUpdateExistingMember(
    existing: FamilyMember, 
    extracted: Partial<FamilyMember>
  ): { update: boolean; updates: Partial<FamilyMember> } {
    const updates: Partial<FamilyMember> = {};
    let hasUpdates = false;

    // Update medical conditions if extracted data has more conditions
    if (extracted.medicalConditions && extracted.medicalConditions.length > 0) {
      const newConditions = extracted.medicalConditions.filter(
        condition => !existing.medicalConditions.includes(condition)
      );
      if (newConditions.length > 0) {
        updates.medicalConditions = [...existing.medicalConditions, ...newConditions];
        hasUpdates = true;
      }
    }

    // Update dietary restrictions if extracted data has more restrictions
    if (extracted.dietaryRestrictions && extracted.dietaryRestrictions.length > 0) {
      const newRestrictions = extracted.dietaryRestrictions.filter(
        restriction => !existing.dietaryRestrictions.includes(restriction)
      );
      if (newRestrictions.length > 0) {
        updates.dietaryRestrictions = [...existing.dietaryRestrictions, ...newRestrictions];
        hasUpdates = true;
      }
    }

    // Update oil limit if extracted value is more specific/different
    if (extracted.oilLimit && extracted.oilLimit !== existing.oilLimit) {
      updates.oilLimit = extracted.oilLimit;
      hasUpdates = true;
    }

    // Update portion multiplier if extracted value is more specific
    if (extracted.portionMultiplier && 
        Math.abs(extracted.portionMultiplier - existing.portionMultiplier) > 0.05) {
      updates.portionMultiplier = extracted.portionMultiplier;
      hasUpdates = true;
    }

    // Update preferences if extracted data has new preferences
    if (extracted.preferences) {
      const updatedPreferences = { ...existing.preferences };
      let preferencesChanged = false;

      if (extracted.preferences.favoriteFruits) {
        const newFruits = extracted.preferences.favoriteFruits.filter(
          fruit => !existing.preferences.favoriteFruits.includes(fruit)
        );
        if (newFruits.length > 0) {
          updatedPreferences.favoriteFruits = [...existing.preferences.favoriteFruits, ...newFruits];
          preferencesChanged = true;
        }
      }

      if (preferencesChanged) {
        updates.preferences = updatedPreferences;
        hasUpdates = true;
      }
    }

    return { update: hasUpdates, updates };
  },

  // Helper function to complete extracted member data with defaults
  completeExtractedMemberData(extracted: Partial<FamilyMember>): Omit<FamilyMember, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      name: extracted.name || 'Unknown',
      role: extracted.role || 'ravi',
      age: extracted.age || 25,
      medicalConditions: extracted.medicalConditions || [],
      dietaryRestrictions: extracted.dietaryRestrictions || [],
      portionMultiplier: extracted.portionMultiplier || 1.0,
      waterIntakeTarget: extracted.waterIntakeTarget || 3.0,
      oilLimit: extracted.oilLimit || 4,
      preferences: {
        favoriteFruits: extracted.preferences?.favoriteFruits || [],
        dislikedFoods: extracted.preferences?.dislikedFoods || [],
        allergies: extracted.preferences?.allergies || []
      }
    };
  }
};

// Daily Diet Plans Operations
export const dailyDietPlanService = {
  async getByDateRange(startDate: string, endDate: string): Promise<ApiResponse<DailyDietPlan[]>> {
    try {
      console.log(`Fetching plans for date range: ${startDate} to ${endDate}`);
      
      // Use a simpler query without orderBy to avoid complex composite index requirements
      const querySnapshot = await getDocs(
        query(
          collection(db, COLLECTIONS.DAILY_DIET_PLANS),
          where('date', '>=', startDate),
          where('date', '<=', endDate)
        )
      );
      
      console.log(`Retrieved ${querySnapshot.docs.length} plans from Firestore`);
      
      const plans = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
        } as DailyDietPlan;
      }).sort((a, b) => b.date.localeCompare(a.date)); // Sort in memory instead
      
      console.log('Retrieved and sorted plans:', plans);
      return { success: true, data: plans };
    } catch (error) {
      console.error('Error fetching diet plans with optimized query:', error);
      
      // Fallback to getting all plans and filtering in memory
      try {
        console.log('Falling back to memory filtering...');
        const allPlansSnapshot = await getDocs(collection(db, COLLECTIONS.DAILY_DIET_PLANS));
        
        const filteredPlans = allPlansSnapshot.docs
          .map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              createdAt: data.createdAt?.toDate(),
              updatedAt: data.updatedAt?.toDate(),
            } as DailyDietPlan;
          })
          .filter(plan => plan.date >= startDate && plan.date <= endDate)
          .sort((a, b) => b.date.localeCompare(a.date));
        
        console.log(`Filtered ${filteredPlans.length} plans in memory`);
        return { success: true, data: filteredPlans };
      } catch (fallbackError) {
        console.error('Fallback query also failed:', fallbackError);
        return { 
          success: false, 
          error: { 
            code: 'FETCH_FAILED', 
            message: 'Failed to fetch diet plans',
            details: { error: fallbackError }
          } 
        };
      }
    }
  },

  async getByDate(date: string): Promise<ApiResponse<DailyDietPlan | null>> {
    try {
      const querySnapshot = await getDocs(
        query(
          collection(db, COLLECTIONS.DAILY_DIET_PLANS),
          where('date', '==', date),
          limit(1)
        )
      );
      
      if (querySnapshot.empty) {
        return { success: true, data: null };
      }
      
      const doc = querySnapshot.docs[0];
      const plan = {
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      } as DailyDietPlan;
      
      return { success: true, data: plan };
    } catch (error) {
      return { 
        success: false, 
        error: { 
          code: 'FETCH_FAILED', 
          message: 'Failed to fetch diet plan',
          details: { error }
        } 
      };
    }
  },

  async create(plan: Omit<DailyDietPlan, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<DailyDietPlan>> {
    try {
      const now = Timestamp.now();
      const docRef = await addDoc(collection(db, COLLECTIONS.DAILY_DIET_PLANS), {
        ...plan,
        createdAt: now,
        updatedAt: now
      });
      
      const newPlan = {
        id: docRef.id,
        ...plan,
        createdAt: now.toDate(),
        updatedAt: now.toDate()
      };
      
      return { success: true, data: newPlan };
    } catch (error) {
      return { 
        success: false, 
        error: { 
          code: 'CREATE_FAILED', 
          message: 'Failed to create diet plan',
          details: { error }
        } 
      };
    }
  },

  async update(id: string, updates: Partial<DailyDietPlan>): Promise<ApiResponse<DailyDietPlan>> {
    try {
      const docRef = doc(db, COLLECTIONS.DAILY_DIET_PLANS, id);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: Timestamp.now()
      });
      
      const docSnap = await getDoc(docRef);
      const plan = {
        id: docSnap.id,
        ...docSnap.data(),
        createdAt: docSnap.data()?.createdAt?.toDate(),
        updatedAt: docSnap.data()?.updatedAt?.toDate(),
      } as DailyDietPlan;
      
      return { success: true, data: plan };
    } catch (error) {
      return { 
        success: false, 
        error: { 
          code: 'UPDATE_FAILED', 
          message: 'Failed to update diet plan',
          details: { error }
        } 
      };
    }
  }
};

// Consumption Entries Operations
export const consumptionService = {
  async getByDate(date: string): Promise<ApiResponse<ConsumptionEntry[]>> {
    try {
      const querySnapshot = await getDocs(
        query(
          collection(db, COLLECTIONS.CONSUMPTION_ENTRIES),
          where('date', '==', date),
          orderBy('consumedAt', 'desc')
        )
      );
      
      const entries = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        consumedAt: doc.data().consumedAt?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
      } as ConsumptionEntry));
      
      return { success: true, data: entries };
    } catch (error) {
      console.error('Error fetching consumption entries by date:', error);
      return { 
        success: false, 
        error: { 
          code: 'FETCH_FAILED', 
          message: 'Failed to fetch consumption entries by date' 
        } 
      };
    }
  },

  async getByDateAndMember(date: string, memberId: string): Promise<ApiResponse<ConsumptionEntry[]>> {
    try {
      const querySnapshot = await getDocs(
        query(
          collection(db, COLLECTIONS.CONSUMPTION_ENTRIES),
          where('date', '==', date),
          where('familyMemberId', '==', memberId),
          orderBy('consumedAt', 'desc')
        )
      );
      
      const entries = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        consumedAt: doc.data().consumedAt?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
      } as ConsumptionEntry));
      
      return { success: true, data: entries };
    } catch (error) {
      return { 
        success: false, 
        error: { 
          code: 'FETCH_FAILED', 
          message: 'Failed to fetch consumption entries',
          details: { error }
        } 
      };
    }
  },

  async create(entry: Omit<ConsumptionEntry, 'id' | 'createdAt'>): Promise<ApiResponse<ConsumptionEntry>> {
    try {
      const now = Timestamp.now();
      const docRef = await addDoc(collection(db, COLLECTIONS.CONSUMPTION_ENTRIES), {
        ...entry,
        consumedAt: entry.consumedAt ? Timestamp.fromDate(entry.consumedAt) : now,
        createdAt: now
      });
      
      const newEntry = {
        id: docRef.id,
        ...entry,
        createdAt: now.toDate()
      };
      
      return { success: true, data: newEntry };
    } catch (error) {
      return { 
        success: false, 
        error: { 
          code: 'CREATE_FAILED', 
          message: 'Failed to create consumption entry',
          details: { error }
        } 
      };
    }
  },

  async update(id: string, entry: Omit<ConsumptionEntry, 'id' | 'createdAt'>): Promise<ApiResponse<ConsumptionEntry>> {
    try {
      const docRef = doc(db, COLLECTIONS.CONSUMPTION_ENTRIES, id);
      
      // Get the existing document to preserve createdAt
      const existingDoc = await getDoc(docRef);
      if (!existingDoc.exists()) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Consumption entry not found'
          }
        };
      }
      
      const updateData = {
        ...entry,
        consumedAt: entry.consumedAt ? Timestamp.fromDate(entry.consumedAt) : Timestamp.now()
      };
      
      await updateDoc(docRef, updateData);
      
      const updatedEntry = {
        id,
        ...entry,
        createdAt: existingDoc.data().createdAt?.toDate() || new Date()
      };
      
      return { success: true, data: updatedEntry };
    } catch (error) {
      return { 
        success: false, 
        error: { 
          code: 'UPDATE_FAILED', 
          message: 'Failed to update consumption entry',
          details: { error }
        } 
      };
    }
  }
};

// Daily Feedback Operations
export const feedbackService = {
  async getByDate(date: string): Promise<ApiResponse<DailyFeedback | null>> {
    try {
      const querySnapshot = await getDocs(
        query(
          collection(db, COLLECTIONS.DAILY_FEEDBACK),
          where('date', '==', date),
          limit(1)
        )
      );
      
      if (querySnapshot.empty) {
        return { success: true, data: null };
      }
      
      const doc = querySnapshot.docs[0];
      const feedback = {
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      } as DailyFeedback;
      
      return { success: true, data: feedback };
    } catch (error) {
      return { 
        success: false, 
        error: { 
          code: 'FETCH_FAILED', 
          message: 'Failed to fetch feedback',
          details: { error }
        } 
      };
    }
  },

  async getByDateAndMember(date: string, memberId: string): Promise<ApiResponse<DailyFeedback | null>> {
    try {
      const querySnapshot = await getDocs(
        query(
          collection(db, COLLECTIONS.DAILY_FEEDBACK),
          where('date', '==', date),
          where('familyMemberId', '==', memberId),
          limit(1)
        )
      );
      
      if (querySnapshot.empty) {
        return { success: true, data: null };
      }
      
      const doc = querySnapshot.docs[0];
      const feedback = {
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
      } as DailyFeedback;
      
      return { success: true, data: feedback };
    } catch (error) {
      return { 
        success: false, 
        error: { 
          code: 'FETCH_FAILED', 
          message: 'Failed to fetch feedback',
          details: { error }
        } 
      };
    }
  },

  async createOrUpdate(feedback: Omit<DailyFeedback, 'id' | 'createdAt'>): Promise<ApiResponse<DailyFeedback>> {
    try {
      // Check if feedback already exists for this date
      const existingQuery = query(
        collection(db, COLLECTIONS.DAILY_FEEDBACK),
        where('date', '==', feedback.date),
        limit(1)
      );
      
      const existingSnapshot = await getDocs(existingQuery);
      
      if (!existingSnapshot.empty) {
        // Update existing feedback
        const docRef = existingSnapshot.docs[0].ref;
        const now = Timestamp.now();
        await updateDoc(docRef, {
          ...feedback,
          updatedAt: now
        });
        
        const updatedDoc = await getDoc(docRef);
        const updatedFeedback = {
          id: updatedDoc.id,
          ...updatedDoc.data(),
          createdAt: updatedDoc.data()?.createdAt?.toDate(),
          updatedAt: now.toDate(),
        } as DailyFeedback;
        
        return { success: true, data: updatedFeedback };
      } else {
        // Create new feedback
        const now = Timestamp.now();
        const docRef = await addDoc(collection(db, COLLECTIONS.DAILY_FEEDBACK), {
          ...feedback,
          createdAt: now,
          updatedAt: now
        });
        
        const newFeedback = {
          id: docRef.id,
          ...feedback,
          createdAt: now.toDate(),
          updatedAt: now.toDate()
        } as DailyFeedback;
        
        return { success: true, data: newFeedback };
      }
    } catch (error) {
      return { 
        success: false, 
        error: { 
          code: 'CREATE_UPDATE_FAILED', 
          message: 'Failed to save feedback',
          details: { error }
        } 
      };
    }
  }
};

// Grocery Plans Operations
export const groceryPlanService = {
  async getActive(): Promise<ApiResponse<GroceryPlan[]>> {
    try {
      const querySnapshot = await getDocs(
        query(
          collection(db, COLLECTIONS.GROCERY_PLANS),
          where('status', 'in', ['draft', 'active', 'shopping']),
          orderBy('generatedAt', 'desc')
        )
      );
      
      const plans = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        generatedAt: doc.data().generatedAt?.toDate(),
        completedAt: doc.data().completedAt?.toDate(),
      } as GroceryPlan));
      
      return { success: true, data: plans };
    } catch (error) {
      return { 
        success: false, 
        error: { 
          code: 'FETCH_FAILED', 
          message: 'Failed to fetch grocery plans',
          details: { error }
        } 
      };
    }
  },

  async create(plan: Omit<GroceryPlan, 'id' | 'generatedAt'>): Promise<ApiResponse<GroceryPlan>> {
    try {
      const now = Timestamp.now();
      const docRef = await addDoc(collection(db, COLLECTIONS.GROCERY_PLANS), {
        ...plan,
        generatedAt: now
      });
      
      const newPlan = {
        id: docRef.id,
        ...plan,
        generatedAt: now.toDate()
      };
      
      return { success: true, data: newPlan };
    } catch (error) {
      return { 
        success: false, 
        error: { 
          code: 'CREATE_FAILED', 
          message: 'Failed to create grocery plan',
          details: { error }
        } 
      };
    }
  },

  async updateStatus(id: string, status: GroceryPlan['status']): Promise<ApiResponse<void>> {
    try {
      const docRef = doc(db, COLLECTIONS.GROCERY_PLANS, id);
      const updates: Record<string, unknown> = { status };
      
      if (status === 'completed') {
        updates.completedAt = Timestamp.now();
      }
      
      await updateDoc(docRef, updates);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: { 
          code: 'UPDATE_FAILED', 
          message: 'Failed to update grocery plan status',
          details: { error }
        } 
      };
    }
  }
};

// Bulk operations
export const bulkOperations = {
  async createMultipleConsumptionEntries(entries: Omit<ConsumptionEntry, 'id' | 'createdAt'>[]): Promise<ApiResponse<void>> {
    try {
      const batch = writeBatch(db);
      const now = Timestamp.now();
      
      entries.forEach(entry => {
        const docRef = doc(collection(db, COLLECTIONS.CONSUMPTION_ENTRIES));
        batch.set(docRef, {
          ...entry,
          consumedAt: entry.consumedAt ? Timestamp.fromDate(entry.consumedAt) : now,
          createdAt: now
        });
      });
      
      await batch.commit();
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: { 
          code: 'BULK_CREATE_FAILED', 
          message: 'Failed to create consumption entries',
          details: { error }
        } 
      };
    }
  },

  async updateMultipleGroceryItems(updates: { id: string; data: Partial<GroceryItem> }[]): Promise<ApiResponse<void>> {
    try {
      const batch = writeBatch(db);
      const now = Timestamp.now();
      
      updates.forEach(update => {
        const docRef = doc(db, COLLECTIONS.GROCERY_ITEMS, update.id);
        batch.update(docRef, {
          ...update.data,
          updatedAt: now
        });
      });
      
      await batch.commit();
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: { 
          code: 'BULK_UPDATE_FAILED', 
          message: 'Failed to update grocery items',
          details: { error }
        } 
      };
    }
  }
};