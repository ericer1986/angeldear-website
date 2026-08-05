export interface Product {
  id: string;
  name: string;
  slug: string;
  brand: string;
  category: string;
  price: number;
  compare_price: number;
  image: string;
  description: string;
  stock: number;
  featured: boolean;
  active: boolean;
  created_at: string;
}