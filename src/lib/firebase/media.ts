import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  DocumentSnapshot
} from 'firebase/firestore';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  UploadTaskSnapshot
} from 'firebase/storage';
import { db, storage } from '../firebase';
import { MediaItem } from '@/lib/types/temple';

// Get user's temple plan media collection reference
const getPlanMediaRef = (uid: string, planId: string) => 
  collection(db, 'users', uid, 'templePlans', planId, 'media');

// Get specific media document reference
const getMediaRef = (uid: string, planId: string, mediaId: string) => 
  doc(db, 'users', uid, 'templePlans', planId, 'media', mediaId);

// Get storage reference for media files
const getStorageRef = (uid: string, planId: string, filename: string) => 
  ref(storage, `users/${uid}/templePlans/${planId}/media/${filename}`);

// Convert Firestore document to MediaItem
const convertToMediaItem = (doc: DocumentSnapshot): MediaItem | null => {
  if (!doc.exists()) return null;
  
  const data = doc.data();
  return {
    id: doc.id,
    createdAt: data.createdAt?.toMillis() || Date.now(),
    type: data.type,
    caption: data.caption,
    storagePath: data.storagePath,
    width: data.width,
    height: data.height,
    durationSec: data.durationSec,
  } as MediaItem;
};

// Upload progress callback type
export type UploadProgressCallback = (progress: number) => void;

// Upload media file with progress tracking
export const uploadMedia = async (
  uid: string,
  planId: string,
  file: File,
  caption?: string,
  onProgress?: UploadProgressCallback
): Promise<string> => {
  try {
    // Generate unique filename
    const timestamp = Date.now();
    const extension = file.name.split('.').pop();
    const filename = `${timestamp}_${Math.random().toString(36).substr(2, 9)}.${extension}`;
    
    // Upload to storage
    const storageRef = getStorageRef(uid, planId, filename);
    const uploadTask = uploadBytesResumable(storageRef, file);
    
    // Track progress
    if (onProgress) {
      uploadTask.on('state_changed', (snapshot: UploadTaskSnapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress(progress);
      });
    }
    
    // Wait for upload completion
    await uploadTask;
    
    // Get download URL (for reference, but we use storagePath for consistent access)
    await getDownloadURL(storageRef);
    
    // Determine media type and get metadata
    const type = file.type.startsWith('video/') ? 'video' : 'image';
    let width: number | undefined;
    let height: number | undefined;
    let durationSec: number | undefined;
    
    if (type === 'image') {
      // Get image dimensions
      const { width: w, height: h } = await getImageDimensions(file);
      width = w;
      height = h;
    } else if (type === 'video') {
      // Get video metadata
      const { width: w, height: h, duration } = await getVideoMetadata(file);
      width = w;
      height = h;
      durationSec = duration;
    }
    
    // Save metadata to Firestore
    const mediaRef = getPlanMediaRef(uid, planId);
    const docData: Omit<MediaItem, 'id'> = {
      createdAt: Date.now(),
      type,
      caption,
      storagePath: storageRef.fullPath,
      width,
      height,
      durationSec,
    };
    
    const docRef = await addDoc(mediaRef, {
      ...docData,
      createdAt: serverTimestamp(),
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error uploading media:', error);
    throw new Error('Failed to upload media');
  }
};

// List all media for a temple plan
export const listMedia = async (uid: string, planId: string): Promise<MediaItem[]> => {
  try {
    const mediaRef = getPlanMediaRef(uid, planId);
    const q = query(mediaRef, orderBy('createdAt', 'desc'));
    
    const snapshot = await getDocs(q);
    const media: MediaItem[] = [];
    
    snapshot.forEach(doc => {
      const mediaItem = convertToMediaItem(doc);
      if (mediaItem) {
        media.push(mediaItem);
      }
    });
    
    return media;
  } catch (error) {
    console.error('Error listing media:', error);
    throw new Error('Failed to list media');
  }
};

// Get a single media item
export const getMediaItem = async (
  uid: string, 
  planId: string, 
  mediaId: string
): Promise<MediaItem | null> => {
  try {
    const mediaRef = getMediaRef(uid, planId, mediaId);
    const doc = await getDoc(mediaRef);
    return convertToMediaItem(doc);
  } catch (error) {
    console.error('Error getting media item:', error);
    throw new Error('Failed to get media item');
  }
};

// Delete media item (both Firestore document and Storage file)
export const deleteMedia = async (
  uid: string, 
  planId: string, 
  mediaId: string
): Promise<void> => {
  try {
    // Get media item to find storage path
    const mediaItem = await getMediaItem(uid, planId, mediaId);
    if (!mediaItem) {
      throw new Error('Media item not found');
    }
    
    // Delete from storage
    const storageRef = ref(storage, mediaItem.storagePath);
    await deleteObject(storageRef);
    
    // Delete from Firestore
    const mediaRef = getMediaRef(uid, planId, mediaId);
    await deleteDoc(mediaRef);
  } catch (error) {
    console.error('Error deleting media:', error);
    throw new Error('Failed to delete media');
  }
};

// Get download URL for a media item
export const getMediaDownloadURL = async (storagePath: string): Promise<string> => {
  try {
    const storageRef = ref(storage, storagePath);
    return await getDownloadURL(storageRef);
  } catch (error) {
    console.error('Error getting download URL:', error);
    throw new Error('Failed to get download URL');
  }
};

// Helper function to get image dimensions
const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};

// Helper function to get video metadata
const getVideoMetadata = (file: File): Promise<{ width: number; height: number; duration: number }> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.onloadedmetadata = () => {
      resolve({
        width: video.videoWidth,
        height: video.videoHeight,
        duration: Math.round(video.duration)
      });
    };
    video.onerror = reject;
    video.src = URL.createObjectURL(file);
  });
};
