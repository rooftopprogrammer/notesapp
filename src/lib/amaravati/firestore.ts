// lib/amaravati/firestore.ts
// Firestore utilities for Amaravati place tracking with type-safe converters

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  QueryDocumentSnapshot,
  FirestoreDataConverter,
} from 'firebase/firestore';
import { db, isFirebaseAvailable } from '../firebase';
import { Place, Visit, Source } from '../types/amaravati';
import { uuid, todayIso } from './utils';

// Helper function to check Firebase availability
function ensureFirebaseAvailable() {
  if (!isFirebaseAvailable()) {
    throw new Error('Firebase is not properly configured. Please check your environment variables.');
  }
}

// Firestore converters for type safety
const placeConverter: FirestoreDataConverter<Place> = {
  toFirestore: (place: Place) => ({
    name: place.name,
    createdAt: place.createdAt,
    updatedAt: place.updatedAt,
    tags: place.tags || [],
    status: place.status,
    visitCount: place.visitCount,
    sources: place.sources,
  }),
  fromFirestore: (snapshot: QueryDocumentSnapshot) => {
    const data = snapshot.data();
    return {
      id: snapshot.id,
      name: data.name,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      tags: data.tags || [],
      status: data.status,
      visitCount: data.visitCount || 0,
      sources: data.sources || [],
    } as Place;
  },
};

const visitConverter: FirestoreDataConverter<Visit> = {
  toFirestore: (visit: Visit) => ({
    date: visit.date,
    createdAt: visit.createdAt,
    updatedAt: visit.updatedAt,
    order: visit.order,
    items: visit.items,
  }),
  fromFirestore: (snapshot: QueryDocumentSnapshot) => {
    const data = snapshot.data();
    return {
      id: snapshot.id,
      date: data.date,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      order: data.order || [],
      items: data.items || {},
    } as Visit;
  },
};

// Places CRUD operations
export async function createPlace(data: Omit<Place, 'id' | 'createdAt' | 'updatedAt' | 'visitCount'>): Promise<Place> {
  ensureFirebaseAvailable();
  
  const now = Date.now();
  const placeId = doc(collection(db, 'places')).id;
  
  const place: Place = {
    id: placeId,
    createdAt: now,
    updatedAt: now,
    visitCount: 0,
    ...data,
  };

  await setDoc(doc(db, 'places', placeId).withConverter(placeConverter), place);
  return place;
}

export async function getPlace(id: string): Promise<Place | null> {
  const docRef = doc(db, 'places', id).withConverter(placeConverter);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? docSnap.data() : null;
}

export async function getAllPlaces(statusFilter?: Place['status']): Promise<Place[]> {
  ensureFirebaseAvailable();
  
  const placesRef = collection(db, 'places').withConverter(placeConverter);
  
  let q = query(placesRef, orderBy('updatedAt', 'desc'));
  
  if (statusFilter) {
    q = query(placesRef, where('status', '==', statusFilter), orderBy('updatedAt', 'desc'));
  }

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data());
}

export async function updatePlace(id: string, updates: Partial<Omit<Place, 'id' | 'createdAt'>>): Promise<void> {
  const docRef = doc(db, 'places', id);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: Date.now(),
  });
}

export async function deletePlace(id: string): Promise<void> {
  await deleteDoc(doc(db, 'places', id));
}

export async function addSourceToPlace(placeId: string, sourceData: Omit<Source, 'id'>): Promise<void> {
  const place = await getPlace(placeId);
  if (!place) throw new Error('Place not found');

  const newSource: Source = {
    id: uuid(),
    ...sourceData,
  };

  const updatedSources = [...place.sources, newSource];
  await updatePlace(placeId, { sources: updatedSources });
}

export async function updateSourceInPlace(placeId: string, sourceId: string, updates: Partial<Omit<Source, 'id'>>): Promise<void> {
  const place = await getPlace(placeId);
  if (!place) throw new Error('Place not found');

  const updatedSources = place.sources.map(source =>
    source.id === sourceId ? { ...source, ...updates } : source
  );

  await updatePlace(placeId, { sources: updatedSources });
}

