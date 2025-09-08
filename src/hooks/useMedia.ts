import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  uploadMedia,
  listMedia,
  deleteMedia,
  getMediaDownloadURL,
  UploadProgressCallback
} from '@/lib/firebase/media';
import { MediaItem } from '@/lib/types/temple';

export const useMedia = (planId: string) => {
  const { user } = useAuth();
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Load all media for the plan
  const loadMedia = useCallback(async () => {
    if (!user?.uid || !planId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const fetchedMedia = await listMedia(user.uid, planId);
      setMedia(fetchedMedia);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load media');
    } finally {
      setLoading(false);
    }
  }, [user?.uid, planId]);

  // Upload a new media file
  const uploadMediaFile = useCallback(async (file: File, caption?: string): Promise<string | null> => {
    if (!user?.uid || !planId) {
      setError('User not authenticated or plan not specified');
      return null;
    }
    
    setError(null);
    setUploading(true);
    setUploadProgress(0);
    
    try {
      const onProgress: UploadProgressCallback = (progress) => {
        setUploadProgress(progress);
      };
      
      const mediaId = await uploadMedia(user.uid, planId, file, caption, onProgress);
      await loadMedia(); // Reload media
      return mediaId;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload media');
      return null;
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [user?.uid, planId, loadMedia]);

  // Delete a media item
  const deleteMediaById = useCallback(async (mediaId: string): Promise<boolean> => {
    if (!user?.uid || !planId) {
      setError('User not authenticated or plan not specified');
      return false;
    }
    
    setError(null);
    
    try {
      await deleteMedia(user.uid, planId, mediaId);
      await loadMedia(); // Reload media
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete media');
      return false;
    }
  }, [user?.uid, planId, loadMedia]);

  // Get download URL for media
  const getDownloadUrl = useCallback(async (storagePath: string): Promise<string | null> => {
    try {
      return await getMediaDownloadURL(storagePath);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get download URL');
      return null;
    }
  }, []);

  // Load media on mount
  useEffect(() => {
    if (user?.uid && planId) {
      loadMedia();
    }
  }, [user?.uid, planId, loadMedia]);

  return {
    media,
    loading,
    uploading,
    uploadProgress,
    error,
    loadMedia,
    uploadMediaFile,
    deleteMediaById,
    getDownloadUrl,
  };
};
