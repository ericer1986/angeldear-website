export interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string;
  brand: string;
  category: string;
  price: number;
  image: string;
  description: string;
  stock: number;
  featured: boolean;
}