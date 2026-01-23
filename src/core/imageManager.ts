// =====================================================
// ULTRACLEAN - Image Management Core Logic
// =====================================================

import { supabase } from '@/integrations/supabase/client';
import type { ProductImage, ImageSearchResult, ProductData } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const BUCKET_NAME = 'product-images';

/**
 * Generate a unique filename for storage
 */
const generateStoragePath = (userId: string, productSku: string, index: number): string => {
  const timestamp = Date.now();
  const safeSku = productSku.replace(/[^a-zA-Z0-9-_]/g, '_');
  return `${userId}/${safeSku}/${timestamp}_${index}.webp`;
};

/**
 * Convert image URL to blob
 */
export const urlToBlob = async (url: string): Promise<Blob> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }
  return response.blob();
};

/**
 * Upload image to Supabase Storage
 */
export const uploadImageToStorage = async (
  imageBlob: Blob,
  storagePath: string
): Promise<{ publicUrl: string; storagePath: string }> => {
  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, imageBlob, {
      contentType: 'image/webp',
      upsert: true
    });

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(storagePath);

  return {
    publicUrl: urlData.publicUrl,
    storagePath
  };
};

/**
 * Save image metadata to database
 */
export const saveImageMetadata = async (
  userId: string,
  sessionId: string | null,
  productSku: string,
  productName: string,
  sourceType: 'search' | 'ai_generated' | 'upload',
  originalUrl: string | null,
  storagePath: string,
  publicUrl: string,
  isBackgroundRemoved: boolean = false
): Promise<void> => {
  const { error } = await supabase
    .from('processed_images')
    .insert({
      user_id: userId,
      session_id: sessionId,
      product_sku: productSku,
      product_name: productName,
      source_type: sourceType,
      original_url: originalUrl,
      storage_path: storagePath,
      public_url: publicUrl,
      is_background_removed: isBackgroundRemoved
    });

  if (error) {
    console.error('Error saving image metadata:', error);
    throw new Error(`Failed to save image metadata: ${error.message}`);
  }
};

/**
 * Get all images for a product
 */
export const getProductImages = async (
  userId: string,
  productSku: string
): Promise<ProductImage[]> => {
  const { data, error } = await supabase
    .from('processed_images')
    .select('*')
    .eq('user_id', userId)
    .eq('product_sku', productSku)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching product images:', error);
    return [];
  }

  return data.map(img => ({
    id: img.id,
    url: img.public_url,
    thumbnailUrl: img.public_url,
    source: img.source_type as 'search' | 'ai_generated' | 'upload',
    width: img.width || 1080,
    height: img.height || 1080,
    format: img.format || 'webp',
    isBackgroundRemoved: img.is_background_removed || false,
    originalUrl: img.original_url || undefined
  }));
};

/**
 * Delete image from storage and database
 */
export const deleteProductImage = async (
  imageId: string,
  storagePath: string
): Promise<void> => {
  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([storagePath]);

  if (storageError) {
    console.error('Error deleting from storage:', storageError);
  }

  // Delete from database
  const { error: dbError } = await supabase
    .from('processed_images')
    .delete()
    .eq('id', imageId);

  if (dbError) {
    throw new Error(`Failed to delete image: ${dbError.message}`);
  }
};

/**
 * Process and save multiple images for a product
 */
export const processAndSaveImages = async (
  userId: string,
  sessionId: string | null,
  productSku: string,
  productName: string,
  images: { url: string; source: 'search' | 'ai_generated' | 'upload' }[]
): Promise<string[]> => {
  const savedUrls: string[] = [];

  for (let i = 0; i < images.length; i++) {
    const image = images[i];
    try {
      // Convert URL to blob
      const blob = await urlToBlob(image.url);
      
      // Generate storage path
      const storagePath = generateStoragePath(userId, productSku, i);
      
      // Upload to storage
      const { publicUrl } = await uploadImageToStorage(blob, storagePath);
      
      // Save metadata
      await saveImageMetadata(
        userId,
        sessionId,
        productSku,
        productName,
        image.source,
        image.url,
        storagePath,
        publicUrl
      );
      
      savedUrls.push(publicUrl);
    } catch (error) {
      console.error(`Error processing image ${i}:`, error);
      // Continue with other images
    }
  }

  return savedUrls;
};

/**
 * Update product data with image URLs
 */
export const updateProductImageUrls = (
  data: ProductData[],
  productSku: string,
  imageUrls: string[],
  imageColumn: string = 'URL Imagens Externas',
  skuColumn: string = 'SKU'
): ProductData[] => {
  return data.map(row => {
    const rowSku = String(row[skuColumn] || '').trim();
    if (rowSku === productSku) {
      const existingUrls = String(row[imageColumn] || '').trim();
      const newUrls = imageUrls.join('|');
      return {
        ...row,
        [imageColumn]: existingUrls ? `${existingUrls}|${newUrls}` : newUrls
      };
    }
    return row;
  });
};

/**
 * Mock search images from internet (placeholder for actual API integration)
 * In production, this would call a search API like SerpAPI or similar
 */
export const searchProductImages = async (
  query: string,
  count: number = 6
): Promise<ImageSearchResult> => {
  // This is a placeholder - in production, integrate with a real image search API
  console.log(`Searching for images: ${query}`);
  
  // Return empty result - actual implementation would call an edge function
  return {
    images: [],
    query,
    source: 'placeholder'
  };
};

/**
 * Generate product image using AI (placeholder for actual API integration)
 * In production, this would call the AI gateway with image generation
 */
export const generateProductImage = async (
  productName: string,
  productDescription?: string
): Promise<ProductImage | null> => {
  // This is a placeholder - actual implementation would call an edge function
  console.log(`Generating AI image for: ${productName}`);
  
  return null;
};