export async function removeSourceFromPlace(placeId: string, sourceId: string): Promise<void> {
  const place = await getPlace(placeId);
  if (!place) throw new Error('Place not found');

  const updatedSources = place.sources.filter(source => source.id !== sourceId);
  await updatePlace(placeId, { sources: updatedSources });
}

// Visits CRUD operations
export async function getTodayVisit(date?: string): Promise<Visit | null> {
  const targetDate = date || todayIso();
  const visitsRef = collection(db, 'visits').withConverter(visitConverter);
  const q = query(visitsRef, where('date', '==', targetDate));
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.empty ? null : querySnapshot.docs[0].data();
}

export async function createOrUpdateTodayVisit(data: Partial<Omit<Visit, 'id' | 'date' | 'createdAt'>>): Promise<Visit> {
  const today = todayIso();
  const existingVisit = await getTodayVisit();
  
  if (existingVisit) {
    const updatedVisit: Visit = {
      ...existingVisit,
      ...data,
      updatedAt: Date.now(),
    };
    
    await setDoc(doc(db, 'visits', existingVisit.id).withConverter(visitConverter), updatedVisit);
    return updatedVisit;
  } else {
    const now = Date.now();
    const visitId = doc(collection(db, 'visits')).id;
    
    const visit: Visit = {
      id: visitId,
      date: today,
      createdAt: now,
      updatedAt: now,
      order: [],
      items: {},
      ...data,
    };

    await setDoc(doc(db, 'visits', visitId).withConverter(visitConverter), visit);
    return visit;
  }
}

export async function getVisitsByDateRange(startDate: string, endDate: string): Promise<Visit[]> {
  const visitsRef = collection(db, 'visits').withConverter(visitConverter);
  const q = query(
    visitsRef,
    where('date', '>=', startDate),
    where('date', '<=', endDate),
    orderBy('date', 'desc')
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data());
}

export async function updateVisitCoverage(placeId: string, covered: boolean): Promise<void> {
  const visit = await getTodayVisit();
  if (!visit) {
    await createOrUpdateTodayVisit({
      items: {
        [placeId]: {
          covered,
          updatedAt: Date.now(),
        },
      },
    });
    return;
  }

  const updatedItems = {
    ...visit.items,
    [placeId]: {
      ...visit.items[placeId],
      covered,
      updatedAt: Date.now(),
    },
  };

  await createOrUpdateTodayVisit({ items: updatedItems });

  // Update place visit count if marking as covered
  if (covered) {
    const place = await getPlace(placeId);
    if (place) {
      await updatePlace(placeId, { visitCount: place.visitCount + 1 });
    }
  }
}

export async function addObservationToVisit(placeId: string, observation: string): Promise<void> {
  const visit = await getTodayVisit();
  if (!visit) {
    await createOrUpdateTodayVisit({
      items: {
        [placeId]: {
          covered: false,
          observation,
          updatedAt: Date.now(),
        },
      },
    });
    return;
  }

  const updatedItems = {
    ...visit.items,
    [placeId]: {
      ...visit.items[placeId],
      observation,
      updatedAt: Date.now(),
    },
  };

  await createOrUpdateTodayVisit({ items: updatedItems });
}

export async function addMediaToVisit(placeId: string, photos?: string[], videos?: string[]): Promise<void> {
  const visit = await getTodayVisit();
  if (!visit) {
    await createOrUpdateTodayVisit({
      items: {
        [placeId]: {
          covered: false,
          photos: photos || [],
          videos: videos || [],
          updatedAt: Date.now(),
        },
      },
    });
    return;
  }

  const currentItem = visit.items[placeId] || { covered: false, updatedAt: Date.now() };
  const updatedItems = {
    ...visit.items,
    [placeId]: {
      ...currentItem,
      photos: photos ? [...(currentItem.photos || []), ...photos] : currentItem.photos,
      videos: videos ? [...(currentItem.videos || []), ...videos] : currentItem.videos,
      updatedAt: Date.now(),
    },
  };

  await createOrUpdateTodayVisit({ items: updatedItems });
}

