"use client";

import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "./cart-provider";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";

export function FloatingCartButton() {
  const router = useRouter();
  const pathname = usePathname();
  const { getTotalItems } = useCart();
  const { user } = useAuth();
  const cartItemsCount = getTotalItems();

  // ซ่อนเมื่อไม่ได้ login หรืออยู่ในหน้า checkout/cart
  if (!user || pathname === "/checkout" || pathname === "/cart") {
    return null;
  }

  const handleClick = () => {
    if (cartItemsCount > 0) {
      router.push("/checkout");
    } else {
      router.push("/cart");
    }
  };

  return (
    <Button
      size="lg"
      className="fixed bottom-6 right-6 z-[9998] h-14 w-14 rounded-full shadow-lg transition-all hover:scale-110 md:bottom-8 md:right-8"
      onClick={handleClick}
    >
      <div className="relative">
        <ShoppingCart className="h-6 w-6" />
        {cartItemsCount > 0 && (
          <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-xs font-bold text-destructive-foreground shadow-md">
            {cartItemsCount > 99 ? "99+" : cartItemsCount}
          </span>
        )}
      </div>
    </Button>
  );
}

