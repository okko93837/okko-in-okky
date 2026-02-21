export type ClothingCategory = 'top' | 'bottom' | 'dress' | 'shoes';

export interface ClothingItem {
  id: string;
  user_id: string;
  category: ClothingCategory;
  image_url: string;
  material: string;
  color: string;
  created_at: string;
}

export interface PresetModel {
  id: string;
  name: string;
  body_type: string;
  image_url: string;
}

export interface Outfit {
  id: string;
  user_id: string;
  top_id: string;
  bottom_id: string;
  shoes_id: string;
  preset_model_id: string;
  generated_image_url: string;
  created_at: string;
}

// ── Pipeline Types ──

export type PipelineStep =
  | 'idle'
  | 'uploading'
  | 'blurring'
  | 'blur_preview'
  | 'segmenting'
  | 'segment_review'
  | 'processing_items'
  | 'saving'
  | 'complete'
  | 'error';

export type ItemProcessStep =
  | 'pending'
  | 'removing_bg'
  | 'analyzing_material'
  | 'generating_product_shot'
  | 'done';

export interface ItemState {
  category: ClothingCategory;
  croppedDataUrl: string;
  polygons: number[];
  box: number[];
  score: number;
  processStep: ItemProcessStep;
  noBgDataUrl?: string;
  material?: string;
  color?: string;
  productShotDataUrl?: string;
}

export interface MaterialInfo {
  material: string;
  color: string;
}

export interface ProcessedItem {
  category: ClothingCategory;
  segmentedDataUrl: string;
  noBgDataUrl: string;
  material: string;
  color: string;
  productShotDataUrl: string;
}

export interface PipelineState {
  step: PipelineStep;
  originalDataUrl: string | null;
  blurredDataUrl: string | null;
  items: ItemState[];
  processedItems: ProcessedItem[];
  currentItemIndex: number;
  errorMessage: string | null;
  errorStep: PipelineStep | null;
}

// ── API Request / Response Types ──

export interface SegmentResult {
  category: ClothingCategory;
  imageBase64: string;
  polygons: number[];
  box: number[];
  score: number;
}

export interface SegmentResponse {
  segments: SegmentResult[];
}

export interface MaterialResponse {
  material: string;
  color: string;
}

export interface ProductShotResponse {
  imageBase64: string;
}

export interface SaveRequest {
  category: ClothingCategory;
  imageBase64: string;
  material: string;
  color: string;
  userId: string;
}

export interface SaveResponse {
  item: ClothingItem;
}
