import React, { createContext, useContext } from 'react';

const PriceContext = createContext();

export const usePrice = () => {
  const context = useContext(PriceContext);
  if (!context) {
    throw new Error('usePrice must be used within a PriceProvider');
  }
  return context;
};

export const useDiscount = usePrice;

export const PriceProvider = ({ children, user }) => {
  const isAdmin = user?.isSpecialAdmin === true;
  const DISCOUNT_RATE = 0.4;

  const applyDiscount = (price) => {
    if (!isAdmin) return price;
    return price * (1 - DISCOUNT_RATE);
  };

  const getDiscountedSellPrice = (product) => {
    if (!isAdmin) return product.sell;
    return product.sell * (1 - DISCOUNT_RATE);
  };

  const getDiscountedPrice = (price) => {
    if (!isAdmin) return price;
    return Math.round(price * (1 - DISCOUNT_RATE) * 100) / 100;
  };

  const getDiscountedProfit = (cost, sellPrice) => {
    if (!isAdmin) {
      return sellPrice - cost;
    }
    const discountedSell = sellPrice * (1 - DISCOUNT_RATE);
    return discountedSell - cost;
  };

  const getDiscountedMargin = (cost, sellPrice) => {
    if (!isAdmin) {
      return (((sellPrice - cost) / cost) * 100).toFixed(1);
    }
    const discountedSell = sellPrice * (1 - DISCOUNT_RATE);
    return (((discountedSell - cost) / cost) * 100).toFixed(1);
  };

  return (
    <PriceContext.Provider
      value={{
        isAdmin,
        DISCOUNT_RATE,
        applyDiscount,
        getDiscountedSellPrice,
        getDiscountedPrice,
        getDiscountedProfit,
        getDiscountedMargin,
      }}
    >
      {children}
    </PriceContext.Provider>
  );
};