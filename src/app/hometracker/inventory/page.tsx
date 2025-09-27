'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { db } from '../../../lib/firebase';
import { collection, addDoc, doc, updateDoc, deleteDoc, getDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { migrateLocalStorageToFirestore, checkLocalStorageForMigration } from './migration';

interface InventoryItem {
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

const INVENTORY_CATEGORIES = [
  'Electronics',
  'Kitchen & Home',
  'Furniture',
  'Clothing & Accessories',
  'Sports & Recreation',
  'Books & Media',
  'Toys & Games',
  'Tools & Equipment',
  'Health & Beauty',
  'Office & Stationery',
  'Other'
];

const LOCATION_SUGGESTIONS = [
  'Living Room',
  'Kitchen',
  'Bedroom',
  'Office',
  'Garage',
  'Basement',
  'Attic',
  'Storage Room',
  'Bathroom',
  'Dining Room',
  'Other'
];

const ITEM_TYPE_SUGGESTIONS = {
  'Electronics': ['Phone', 'Laptop', 'TV', 'Speaker', 'Headphones', 'Tablet', 'Camera', 'Monitor', 'Gaming Console', 'Smart Watch', 'Router', 'Cable', 'Charger', 'Other'],
  'Kitchen & Home': ['Appliance', 'Cookware', 'Utensils', 'Storage', 'Cleaning', 'Decor', 'Lighting', 'Textiles', 'Other'],
  'Furniture': ['Chair', 'Table', 'Sofa', 'Bed', 'Desk', 'Cabinet', 'Shelf', 'Drawer', 'Wardrobe', 'Other'],
  'Clothing & Accessories': ['Shirt', 'Pants', 'Shoes', 'Bag', 'Watch', 'Jewelry', 'Hat', 'Belt', 'Jacket', 'Other'],
  'Sports & Recreation': ['Equipment', 'Gear', 'Clothing', 'Accessories', 'Shoes', 'Other'],
  'Books & Media': ['Book', 'Magazine', 'DVD', 'Game', 'Music', 'Other'],
  'Toys & Games': ['Toy', 'Board Game', 'Video Game', 'Puzzle', 'Educational', 'Other'],
  'Tools & Equipment': ['Hand Tool', 'Power Tool', 'Measuring', 'Safety', 'Hardware', 'Other'],
  'Health & Beauty': ['Skincare', 'Makeup', 'Hair Care', 'Health Device', 'Supplement', 'Other'],
  'Office & Stationery': ['Pen', 'Paper', 'Notebook', 'File', 'Calculator', 'Other'],
  'Other': ['Miscellaneous', 'Collectible', 'Gift', 'Other']
};

export default function HomeInventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [deletingImageIndex, setDeletingImageIndex] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedItemType, setSelectedItemType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'price' | 'category'>('date');
  const [showDetailView, setShowDetailView] = useState(false);
  const [detailViewItem, setDetailViewItem] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    category: string;
    itemType: string;
    brand: string;
    model: string;
    purchaseDate: string;
    purchasePrice: string;
    warranty: string;
    location: string;
    condition: 'excellent' | 'good' | 'fair' | 'poor';
    serialNumber: string;
    notes: string;
  }>({
    name: '',
    category: 'Electronics',
    itemType: '',
    brand: '',
    model: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    purchasePrice: '',
    warranty: '',
    location: '',
    condition: 'excellent',
    serialNumber: '',
    notes: '',
  });
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [showMigration, setShowMigration] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState<string>('');

  const openImageViewer = (imageUrl: string) => {
    setCurrentImageUrl(imageUrl);
    setImageViewerOpen(true);
  };

  const closeImageViewer = () => {
    setImageViewerOpen(false);
    setCurrentImageUrl('');
  };

  // Camera functions
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      setCameraStream(stream);
      setShowCamera(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Unable to access camera. Please check permissions or use file upload instead.');
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    const video = document.getElementById('camera-video') as HTMLVideoElement;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (video && context) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);
      
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
          
          // Check if we can add more images
          if (imagePreviewUrls.length >= 5) {
            alert('Maximum 5 images allowed per item');
            return;
          }
          
          setSelectedImages(prev => [...prev, file]);
          
          // Create preview URL
          const reader = new FileReader();
          reader.onload = (e) => {
            setImagePreviewUrls(prev => [...prev, e.target?.result as string]);
          };
          reader.readAsDataURL(file);
          
          stopCamera();
        }
      }, 'image/jpeg', 0.9);
    }
  };

  // Cleanup camera on component unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  // Cloudinary deletion function
  const deleteFromCloudinary = async (imageUrl: string): Promise<boolean> => {
    try {
      console.log('🗑️ Starting deletion process for:', imageUrl);
      
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      if (!cloudName) {
        console.error('❌ Cloudinary cloud name not configured');
        return false;
      }

      // Extract public_id from Cloudinary URL
      const urlParts = imageUrl.split('/');
      const uploadIndex = urlParts.findIndex(part => part === 'upload');
      if (uploadIndex === -1) {
        console.error('❌ Invalid Cloudinary URL format:', imageUrl);
        return false;
      }
      
      // Get the public_id (everything after version number, without extension)
      const publicIdWithExtension = urlParts.slice(uploadIndex + 2).join('/');
      const publicId = publicIdWithExtension.replace(/\.[^/.]+$/, ''); // Remove file extension
      
      console.log('📝 Extracted public_id:', publicId);
      
      // Use our server-side API endpoint for secure deletion
      try {
        const response = await fetch('/api/delete-image', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ publicId })
        });
        
        const result = await response.json();
        console.log('🔄 API Response:', { status: response.status, result });
        
        if (response.ok && result.success) {
          console.log('✅ Image successfully deleted from Cloudinary:', publicId);
          return true;
        } else {
          console.warn('⚠️ Cloudinary deletion failed:', result.message);
          return false;
        }
      } catch (apiError) {
        console.error('❌ Cloudinary API deletion failed:', apiError);
        return false;
      }
    } catch (error) {
      console.error('❌ Error in deleteFromCloudinary:', error);
      return false;
    }
  };

  // Image upload function
  const uploadToCloudinary = async (file: File): Promise<string> => {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    
    console.log('🔍 Cloudinary Environment Check:', {
      cloudName: cloudName ? `${cloudName.substring(0, 3)}***` : 'MISSING',
      uploadPreset: uploadPreset ? `${uploadPreset.substring(0, 3)}***` : 'MISSING',
      environment: process.env.NODE_ENV
    });
    
    if (!cloudName || !uploadPreset) {
      const missingVars = [];
      if (!cloudName) missingVars.push('NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME');
      if (!uploadPreset) missingVars.push('NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET');
      
      const errorMessage = `❌ Cloudinary configuration missing: ${missingVars.join(', ')}. Please check your environment variables in production deployment settings.`;
      console.error(errorMessage);
      toast.error(`Image upload failed: Missing Cloudinary configuration`);
      throw new Error(errorMessage);
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    formData.append('folder', 'home-inventory');

    try {
      console.log('📤 Uploading to Cloudinary...');
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Cloudinary upload failed:', response.status, errorText);
        throw new Error(`Failed to upload image: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Image uploaded successfully:', data.secure_url);
      return data.secure_url;
    } catch (error) {
      console.error('❌ Error uploading image:', error);
      toast.error('Failed to upload image. Please try again.');
      throw error;
    }
  };

  // Delete multiple images from Cloudinary
  const deleteMultipleFromCloudinary = async (imageUrls: string[]): Promise<void> => {
    if (imageUrls.length === 0) return;
    
    console.log('Deleting', imageUrls.length, 'images from Cloudinary');
    const deletionPromises = imageUrls.map(url => deleteFromCloudinary(url));
    
    try {
      await Promise.all(deletionPromises);
      console.log('All images deleted from Cloudinary');
    } catch (error) {
      console.error('Error deleting some images from Cloudinary:', error);
    }
  };

  // Handle image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Limit to 5 images total
    const totalImages = imagePreviewUrls.length + files.length;
    if (totalImages > 5) {
      alert('Maximum 5 images allowed per item');
      return;
    }

    setSelectedImages(prev => [...prev, ...files]);
    
    // Create preview URLs
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreviewUrls(prev => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  // Remove image from preview
  const removeImagePreview = async (index: number) => {
    const imageToRemove = imagePreviewUrls[index];
    
    console.log('🗑️ Removing image at index:', index);
    console.log('📸 Image URL:', imageToRemove);
    console.log('📂 Current existingImages:', existingImages);
    console.log('🆕 Current selectedImages count:', selectedImages.length);
    
    // Check if this is an existing image (from Cloudinary) or a new local preview
    const isExistingImage = existingImages.includes(imageToRemove);
    console.log('🔍 Is existing image?', isExistingImage);
    
    if (isExistingImage) {
      // If we're editing an item, update Firebase immediately
      if (editingItem) {
        console.log('✏️ Editing existing item:', editingItem.name);
        try {
          // Calculate updated images BEFORE updating state
          const updatedImages = existingImages.filter(img => img !== imageToRemove);
          console.log('📝 Updated images array:', updatedImages);
          
          // Delete from Cloudinary first
          console.log('☁️ Attempting Cloudinary deletion...');
          const deleted = await deleteFromCloudinary(imageToRemove);
          console.log('☁️ Cloudinary deletion result:', deleted);
          
          // Update the item in Firebase to remove this image URL
          console.log('🔥 Updating Firebase document...');
          const itemRef = doc(db, 'homeInventory', editingItem.id);
          await updateDoc(itemRef, {
            images: updatedImages,
            updatedAt: new Date().toISOString(),
          });
          console.log('✅ Firebase document updated successfully');
          
          // Update local state after successful Firebase update
          setExistingImages(updatedImages);
          
          if (deleted) {
            toast.success('Image deleted from cloud storage and database');
          } else {
            toast.success('Image removed from database (cloud deletion may have failed)');
          }
        } catch (error) {
          console.error('❌ Failed to delete image:', error);
          toast.error('Failed to delete image completely');
          return; // Don't update UI state if database update failed
        }
      } else {
        // For new items (not yet saved), just delete from Cloudinary and update local state
        console.log('🆕 Deleting from new item (not yet saved)');
        try {
          await deleteFromCloudinary(imageToRemove);
          setExistingImages(prev => prev.filter(img => img !== imageToRemove));
          toast.success('Image deleted from cloud storage');
        } catch (error) {
          console.error('Failed to delete from Cloudinary:', error);
          toast.error('Failed to delete image from cloud storage');
          return;
        }
      }
    } else {
      // Remove from new images (local files) - find the correct index
      const existingCount = existingImages.length;
      const newImageIndex = index - existingCount;
      console.log('🆕 Removing new image at adjusted index:', newImageIndex);
      
      if (newImageIndex >= 0 && newImageIndex < selectedImages.length) {
        setSelectedImages(prev => prev.filter((_, i) => i !== newImageIndex));
        console.log('✅ Removed from selectedImages');
      }
    }
    
    // Remove from preview URLs only after successful operations
    setImagePreviewUrls(prev => prev.filter((_, i) => i !== index));
    console.log('🖼️ Removed from preview URLs');
  };

  // Validate if image URL is still accessible
  const validateImageUrl = async (url: string): Promise<boolean> => {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  };

  // Clean up broken image URLs from an item
  const cleanupBrokenImages = async (item: InventoryItem) => {
    if (!item.images || item.images.length === 0) return;
    
    const validImages: string[] = [];
    let hasInvalidImages = false;
    
    for (const imageUrl of item.images) {
      const isValid = await validateImageUrl(imageUrl);
      if (isValid) {
        validImages.push(imageUrl);
      } else {
        hasInvalidImages = true;
        console.warn('Found broken image URL:', imageUrl);
      }
    }
    
    // Update Firebase if we found broken images
    if (hasInvalidImages) {
      try {
        const itemRef = doc(db, 'homeInventory', item.id);
        await updateDoc(itemRef, {
          images: validImages,
          updatedAt: new Date().toISOString(),
        });
        console.log(`Cleaned up ${item.images.length - validImages.length} broken images for item: ${item.name}`);
      } catch (error) {
        console.error('Failed to cleanup broken images:', error);
      }
    }
  };

  // Load items from Firestore with real-time updates
  useEffect(() => {
    setLoading(true);
    
    // Check for localStorage data that needs migration
    checkLocalStorageForMigration().then(hasData => {
      if (hasData) {
        setShowMigration(true);
      }
    });

    const inventoryRef = collection(db, 'homeInventory');
    const q = query(inventoryRef, orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const inventoryItems: InventoryItem[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          const item = {
            id: doc.id,
            ...data,
            // Ensure all required fields exist with defaults
            images: data.images || [],
            itemType: data.itemType || '',
            condition: data.condition || 'good',
            purchaseDate: data.purchaseDate || new Date().toISOString().split('T')[0],
            createdAt: data.createdAt || new Date().toISOString(),
          } as InventoryItem;
          
          console.log(`📦 Loaded item: ${item.name}`, {
            id: item.id,
            images: item.images,
            imageCount: item.images?.length || 0,
            rawImageData: data.images
          });
          
          inventoryItems.push(item);
        });
        setItems(inventoryItems);
        setLoading(false);
        console.log('✅ Loaded', inventoryItems.length, 'items from Firestore');
        console.log('📊 Items with images:', inventoryItems.filter(item => item.images && item.images.length > 0).length);
        
        // Optional: Run cleanup for broken images in background (uncomment if needed)
        // inventoryItems.forEach(item => {
        //   if (item.images && item.images.length > 0) {
        //     cleanupBrokenImages(item);
        //   }
        // });
      },
      (error) => {
        console.error('Error loading items from Firestore:', error);
        toast.error('Failed to load inventory items');
        setLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);



  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.location.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setUploadingImages(true);
    try {
      // Upload new images to Cloudinary
      const uploadedImageUrls: string[] = [];
      if (selectedImages.length > 0) {
        for (const file of selectedImages) {
          try {
            const url = await uploadToCloudinary(file);
            uploadedImageUrls.push(url);
          } catch (error) {
            console.error('Failed to upload image:', error);
            toast.error('Failed to upload one or more images');
            return;
          }
        }
      }

      const itemData = {
        name: formData.name,
        category: formData.category,
        itemType: formData.itemType,
        brand: formData.brand,
        model: formData.model,
        purchaseDate: formData.purchaseDate,
        purchasePrice: formData.purchasePrice ? parseFloat(formData.purchasePrice) : null,
        warranty: formData.warranty,
        location: formData.location,
        condition: formData.condition,
        serialNumber: formData.serialNumber,
        notes: formData.notes,
      };

      if (editingItem) {
        // Update existing item - combine existing images (that weren't deleted) with newly uploaded images
        const itemRef = doc(db, 'homeInventory', editingItem.id);
        const finalImages = [...existingImages, ...uploadedImageUrls];
        
        console.log('📝 Saving item with images:', {
          existingImages: existingImages,
          newlyUploaded: uploadedImageUrls,
          finalImages: finalImages
        });
        
        await updateDoc(itemRef, {
          ...itemData,
          images: finalImages,
          updatedAt: new Date().toISOString(),
        });
        toast.success('Item updated successfully!');
      } else {
        // Add new item to Firestore
        await addDoc(collection(db, 'homeInventory'), {
          ...itemData,
          images: uploadedImageUrls,
          createdAt: new Date().toISOString(),
        });
        toast.success('Item added successfully!');
      }

      resetForm();
    } catch (error) {
      console.error('Error saving item:', error);
      toast.error('Failed to save item. Please try again.');
    } finally {
      setUploadingImages(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'Electronics',
      itemType: '',
      brand: '',
      model: '',
      purchaseDate: new Date().toISOString().split('T')[0],
      purchasePrice: '',
      warranty: '',
      location: '',
      condition: 'excellent',
      serialNumber: '',
      notes: '',
    });
    setSelectedImages([]);
    setImagePreviewUrls([]);
    setExistingImages([]);
    setDeletingImageIndex(null);
    setEditingItem(null);
    setShowAddForm(false);
    setShowDetailView(false);
    setDetailViewItem(null);
    stopCamera();
  };

  const openEditModal = async (item: InventoryItem) => {
    // Fetch fresh item data from Firestore to ensure we have the latest images
    try {
      const itemRef = doc(db, 'homeInventory', item.id);
      const itemSnap = await getDoc(itemRef);
      
      if (itemSnap.exists()) {
        const freshItemData = { id: itemSnap.id, ...itemSnap.data() } as InventoryItem;
        console.log('🔄 Fresh item data loaded for editing:', freshItemData.name, 'Images:', freshItemData.images);
        
        setEditingItem(freshItemData);
        setFormData({
          name: freshItemData.name,
          category: freshItemData.category,
          itemType: freshItemData.itemType || '',
          brand: freshItemData.brand || '',
          model: freshItemData.model || '',
          purchaseDate: freshItemData.purchaseDate,
          purchasePrice: freshItemData.purchasePrice?.toString() || '',
          warranty: freshItemData.warranty || '',
          location: freshItemData.location,
          condition: freshItemData.condition,
          serialNumber: freshItemData.serialNumber || '',
          notes: freshItemData.notes || '',
        });
        
        // Set existing images from fresh data
        const itemImages = freshItemData.images || [];
        setExistingImages(itemImages);
        setImagePreviewUrls(itemImages);
        setSelectedImages([]);
        setShowAddForm(true);
      } else {
        toast.error('Item not found');
      }
    } catch (error) {
      console.error('Error fetching fresh item data:', error);
      // Fallback to original item data if fetch fails
      setEditingItem(item);
      setFormData({
        name: item.name,
        category: item.category,
        itemType: item.itemType || '',
        brand: item.brand || '',
        model: item.model || '',
        purchaseDate: item.purchaseDate,
        purchasePrice: item.purchasePrice?.toString() || '',
        warranty: item.warranty || '',
        location: item.location,
        condition: item.condition,
        serialNumber: item.serialNumber || '',
        notes: item.notes || '',
      });
      
      const itemImages = item.images || [];
      setExistingImages(itemImages);
      setImagePreviewUrls(itemImages);
      setSelectedImages([]);
      setShowAddForm(true);
    }
  };

  const openDetailView = (item: InventoryItem) => {
    setDetailViewItem(item);
    setShowDetailView(true);
  };

  const deleteItem = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item? This will also delete all associated images.')) {
      return;
    }

    // Find the item to get its images
    const itemToDelete = items.find(item => item.id === id);
    
    try {
      // Delete images from Cloudinary first
      if (itemToDelete?.images && itemToDelete.images.length > 0) {
        await deleteMultipleFromCloudinary(itemToDelete.images);
      }
      
      // Then delete the item from Firestore
      await deleteDoc(doc(db, 'homeInventory', id));
      toast.success('Item and all images deleted successfully!');
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete item. Please try again.');
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'excellent': return 'bg-green-100 text-green-800 border-green-200';
      case 'good': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'fair': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'poor': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons: { [key: string]: string } = {
      'Electronics': '📱',
      'Kitchen & Home': '🍳',
      'Furniture': '🪑',
      'Clothing & Accessories': '👕',
      'Sports & Recreation': '⚽',
      'Books & Media': '📚',
      'Toys & Games': '🧸',
      'Tools & Equipment': '🔧',
      'Health & Beauty': '💄',
      'Office & Stationery': '📄',
      'Other': '📦'
    };
    return icons[category] || '📦';
  };

    // Filter and sort items
  const filteredItems = items
    .filter(item => {
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesItemType = selectedItemType === 'all' || item.itemType === selectedItemType;
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.itemType?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesItemType && matchesSearch;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'date':
          return new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime();
        case 'price':
          return (b.purchasePrice || 0) - (a.purchasePrice || 0);
        case 'category':
          return a.category.localeCompare(b.category);
        default:
          return 0;
      }
    });

  // Calculate statistics
  const totalItems = items.length;
  const totalValue = items.reduce((sum, item) => sum + (item.purchasePrice || 0), 0);
  const categoryStats = INVENTORY_CATEGORIES.map(category => ({
    name: category,
    count: items.filter(item => item.category === category).length
  })).filter(stat => stat.count > 0);

  // Get unique item types for filtering
  const availableItemTypes = [...new Set(items.map(item => item.itemType).filter(Boolean))].sort();

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showAddForm) {
        resetForm();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showAddForm]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-cyan-400/20 to-blue-600/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-indigo-400/10 to-purple-600/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>
      
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link
                href="/hometracker"
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                  <span className="text-xl">🏠</span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">Home Inventory</h1>
                  <p className="text-sm text-gray-600">Track all your household items and purchases</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={async () => {
                  console.log('🔍 DEBUG - Current state:');
                  console.log('Items in database:', items.length);
                  items.forEach((item, i) => {
                    console.log(`Item ${i + 1} (${item.name}):`, {
                      id: item.id,
                      images: item.images,
                      imageCount: item.images?.length || 0
                    });
                  });
                  console.log('Edit mode - existingImages:', existingImages);
                  console.log('Edit mode - imagePreviewUrls:', imagePreviewUrls);
                  console.log('Edit mode - selectedImages:', selectedImages.length);
                  
                  // Test image URLs
                  const itemsWithImages = items.filter(item => item.images && item.images.length > 0);
                  if (itemsWithImages.length > 0) {
                    const firstItem = itemsWithImages[0];
                    const firstImageUrl = firstItem.images[0];
                    console.log('🧪 Testing first image URL:', firstImageUrl);
                    
                    try {
                      const response = await fetch(firstImageUrl, { method: 'HEAD' });
                      console.log('📡 URL Response:', {
                        status: response.status,
                        ok: response.ok,
                        headers: Object.fromEntries(response.headers.entries())
                      });
                    } catch (error) {
                      console.error('🚫 URL Test Failed:', error);
                    }
                  }
                  
                  // Test API endpoint
                  try {
                    const testResponse = await fetch('/api/delete-image', {
                      method: 'DELETE',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ publicId: 'test' })
                    });
                    const result = await testResponse.json();
                    console.log('API Test Response:', { status: testResponse.status, result });
                  } catch (e) {
                    console.log('API Test Error:', e);
                  }
                }}
                className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-all duration-200 text-sm"
                title="Debug current state"
              >
                <span>🔍 Debug</span>
              </button>
              <button
                onClick={async () => {
                  setLoading(true);
                  let cleanedCount = 0;
                  for (const item of items) {
                    if (item.images && item.images.length > 0) {
                      const initialImageCount = item.images.length;
                      await cleanupBrokenImages(item);
                      // Check if images were cleaned (simplified check)
                      const updatedItem = items.find(i => i.id === item.id);
                      if (updatedItem && updatedItem.images.length < initialImageCount) {
                        cleanedCount++;
                      }
                    }
                  }
                  setLoading(false);
                  if (cleanedCount > 0) {
                    toast.success(`Cleaned up broken images from ${cleanedCount} items`);
                  } else {
                    toast.success('All images are valid - no cleanup needed');
                  }
                }}
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-all duration-200 text-sm"
                title="Clean up broken image links"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Fix Images</span>
              </button>
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-gradient-to-r from-slate-600 to-gray-600 hover:from-slate-700 hover:to-gray-700 text-white px-6 py-2 rounded-lg flex items-center space-x-2 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Add Item</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-full mb-4">
                <svg className="animate-spin w-8 h-8 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Loading Your Inventory</h3>
              <p className="text-gray-500">Fetching your items from the cloud database...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="text-center">
              <div className="text-3xl font-bold text-slate-600 mb-2">{totalItems}</div>
              <div className="text-gray-600 text-sm">Total Items</div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">₹{totalValue.toLocaleString()}</div>
              <div className="text-gray-600 text-sm">Total Value</div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">{categoryStats.length}</div>
              <div className="text-gray-600 text-sm">Categories Used</div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {items.filter(item => item.condition === 'excellent').length}
              </div>
              <div className="text-gray-600 text-sm">Excellent Condition</div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-gray-100 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 backdrop-blur-sm"
                placeholder="Search items..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 backdrop-blur-sm"
              >
                <option value="all">All Categories</option>
                {INVENTORY_CATEGORIES.map(category => (
                  <option key={category} value={category}>
                    {getCategoryIcon(category)} {category}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Item Type</label>
              <select
                value={selectedItemType}
                onChange={(e) => setSelectedItemType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 backdrop-blur-sm"
              >
                <option value="all">All Types</option>
                {availableItemTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 backdrop-blur-sm"
              >
                <option value="date">Purchase Date</option>
                <option value="name">Name</option>
                <option value="price">Price</option>
                <option value="category">Category</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('all');
                  setSelectedItemType('all');
                  setSortBy('date');
                }}
                className="w-full px-4 py-2 bg-gray-100/80 hover:bg-gray-200/80 text-gray-700 rounded-lg transition-colors backdrop-blur-sm"
              >
                Reset Filters
              </button>
            </div>
          </div>
        </div>

        {/* Items Grid */}
        {filteredItems.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 border border-gray-100 text-center">
            <div className="text-6xl mb-4">🏠</div>
            <h3 className="text-xl font-semibold text-gray-600 mb-2">
              {items.length === 0 ? 'No items yet' : 'No items found'}
            </h3>
            <p className="text-gray-500 mb-6">
              {items.length === 0 
                ? 'Start building your home inventory by adding your first item!'
                : 'Try adjusting your search or filter criteria.'
              }
            </p>
            {items.length === 0 && (
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-gradient-to-r from-slate-600 to-gray-600 hover:from-slate-700 hover:to-gray-700 text-white px-8 py-3 rounded-lg flex items-center space-x-2 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 mx-auto"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Add Your First Item</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => (
              <div key={item.id} className="bg-white/70 backdrop-blur-sm rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-200 hover:transform hover:scale-[1.02] flex flex-col h-[420px]">
                {/* Image Display */}
                {item.images && item.images.length > 0 ? (
                  <div className="p-4 pb-0">
                    <div className="grid grid-cols-2 gap-2">
                      {item.images.slice(0, 4).map((imageUrl, index) => {
                        console.log(`🖼️ Card Image ${index} for ${item.name}:`, imageUrl);
                        return (
                          <div 
                            key={index} 
                            className="relative cursor-pointer rounded-lg border-2 border-gray-300"
                            style={{ 
                              width: '100%', 
                              height: '80px',
                              backgroundColor: '#ffffff',
                              overflow: 'hidden'
                            }}
                            onClick={() => {
                              console.log('🖱️ Clicked image:', imageUrl);
                              openImageViewer(imageUrl);
                            }}
                          >
                            <img
                              src={imageUrl}
                              alt={`${item.name} ${index + 1}`}
                              crossOrigin="anonymous"
                              loading="eager"
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                display: 'block',
                                border: 'none',
                                outline: 'none',
                                backgroundColor: 'transparent'
                              }}
                              onError={(e) => {
                                console.error('❌ Image failed to load:', imageUrl);
                                const target = e.target as HTMLImageElement;
                                const container = target.parentElement;
                                if (container) {
                                  container.innerHTML = `
                                    <div style="
                                      width: 100%; 
                                      height: 100%; 
                                      display: flex; 
                                      align-items: center; 
                                      justify-content: center; 
                                      background-color: #f3f4f6; 
                                      color: #6b7280;
                                      font-size: 12px;
                                      flex-direction: column;
                                    ">
                                      <div style="font-size: 20px; margin-bottom: 4px;">📷</div>
                                      <div>Failed</div>
                                    </div>
                                  `;
                                }
                              }}
                              onLoad={(e) => {
                                console.log('✅ Image successfully loaded:', imageUrl);
                                const img = e.target as HTMLImageElement;
                                console.log('Image dimensions:', img.naturalWidth, 'x', img.naturalHeight);
                                
                                // Force redraw
                                img.style.opacity = '0';
                                setTimeout(() => {
                                  img.style.opacity = '1';
                                }, 10);
                              }}
                            />
                            {item.images.length > 4 && index === 3 && (
                              <div style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontSize: '14px',
                                fontWeight: 'bold'
                              }}>
                                +{item.images.length - 4}
                              </div>
                            )}
                            {/* Hover overlay */}
                            <div 
                              className="group-hover:bg-black group-hover:bg-opacity-20"
                              style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                opacity: 0,
                                transition: 'opacity 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.opacity = '1';
                                e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.opacity = '0';
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }}
                            >
                              <svg width="24" height="24" fill="none" stroke="white" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 pb-0">
                    <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg h-20 flex items-center justify-center border-2 border-dashed border-gray-300">
                      <div className="text-center">
                        <svg className="w-8 h-8 text-gray-400 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-xs text-gray-500 font-medium">No Image</p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-lg">{getCategoryIcon(item.category)}</span>
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-gray-800 truncate">{item.name}</h3>
                        <p className="text-xs text-gray-500">{item.category}</p>
                        {item.itemType && (
                          <p className="text-xs text-indigo-600 font-medium">{item.itemType}</p>
                        )}
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border flex-shrink-0 ${getConditionColor(item.condition)}`}>
                      {item.condition.charAt(0).toUpperCase() + item.condition.slice(1)}
                    </span>
                  </div>

                  {(item.brand || item.model) && (
                    <div className="mb-3">
                      <p className="text-sm text-gray-600 truncate">
                        {item.brand} {item.model}
                      </p>
                    </div>
                  )}

                  <div className="space-y-2 mb-4 flex-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Date:</span>
                      <span className="text-gray-800 text-right">{new Date(item.purchaseDate).toLocaleDateString()}</span>
                    </div>
                    {item.purchasePrice && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Price:</span>
                        <span className="text-gray-800 font-medium text-right">₹{item.purchasePrice.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Location:</span>
                      <span className="text-gray-800 text-right truncate ml-2">{item.location}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                    <div className="text-xs text-gray-500">
                      Added {new Date(item.createdAt).toLocaleDateString()}
                    </div>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => openDetailView(item)}
                        className="text-indigo-600 hover:text-indigo-700 px-2 py-1 text-sm transition-colors rounded hover:bg-indigo-50"
                      >
                        View
                      </button>
                      <button
                        onClick={() => openEditModal(item)}
                        className="text-slate-600 hover:text-slate-700 px-2 py-1 text-sm transition-colors rounded hover:bg-slate-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="text-red-500 hover:text-red-700 px-2 py-1 text-sm transition-colors rounded hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
          </>
        )}
      </div>

      {/* Migration Modal */}
      {showMigration && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Data Migration Available</h2>
              <p className="text-gray-600">
                We found inventory items saved locally in your browser. Would you like to migrate them to the cloud database for permanent storage?
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-blue-800 mb-2">Benefits of migration:</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Permanent cloud storage (won't disappear on browser refresh)</li>
                <li>• Access from any device</li>
                <li>• Real-time synchronization</li>
                <li>• Automatic backups</li>
              </ul>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowMigration(false);
                  localStorage.removeItem('homeInventory'); // Clear without migrating
                }}
                disabled={migrating}
                className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Skip Migration
              </button>
              <button
                onClick={async () => {
                  setMigrating(true);
                  try {
                    const result = await migrateLocalStorageToFirestore();
                    if (result.success) {
                      toast.success(result.message);
                      setShowMigration(false);
                    } else {
                      toast.error(result.message);
                    }
                  } catch (error) {
                    toast.error('Migration failed. Please try again.');
                  } finally {
                    setMigrating(false);
                  }
                }}
                disabled={migrating}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none disabled:opacity-50 flex items-center space-x-2"
              >
                {migrating ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Migrating...</span>
                  </>
                ) : (
                  <span>Migrate to Cloud Database</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Add/Edit Item */}
      {showAddForm && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              resetForm();
            }
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                {editingItem ? 'Edit Item' : 'Add New Item'}
              </h2>
              <button
                onClick={resetForm}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Item Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-colors"
                  placeholder="e.g., iPhone 15 Pro, Samsung Monitor, Kitchen Knife Set"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                <select
                  value={formData.category}
                  onChange={(e) => {
                    setFormData({ ...formData, category: e.target.value, itemType: '' });
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  required
                >
                  {INVENTORY_CATEGORIES.map(category => (
                    <option key={category} value={category}>
                      {getCategoryIcon(category)} {category}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Item Type</label>
                <select
                  value={formData.itemType}
                  onChange={(e) => setFormData({ ...formData, itemType: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                >
                  <option value="">Select Item Type</option>
                  {ITEM_TYPE_SUGGESTIONS[formData.category as keyof typeof ITEM_TYPE_SUGGESTIONS]?.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Brand</label>
                <input
                  type="text"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-colors"
                  placeholder="e.g., Apple, Samsung, Sony, Nike"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
                <input
                  type="text"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-colors"
                  placeholder="e.g., iPhone 15 Pro, Galaxy S24, XM4"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Purchase Date</label>
                <input
                  type="date"
                  value={formData.purchaseDate}
                  onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Purchase Price (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.purchasePrice}
                  onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-colors"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location *</label>
                <select
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-colors"
                  required
                >
                  <option value="">Select Location</option>
                  {LOCATION_SUGGESTIONS.map(location => (
                    <option key={location} value={location}>{location}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Condition</label>
                <select
                  value={formData.condition}
                  onChange={(e) => setFormData({ ...formData, condition: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-colors"
                >
                  <option value="excellent">Excellent</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                  <option value="poor">Poor</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Warranty Period</label>
                <input
                  type="text"
                  value={formData.warranty}
                  onChange={(e) => setFormData({ ...formData, warranty: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-colors"
                  placeholder="e.g., 1 Year, 2 Years, Lifetime"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Serial Number</label>
                <input
                  type="text"
                  value={formData.serialNumber}
                  onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-colors"
                  placeholder="Serial number or ID"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-colors"
                  placeholder="Additional notes, features, or important information..."
                  rows={3}
                />
              </div>
              
              {/* Image Upload Section */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Images (Max 5)
                </label>
                <div className="space-y-4">
                  {/* Upload Options */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* File Upload */}
                    <div className="flex items-center justify-center w-full">
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <svg className="w-8 h-8 mb-2 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                          </svg>
                          <p className="mb-1 text-sm text-gray-500 font-semibold">Upload Files</p>
                          <p className="text-xs text-gray-500">PNG, JPG, JPEG</p>
                        </div>
                        <input
                          type="file"
                          className="hidden"
                          multiple
                          accept="image/*"
                          onChange={handleImageSelect}
                          disabled={imagePreviewUrls.length >= 5}
                        />
                      </label>
                    </div>
                    
                    {/* Camera Capture */}
                    <button
                      type="button"
                      onClick={startCamera}
                      disabled={imagePreviewUrls.length >= 5}
                      className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg className="w-8 h-8 mb-2 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <p className="mb-1 text-sm text-slate-600 font-semibold">Take Photo</p>
                      <p className="text-xs text-slate-500">Use Camera</p>
                    </button>
                  </div>
                  
                  {/* Image Previews */}
                  {imagePreviewUrls.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      {imagePreviewUrls.map((url, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={url}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg border border-gray-200"
                          />
                          <button
                            type="button"
                            onClick={() => removeImagePreview(index)}
                            disabled={deletingImageIndex === index}
                            className={`absolute -top-2 -right-2 w-6 h-6 flex items-center justify-center text-xs rounded-full transition-colors ${
                              deletingImageIndex === index 
                                ? 'bg-gray-400 cursor-not-allowed' 
                                : 'bg-red-500 hover:bg-red-600 text-white opacity-0 group-hover:opacity-100'
                            }`}
                            title={deletingImageIndex === index ? 'Deleting...' : 'Delete image'}
                          >
                            {deletingImageIndex === index ? (
                              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              '×'
                            )}
                          </button>
                          {/* Status indicator for existing vs new images */}
                          <div className="absolute top-1 left-1">
                            {existingImages.includes(url) ? (
                              <span className="bg-blue-500 text-white text-xs px-1 py-0.5 rounded text-[10px] font-medium">
                                Saved
                              </span>
                            ) : (
                              <span className="bg-green-500 text-white text-xs px-1 py-0.5 rounded text-[10px] font-medium">
                                New
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {imagePreviewUrls.length >= 5 && (
                    <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
                      Maximum 5 images allowed per item.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={resetForm}
                className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!formData.name.trim() || !formData.location.trim() || uploadingImages || deletingImageIndex !== null}
                className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none flex items-center space-x-2"
              >
                {uploadingImages ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Uploading Images...</span>
                  </>
                ) : deletingImageIndex !== null ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Deleting Image...</span>
                  </>
                ) : (
                  <span>{editingItem ? 'Update Item' : 'Add Item'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail View Modal */}
      {showDetailView && detailViewItem && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDetailView(false);
              setDetailViewItem(null);
            }
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">{getCategoryIcon(detailViewItem.category)}</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">{detailViewItem.name}</h2>
                  <p className="text-gray-600">{detailViewItem.category} • {detailViewItem.itemType}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getConditionColor(detailViewItem.condition)}`}>
                  {detailViewItem.condition.charAt(0).toUpperCase() + detailViewItem.condition.slice(1)}
                </span>
                <button
                  onClick={() => {
                    setShowDetailView(false);
                    setDetailViewItem(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Images Gallery */}
            {detailViewItem.images && detailViewItem.images.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Images</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {detailViewItem.images.map((imageUrl, index) => (
                    <div 
                      key={index} 
                      className="relative cursor-pointer rounded-lg border-2 border-gray-300"
                      style={{ 
                        width: '100%', 
                        height: '128px',
                        backgroundColor: '#ffffff',
                        overflow: 'hidden'
                      }}
                      onClick={() => openImageViewer(imageUrl)}
                    >
                      <img
                        src={imageUrl}
                        alt={`${detailViewItem.name} ${index + 1}`}
                        crossOrigin="anonymous"
                        loading="eager"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block',
                          border: 'none',
                          outline: 'none',
                          backgroundColor: 'transparent'
                        }}
                        onError={(e) => {
                          console.error('❌ Detail view image failed to load:', imageUrl);
                          const target = e.target as HTMLImageElement;
                          const container = target.parentElement;
                          if (container) {
                            container.innerHTML = `
                              <div style="
                                width: 100%; 
                                height: 100%; 
                                display: flex; 
                                align-items: center; 
                                justify-content: center; 
                                background-color: #f3f4f6; 
                                color: #6b7280;
                                font-size: 14px;
                                flex-direction: column;
                              ">
                                <div style="font-size: 24px; margin-bottom: 8px;">📷</div>
                                <div>Image Error</div>
                              </div>
                            `;
                          }
                        }}
                        onLoad={(e) => {
                          console.log('✅ Detail view image successfully loaded:', imageUrl);
                          const img = e.target as HTMLImageElement;
                          console.log('Detail image dimensions:', img.naturalWidth, 'x', img.naturalHeight);
                          
                          // Force redraw
                          img.style.opacity = '0';
                          setTimeout(() => {
                            img.style.opacity = '1';
                          }, 10);
                        }}
                      />
                      {/* Hover overlay */}
                      <div 
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: 0,
                          transition: 'opacity 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.opacity = '1';
                          e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.opacity = '0';
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <svg width="32" height="32" fill="none" stroke="white" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                        </svg>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Item Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Basic Information</h3>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">Category:</span>
                    <span className="text-gray-800">{detailViewItem.category}</span>
                  </div>
                  {detailViewItem.itemType && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 font-medium">Item Type:</span>
                      <span className="text-gray-800">{detailViewItem.itemType}</span>
                    </div>
                  )}
                  {detailViewItem.brand && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 font-medium">Brand:</span>
                      <span className="text-gray-800">{detailViewItem.brand}</span>
                    </div>
                  )}
                  {detailViewItem.model && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 font-medium">Model:</span>
                      <span className="text-gray-800">{detailViewItem.model}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">Condition:</span>
                    <span className="text-gray-800 capitalize">{detailViewItem.condition}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">Location:</span>
                    <span className="text-gray-800">{detailViewItem.location}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Purchase Details</h3>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">Purchase Date:</span>
                    <span className="text-gray-800">{new Date(detailViewItem.purchaseDate).toLocaleDateString()}</span>
                  </div>
                  {detailViewItem.purchasePrice && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 font-medium">Purchase Price:</span>
                      <span className="text-gray-800 font-semibold">₹{detailViewItem.purchasePrice.toLocaleString()}</span>
                    </div>
                  )}
                  {detailViewItem.warranty && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 font-medium">Warranty:</span>
                      <span className="text-gray-800">{detailViewItem.warranty}</span>
                    </div>
                  )}
                  {detailViewItem.serialNumber && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 font-medium">Serial Number:</span>
                      <span className="text-gray-800 font-mono text-sm">{detailViewItem.serialNumber}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Notes */}
            {detailViewItem.notes && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Notes</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-700 whitespace-pre-wrap">{detailViewItem.notes}</p>
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Record Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                <div>
                  <span className="font-medium">Created:</span> {new Date(detailViewItem.createdAt).toLocaleString()}
                </div>
                {detailViewItem.updatedAt && (
                  <div>
                    <span className="font-medium">Last Updated:</span> {new Date(detailViewItem.updatedAt).toLocaleString()}
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowDetailView(false);
                  setDetailViewItem(null);
                  openEditModal(detailViewItem);
                }}
                className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Edit Item
              </button>
              <button
                onClick={() => {
                  setShowDetailView(false);
                  setDetailViewItem(null);
                }}
                className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">Take Photo</h3>
              <button
                onClick={stopCamera}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="relative">
              <video
                id="camera-video"
                autoPlay
                playsInline
                muted
                ref={(video) => {
                  if (video && cameraStream) {
                    video.srcObject = cameraStream;
                  }
                }}
                className="w-full h-64 md:h-80 object-cover rounded-lg bg-gray-100"
              />
              
              {/* Camera overlay */}
              <div className="absolute inset-0 border-2 border-white border-opacity-50 rounded-lg pointer-events-none">
                <div className="absolute top-4 left-4 right-4 bottom-4 border-2 border-dashed border-white border-opacity-30 rounded-lg"></div>
              </div>
            </div>
            
            <div className="flex justify-center items-center mt-6 space-x-4">
              <button
                onClick={stopCamera}
                className="px-6 py-3 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={capturePhoto}
                className="px-8 py-3 bg-gradient-to-r from-slate-600 to-gray-600 hover:from-slate-700 hover:to-gray-700 text-white rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Capture Photo</span>
              </button>
            </div>
            
            <p className="text-sm text-gray-500 text-center mt-4">
              Position your item within the frame and click capture
            </p>
          </div>
        </div>
      )}

      {/* Image Viewer Modal */}
      {imageViewerOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeImageViewer();
            }
          }}
        >
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={closeImageViewer}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors z-10"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img
              src={currentImageUrl}
              alt="Full size view"
              className="max-w-full max-h-full object-contain rounded-lg"
              onError={(e) => {
                console.error('Full size image load error:', currentImageUrl);
                (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yMDAgMTAwQzE4MCAzMCAxNDAgNDAgMTQwIDYwUzE4MCA5MCAyMDAgMTAwUzI2MCA3MCAyNjAgNjBTMjIwIDMwIDIwMCAxMDBaIiBmaWxsPSIjOUNBM0FGIi8+CjxwYXRoIGQ9Ik0zNTAgNTBIMTAwQzc1IDUwIDUwIDc1IDUwIDEwMFYyMDBDNTAgMjI1IDc1IDI1MCAxMDAgMjUwSDMwMEMzMjUgMjUwIDM1MCAyMjUgMzUwIDIwMFYxMDBDMzUwIDc1IDMyNSA1MCAzMDAgNTBaTTMwMCAxMDBIMTAwVjIwMEgzMDBWMTAwWiIgZmlsbD0iIzlDQTNBRiIvPgo8dGV4dCB4PSIyMDAiIHk9IjE4MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzlDQTNBRiIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0Ij5JbWFnZSBub3QgYXZhaWxhYmxlPC90ZXh0Pgo8L3N2Zz4=';
              }}
            />
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-sm bg-black bg-opacity-50 px-3 py-1 rounded">
              Click outside to close
            </div>
          </div>
        </div>
      )}
    </main>
  );
}