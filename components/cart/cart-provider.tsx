"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode
} from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/auth/auth-provider";
import { useAlert } from "@/lib/alert";

type CartItem = {
  id: number;
  product_id: number;
  quantity: number;
  product: {
    id: number;
    name: string;
    price: number;
    image_url: string | null;
    stock: number;
  };
};

type CartContextValue = {
  items: CartItem[];
  loading: boolean;
  addToCart: (productId: number, quantity: number) => Promise<void>;
  removeFromCart: (cartItemId: number) => Promise<void>;
  updateQuantity: (cartItemId: number, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  refreshCart: () => Promise<void>;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadCart() {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("cart_items")
      .select(
        `
        id,
        product_id,
        quantity,
        product:products(id, name, price, image_url, stock)
      `
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading cart:", error);
      setItems([]);
    } else {
      setItems(
        (data as any[])?.map((item) => ({
          id: item.id,
          product_id: item.product_id,
          quantity: item.quantity,
          product: item.product
        })) || []
      );
    }
    setLoading(false);
  }

  useEffect(() => {
    loadCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function addToCart(productId: number, quantity: number) {
    if (!user) {
      await showAlert("กรุณาเข้าสู่ระบบก่อนเพิ่มสินค้าในตะกร้า", {
        title: "แจ้งเตือน"
      });
      return;
    }

    // ตรวจสอบว่ามีสินค้านี้ในตะกร้าแล้วหรือไม่
    const existingItem = items.find((item) => item.product_id === productId);

    if (existingItem) {
      // อัปเดตจำนวน
      await updateQuantity(existingItem.id, existingItem.quantity + quantity);
    } else {
      // เพิ่มใหม่
      const { error } = await supabase.from("cart_items").insert({
        user_id: user.id,
        product_id: productId,
        quantity: quantity
      });

      if (error) {
        console.error("Error adding to cart:", error);
        await showAlert("ไม่สามารถเพิ่มสินค้าในตะกร้าได้", {
          title: "เกิดข้อผิดพลาด"
        });
      } else {
        await loadCart();
      }
    }
  }

  async function removeFromCart(cartItemId: number) {
    const { error } = await supabase
      .from("cart_items")
      .delete()
      .eq("id", cartItemId);

    if (error) {
      console.error("Error removing from cart:", error);
      await showAlert("ไม่สามารถลบสินค้าจากตะกร้าได้", {
        title: "เกิดข้อผิดพลาด"
      });
    } else {
      await loadCart();
    }
  }

  async function updateQuantity(cartItemId: number, quantity: number) {
    if (quantity <= 0) {
      await removeFromCart(cartItemId);
      return;
    }

    const { error } = await supabase
      .from("cart_items")
      .update({ quantity })
      .eq("id", cartItemId);

    if (error) {
      console.error("Error updating quantity:", error);
      await showAlert("ไม่สามารถอัปเดตจำนวนสินค้าได้", {
        title: "เกิดข้อผิดพลาด"
      });
    } else {
      await loadCart();
    }
  }

  async function clearCart() {
    if (!user) return;

    const { error } = await supabase
      .from("cart_items")
      .delete()
      .eq("user_id", user.id);

    if (error) {
      console.error("Error clearing cart:", error);
      await showAlert("ไม่สามารถล้างตะกร้าได้", {
        title: "เกิดข้อผิดพลาด"
      });
    } else {
      await loadCart();
    }
  }

  function getTotalItems() {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }

  function getTotalPrice() {
    return items.reduce(
      (sum, item) => sum + Number(item.product.price) * item.quantity,
      0
    );
  }

  return (
    <CartContext.Provider
      value={{
        items,
        loading,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getTotalItems,
        getTotalPrice,
        refreshCart: loadCart
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within CartProvider");
  }
  return ctx;
}

