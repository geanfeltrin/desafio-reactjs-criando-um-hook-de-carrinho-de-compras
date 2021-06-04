import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const updateCart = [...cart];
      const hasProductInCart = updateCart.find(
        (productInCart) => productInCart.id === productId
      );

      if (hasProductInCart) {
        const { data: stockProductData } = await api.get<Stock>(
          `/stock/${productId}`
        );

        const stockAmount = stockProductData.amount;
        const productAmount = hasProductInCart.amount;
        const currentAmount = productAmount + 1;

        if (currentAmount > stockAmount) {
          toast.error("Quantidade solicitada fora de estoque");
          return;
        }

        hasProductInCart.amount = currentAmount;
      } else {
        const { data: productData } = await api.get(`/products/${productId}`);
        const newProduct = {
          ...productData,
          amount: 1,
        };
        updateCart.push(newProduct);
      }
      setCart(updateCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(updateCart));
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const hasProductInCart = cart.find((product) => product.id === productId);

      if (!hasProductInCart) {
        throw Error("Erro na remoção do produto");
      }

      setCart((prevState) => {
        const filterProduct = prevState.filter(
          (product) => product.id !== productId
        );

        localStorage.setItem(
          "@RocketShoes:cart",
          JSON.stringify(filterProduct)
        );

        return [...filterProduct];
      });
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const hasProductInCart = cart.find((product) => product.id === productId);

      if (!hasProductInCart || amount < 1) {
        toast.error("Erro na alteração de quantidade do produto");
        return;
      }

      const { data: stockProductData } = await api.get<Stock>(
        `/stock/${productId}`
      );
      const stockAmount = stockProductData.amount;

      if (amount > stockAmount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      setCart((prevState) => {
        const findProduct = prevState.findIndex(
          (product) => product.id === productId
        );
        prevState[findProduct].amount = amount;
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(prevState));

        return [...prevState];
      });
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
