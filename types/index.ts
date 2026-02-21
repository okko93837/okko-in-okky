export type ClothingCategory = 'top' | 'bottom' | 'shoes';

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
