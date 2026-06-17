import { motion } from 'motion/react';
import { X, Trash2, Key, ShoppingBag, CreditCard } from 'lucide-react';
import { CartItem } from '../types';

interface CartSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (index: number, quantity: number) => void;
  onRemoveItem: (index: number) => void;
  onProceedToCheckout: () => void;
}

export default function CartSidebar({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onProceedToCheckout
}: CartSidebarProps) {
  if (!isOpen) return null;

  const total = cartItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />

      {/* Sliding chassis */}
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          className="w-screen max-w-md bg-black border-l border-neutral-900 shadow-2xl flex flex-col justify-between"
        >
          {/* Header */}
          <div className="py-6 px-4 sm:px-6 border-b border-neutral-950 bg-neutral-950 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[#FF6A00]" />
              <h2 className="font-sans font-black tracking-widest text-sm text-white uppercase">
                COUTURE CART ({cartItems.length})
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 border border-neutral-800 hover:border-[#FF6A00] text-neutral-400 hover:text-white cursor-pointer transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart item listings */}
          <div className="flex-1 overflow-y-auto py-6 px-4 sm:px-6 space-y-6">
            {cartItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                <div className="p-4 border border-dashed border-neutral-800 text-neutral-600">
                  <ShoppingBag className="w-12 h-12" />
                </div>
                <p className="font-sans font-extrabold text-[#FF6A00] tracking-widest uppercase text-xs">
                  CART STATUS: DRY
                </p>
                <p className="font-mono text-[10px] text-neutral-500 max-w-xs uppercase leading-relaxed">
                  Your luxury e-commerce selection is empty. Unlock streetwear layers to make your statement.
                </p>
                <button
                  onClick={onClose}
                  className="mt-4 px-6 py-2.5 bg-white text-black font-sans font-extrabold text-[10px] tracking-widest uppercase hover:bg-[#FF6A00] transition-colors cursor-pointer"
                >
                  START BROWSING
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {cartItems.map((item, index) => (
                  <div
                    key={`${item.product.id}-${index}`}
                    className="flex items-center gap-4 py-4 border-b border-neutral-900 bg-neutral-950/20 px-3 relative group"
                  >
                    {/* Compact Image */}
                    <div className="w-20 aspect-[3/4] bg-neutral-900 border border-neutral-900 flex-none overflow-hidden relative">
                      <img
                        src={item.product.images[0]}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    {/* Metadata descriptors */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-sans font-extrabold text-xs tracking-wider text-white uppercase line-clamp-1">
                        {item.product.name}
                      </h4>
                      <p className="font-mono text-[9px] text-[#FF6A00] tracking-wider uppercase mt-1">
                        SIZE: {item.selectedSize} // COLOR: {item.selectedColor}
                      </p>

                      {/* Pricing + Adjustors */}
                      <div className="flex items-center justify-between mt-3">
                        {/* Stepper adjustment buttons */}
                        <div className="flex items-center border border-neutral-800 bg-black">
                          <button
                            onClick={() => onUpdateQuantity(index, item.quantity - 1)}
                            className="px-2 py-1 text-neutral-400 hover:text-white font-black text-xs cursor-pointer focus:outline-none"
                          >
                            -
                          </button>
                          <span className="px-3 py-1 font-mono text-xs text-white bg-neutral-950 border-l border-r border-neutral-800">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => onUpdateQuantity(index, item.quantity + 1)}
                            className="px-2 py-1 text-neutral-400 hover:text-white font-black text-xs cursor-pointer focus:outline-none"
                          >
                            +
                          </button>
                        </div>

                        {/* Line calculation sum representation */}
                        <span className="font-sans font-black text-sm text-white">
                          {item.product.price * item.quantity} EGP
                        </span>
                      </div>
                    </div>

                    {/* Deletion control */}
                    <button
                      onClick={() => onRemoveItem(index)}
                      className="absolute top-2 right-2 p-1 text-neutral-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                      title="Remove Layer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Checkout triggers panel */}
          {cartItems.length > 0 && (
            <div className="bg-neutral-950 p-6 border-t border-neutral-900 font-sans">
              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center text-xs tracking-widest text-[#a3a3a3]">
                  <span>SUBTOTAL AMOUNT:</span>
                  <span>{total} EGP</span>
                </div>
                <div className="flex justify-between items-center text-xs tracking-widest text-neutral-500">
                  <span>SHIPPING (EGYPT):</span>
                  <span className="text-emerald-500 font-black">PROMO FREE</span>
                </div>
                <div className="h-[1px] bg-neutral-900 my-2" />
                <div className="flex justify-between items-center font-sans font-black text-sm text-white tracking-widest">
                  <span>TOTAL INVESTMENT:</span>
                  <span className="text-[#FF6A00] text-base">{total} EGP</span>
                </div>
              </div>

              {/* Secure warning badge */}
              <div className="flex items-center gap-2 mb-4 p-2.5 border border-dashed border-zinc-800 bg-black">
                <Key className="w-4 h-4 text-[#FF6A00]" />
                <p className="font-mono text-[8px] text-neutral-400 tracking-wider uppercase leading-snug">
                  MOBILE WALLET & INSTAPAY SECURE GATEWAYS ONLY
                </p>
              </div>

              {/* Direct transaction step submit trigger */}
              <button
                onClick={onProceedToCheckout}
                className="w-full bg-[#FF6A00] text-black font-sans font-black tracking-widest text-xs py-4 flex items-center justify-center gap-2 relative overflow-hidden group hover:shadow-[0_0_20px_#FF6A00] transition-all cursor-pointer rounded-none"
              >
                <CreditCard className="w-4 h-4" /> PROCEED TO CHEQUE OUT
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
