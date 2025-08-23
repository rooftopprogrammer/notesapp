// lib/amaravati/storage.ts
// Firebase Storage utilities for Amaravati media uploads

import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  uploadBytesResumable,
  UploadTaskSnapshot,
} from 'firebase/storage';
import { storage } from '../firebase';
import { uuid } from './utils';

export interface UploadProgress {
  progress: number;
  isComplete: boolean;
  downloadURL?: string;
  error?: string;
}

/**
 * Upload an image file to Firebase Storage
 */
export async function uploadImage(
  file: File,
  visitId: string,
  placeId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<string> {
  const fileName = `${uuid()}.${file.name.split('.').pop()}`;
  const storagePath = `visits/${visitId}/${placeId}/images/${fileName}`;
  const storageRef = ref(storage, storagePath);

  // Validate file type and size
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image');
  }
  
  if (file.size > 10 * 1024 * 1024) { // 10MB limit
    throw new Error('Image file size must be less than 10MB');
  }

  try {
    if (onProgress) {
      // Use resumable upload for progress tracking
      const uploadTask = uploadBytesResumable(storageRef, file);
      
      return new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot: UploadTaskSnapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            onProgress({
              progress,
              isComplete: false,
            });
          },
          (error) => {
            onProgress({
              progress: 0,
              isComplete: false,
              error: error.message,
            });
            reject(error);
          },
          async () => {
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              onProgress({
                progress: 100,
                isComplete: true,
                downloadURL,
              });
              resolve(downloadURL);
            } catch (error) {
              reject(error);
            }
          }
        );
      });
    } else {
      // Simple upload without progress
      const snapshot = await uploadBytes(storageRef, file);
      return await getDownloadURL(snapshot.ref);
    }
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
}

/**
 * Upload a video file to Firebase Storage
 */
export async function uploadVideo(
  file: File,
  visitId: string,
  placeId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<string> {
  const fileName = `${uuid()}.${file.name.split('.').pop()}`;
  const storagePath = `visits/${visitId}/${placeId}/videos/${fileName}`;
  const storageRef = ref(storage, storagePath);

  // Validate file type and size
  if (!file.type.startsWith('video/')) {
    throw new Error('File must be a video');
  }
  
  if (file.size > 100 * 1024 * 1024) { // 100MB limit
    throw new Error('Video file size must be less than 100MB');
  }

  try {
    if (onProgress) {
      // Use resumable upload for progress tracking
      const uploadTask = uploadBytesResumable(storageRef, file);
      
      return new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot: UploadTaskSnapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            onProgress({
              progress,
              isComplete: false,
            });
          },
          (error) => {
            onProgress({
              progress: 0,
              isComplete: false,
              error: error.message,
            });
            reject(error);
          },
          async () => {
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              onProgress({
                progress: 100,
                isComplete: true,
                downloadURL,
              });
              resolve(downloadURL);
            } catch (error) {
              reject(error);
            }
          }
        );
      });
    } else {
      // Simple upload without progress
      const snapshot = await uploadBytes(storageRef, file);
      return await getDownloadURL(snapshot.ref);
    }
  } catch (error) {
    console.error('Error uploading video:', error);
    throw error;
  }
}

/**
 * Upload multiple files with progress tracking
 */
export async function uploadMultipleFiles(
  files: File[],
  visitId: string,
  placeId: string,
  onProgress?: (fileIndex: number, progress: UploadProgress) => void
): Promise<{ images: string[]; videos: string[] }> {
  const results = { images: [] as string[], videos: [] as string[] };

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    try {
      if (file.type.startsWith('image/')) {
        const url = await uploadImage(
          file,
          visitId,
          placeId,
          onProgress ? (progress) => onProgress(i, progress) : undefined
        );
        results.images.push(url);
      } else if (file.type.startsWith('video/')) {
        const url = await uploadVideo(
          file,
          visitId,
          placeId,
          onProgress ? (progress) => onProgress(i, progress) : undefined
        );
        results.videos.push(url);
      } else {
        throw new Error(`Unsupported file type: ${file.type}`);
      }
    } catch (error) {
      console.error(`Error uploading file ${file.name}:`, error);
      if (onProgress) {
        onProgress(i, {
          progress: 0,
          isComplete: false,
          error: error instanceof Error ? error.message : 'Upload failed',
        });
      }
      // Continue with other files instead of throwing
    }
  }

  return results;
}

/**
 * Delete a file from Firebase Storage
 */
export async function deleteFile(downloadURL: string): Promise<void> {
  try {
    const storageRef = ref(storage, downloadURL);
    await deleteObject(storageRef);
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
}

/**
 * Validate file before upload
 */
export function validateFile(file: File): { isValid: boolean; error?: string } {
  const maxImageSize = 10 * 1024 * 1024; // 10MB
  const maxVideoSize = 100 * 1024 * 1024; // 100MB
  
  if (file.type.startsWith('image/')) {
    if (file.size > maxImageSize) {
      return {
        isValid: false,
        error: 'Image file size must be less than 10MB',
      };
    }
  } else if (file.type.startsWith('video/')) {
    if (file.size > maxVideoSize) {
      return {
        isValid: false,
        error: 'Video file size must be less than 100MB',
      };
    }
  } else {
    return {
      isValid: false,
      error: 'File must be an image or video',
    };
  }

  return { isValid: true };
}
