export type FoodType = 'VEG' | 'NONVEG' | 'EGG' | 'VEGAN';

export interface Category {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  sortOrder: number;
  active: boolean;
}

export interface Variant {
  id: string;
  menuItemId: string;
  name: string;
  priceDelta: string;
  sortOrder: number;
  active: boolean;
}

export interface Modifier {
  id: string;
  groupId: string;
  name: string;
  priceDelta: string;
  active: boolean;
}

export interface ModifierGroup {
  id: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  required: boolean;
  options: Modifier[];
  _count?: { itemLinks: number };
}

export interface MenuItemModifierLink {
  menuItemId: string;
  groupId: string;
  group: ModifierGroup;
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  categoryId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  basePrice: string;
  taxRate: string;
  foodType: FoodType;
  available: boolean;
  isRecommended: boolean;
  sortOrder: number;
  preparationMins: number | null;
  category: { id: string; name: string };
  variants: Variant[];
  modifierLinks: MenuItemModifierLink[];
}
