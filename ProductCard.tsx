import { motion } from 'motion/react';
import { Product } from '../types';
import { ShoppingBag, Eye, Heart } from 'lucide-react';

interface ProductCardProps {
  key?: string | number;
  product: Product;
  onSelect: (product: Product) => void;
  onAddToCartDirect?: (product: Product) => void;
  isWishlisted: boolean;
  onToggleWishlist: (product: Product) => void;
}

export default function ProductCard({
  product,
  onSelect,
  onAddToCartDirect,
  isWishlisted,
  onToggleWishlist
}: ProductCardProps) {
  const discountAmount = product.originalPrice ? product.originalPrice - product.price : 0;
  const discountPercent = product.originalPrice ? Math.round((discountAmount / product.originalPrice) * 100) : 0;

  return (
    <motion.div
      id={`product-card-${product.id}`}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6 }}
      className="group bg-neutral-950 border border-neutral-900 overflow-hidden relative flex flex-col justify-between"
    >
      {/* Absolute Badges */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        {/* Category tag */}
        <span className="bg-black/90 text-white border border-neutral-800 text-[9px] tracking-widest uppercase py-1 px-2.5 font-mono font-bold">
          {product.category}
        </span>
        
        {/* Discount Tag */}
        {product.originalPrice && (
          <span className="bg-[#FF6A00] text-black text-[9px] tracking-wider uppercase py-1 px-2.5 font-sans font-black">
            -{discountPercent}% OFF
          </span>
        )}
      </div>

      {/* Wishlist interactive top-right action */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleWishlist(product);
        }}
        className="absolute top-4 right-4 z-10 p-2 bg-black/80 hover:bg-black border border-neutral-800 hover:border-[#FF6A00] text-neutral-400 hover:text-white transition-all cursor-pointer shadow-lg rounded-none"
      >
        <Heart className={`w-4 h-4 ${isWishlisted ? "fill-[#FF6A00] text-[#FF6A00]" : ""}`} />
      </button>

      {/* Photo Frame */}
      <div 
        onClick={() => onSelect(product)}
        className="relative aspect-[3/4] overflow-hidden bg-neutral-900 cursor-pointer"
      >
        {/* Zooming background image */}
        <img
          src={product.images[0]}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          referrerPolicy="no-referrer"
        />

        {/* Hover technical grid overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect(product);
            }}
            className="p-3.5 bg-[#FF6A00] text-black font-bold uppercase tracking-widest text-xs hover:bg-[#FF6A00]/90 transition-all flex items-center gap-2 shadow-[0_0_15px_#FF6A00] rounded-none cursor-pointer"
          >
            <Eye className="w-4 h-4" /> CHOOSE SIZE
          </button>
        </div>

        {/* Brand visual coordinates accent in light grey */}
        <div className="absolute bottom-2 left-3 font-mono text-[8px] text-neutral-500 opacity-0 group-hover:opacity-100 transition-opacity">
          TYPE: {product.type.toUpperCase()} // STOCK: {product.stock}
        </div>
      </div>

      {/* Product Details Section */}
      <div className="p-5 border-t border-neutral-900 bg-neutral-950/80 flex-1 flex flex-col justify-between">
        <div>
          {/* Brand identifier type label */}
          <div className="text-[10px] uppercase font-mono font-bold tracking-[0.2em] text-neutral-500 mb-1 flex items-center justify-between">
            <span>JAN // {product.type}</span>
            {product.stock <= 5 && (
              <span className="text-[#FF6A00] font-sans text-[9px] font-black animate-pulse">LOW STOCK</span>
            )}
          </div>
          
          <h3 
            onClick={() => onSelect(product)}
            className="font-sans font-extrabold text-sm text-white tracking-widest leading-snug hover:text-[#FF6A00] transition-colors cursor-pointer uppercase line-clamp-1"
          >
            {product.name}
          </h3>
        </div>

        {/* Prices and bottom buy layout drawer */}
        <div className="flex items-end justify-between mt-4">
          <div className="flex flex-col">
            {product.originalPrice && (
              <span className="text-neutral-500 line-through text-xs font-sans font-bold">
                {product.originalPrice} EGP
              </span>
            )}
            <span className="text-white font-sans font-black text-sm tracking-wide">
              {product.price} EGP
            </span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect(product); // Route to detailing page for mandatory size selection
            }}
            className="p-2.5 border border-neutral-800 group-hover:border-[#FF6A00] group-hover:bg-[#FF6A00] group-hover:text-black hover:shadow-[0_0_10px_#FF6A00] transition-all cursor-pointer rounded-none text-neutral-400 group-hover:animate-none"
            title="Choose Size and Buy"
          >
            <ShoppingBag className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