// Additional utility functions for plan page

export async function createOrUpdateVisit(visit: Visit): Promise<Visit> {
  await setDoc(doc(db, 'visits', visit.id).withConverter(visitConverter), visit);
  return visit;
}

export async function addPlaceToVisit(date: string, placeId: string): Promise<Visit> {
  const existingVisit = await getTodayVisit(date);
  
  if (existingVisit) {
    const updatedOrder = [...existingVisit.order];
    if (!updatedOrder.includes(placeId)) {
      updatedOrder.push(placeId);
    }
    
    const updatedVisit: Visit = {
      ...existingVisit,
      order: updatedOrder,
      updatedAt: Date.now(),
    };
    
    return await createOrUpdateVisit(updatedVisit);
  } else {
    const now = Date.now();
    const visitId = doc(collection(db, 'visits')).id;
    
    const visit: Visit = {
      id: visitId,
      date,
      createdAt: now,
      updatedAt: now,
      order: [placeId],
      items: {},
    };

    return await createOrUpdateVisit(visit);
  }
}

export async function removePlaceFromVisit(visitId: string, placeId: string): Promise<Visit> {
  const visitRef = doc(db, 'visits', visitId).withConverter(visitConverter);
  const visitSnap = await getDoc(visitRef);
  
  if (!visitSnap.exists()) {
    throw new Error('Visit not found');
  }
  
  const visit = visitSnap.data();
  const updatedOrder = visit.order.filter(id => id !== placeId);
  const updatedItems = { ...visit.items };
  delete updatedItems[placeId];
  
  const updatedVisit: Visit = {
    ...visit,
    order: updatedOrder,
    items: updatedItems,
    updatedAt: Date.now(),
  };
  
  return await createOrUpdateVisit(updatedVisit);
}

export async function reorderVisitPlaces(visitId: string, newOrder: string[]): Promise<Visit> {
  const visitRef = doc(db, 'visits', visitId).withConverter(visitConverter);
  const visitSnap = await getDoc(visitRef);
  
  if (!visitSnap.exists()) {
    throw new Error('Visit not found');
  }
  
  const visit = visitSnap.data();
  const updatedVisit: Visit = {
    ...visit,
    order: newOrder,
    updatedAt: Date.now(),
  };
  
  return await createOrUpdateVisit(updatedVisit);
}

export async function updateVisitItemCoverage(visitId: string, placeId: string, covered: boolean): Promise<Visit> {
  const visitRef = doc(db, 'visits', visitId).withConverter(visitConverter);
  const visitSnap = await getDoc(visitRef);
  
  if (!visitSnap.exists()) {
    throw new Error('Visit not found');
  }
  
  const visit = visitSnap.data();
  const currentItem = visit.items[placeId] || { covered: false, updatedAt: Date.now() };
  
  const updatedVisit: Visit = {
    ...visit,
    items: {
      ...visit.items,
      [placeId]: {
        ...currentItem,
        covered,
        updatedAt: Date.now(),
      },
    },
    updatedAt: Date.now(),
  };
  
  const result = await createOrUpdateVisit(updatedVisit);
  
  // Update place visit count if marking as covered
  if (covered) {
    const place = await getPlace(placeId);
    if (place) {
      await updatePlace(placeId, { visitCount: place.visitCount + 1 });
    }
  }
  
  return result;
}

export async function updateVisitItemObservation(visitId: string, placeId: string, observation: string): Promise<Visit> {
  const visitRef = doc(db, 'visits', visitId).withConverter(visitConverter);
  const visitSnap = await getDoc(visitRef);
  
  if (!visitSnap.exists()) {
    throw new Error('Visit not found');
  }
  
  const visit = visitSnap.data();
  const currentItem = visit.items[placeId] || { covered: false, updatedAt: Date.now() };
  
  const updatedVisit: Visit = {
    ...visit,
    items: {
      ...visit.items,
      [placeId]: {
        ...currentItem,
        observation,
        updatedAt: Date.now(),
      },
    },
    updatedAt: Date.now(),
  };
  
  return await createOrUpdateVisit(updatedVisit);
}
