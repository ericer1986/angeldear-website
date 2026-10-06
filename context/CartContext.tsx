"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

import { Product } from "@/types/product";

type CartItem = {
  product: Product;
  quantity: number;
};

type CartContextType = {
  items: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (
    productId: string,
    quantity: number
  ) => void;
  clearCart: () => void;
};

const CartContext =
  createContext<CartContextType | undefined>(
    undefined
  );

export function CartProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Load cart from browser
  useEffect(() => {
    try {
      const savedCart =
        localStorage.getItem("angel-dear-cart");

      if (savedCart) {
        const parsedCart = JSON.parse(savedCart);

        if (Array.isArray(parsedCart)) {
          setItems(parsedCart);
        }
      }
    } catch (error) {
      console.error(
        "Failed to load cart:",
        error
      );

      localStorage.removeItem(
        "angel-dear-cart"
      );
    }

    setLoaded(true);
  }, []);

  // Save cart to browser
  useEffect(() => {
    if (!loaded) return;

    try {
      localStorage.setItem(
        "angel-dear-cart",
        JSON.stringify(items)
      );
    } catch (error) {
      console.error(
        "Failed to save cart:",
        error
      );
    }
  }, [items, loaded]);

  function addToCart(product: Product) {
    const stock = Math.max(
      0,
      Number(product.stock) || 0
    );

    // Do not add out-of-stock products.
    if (stock <= 0) {
      return;
    }

    setItems((currentItems) => {
      const existingItem =
        currentItems.find(
          (item) =>
            item.product.id === product.id
        );

      if (existingItem) {
        // Never allow cart quantity above
        // the known product stock.
        if (
          existingItem.quantity >= stock
        ) {
          return currentItems;
        }

        return currentItems.map((item) =>
          item.product.id === product.id
            ? {
                ...item,

                // Refresh product information
                // with the latest product data.
                product,

                quantity: Math.min(
                  item.quantity + 1,
                  stock
                ),
              }
            : item
        );
      }

      return [
        ...currentItems,
        {
          product,
          quantity: 1,
        },
      ];
    });
  }

  function removeFromCart(
    productId: string
  ) {
    setItems((currentItems) =>
      currentItems.filter(
        (item) =>
          item.product.id !== productId
      )
    );
  }

  function updateQuantity(
    productId: string,
    quantity: number
  ) {
    if (
      !Number.isFinite(quantity) ||
      quantity <= 0
    ) {
      removeFromCart(productId);
      return;
    }

    setItems((currentItems) =>
      currentItems.map((item) => {
        if (
          item.product.id !== productId
        ) {
          return item;
        }

        const stock = Math.max(
          0,
          Number(item.product.stock) || 0
        );

        // Product is no longer available.
        if (stock <= 0) {
          return {
            ...item,
            quantity: 0,
          };
        }

        return {
          ...item,
          quantity: Math.min(
            Math.max(
              1,
              Math.floor(quantity)
            ),
            stock
          ),
        };
      }).filter(
        (item) => item.quantity > 0
      )
    );
  }

  function clearCart() {
    setItems([]);
  }

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context =
    useContext(CartContext);

  if (!context) {
    throw new Error(
      "useCart must be used inside CartProvider"
    );
  }

  return context;
}