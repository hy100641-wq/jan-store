import { motion } from 'motion/react';
import { ShoppingBag, Heart, Shield, Menu, X, ArrowUpRight } from 'lucide-react';
import { useState } from 'react';

interface HeaderProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
  cartCount: number;
  wishlistCount: number;
  onOpenCart: () => void;
  announcementText?: string;
  whatsAppLink?: string;
}

export default function Header({
  currentPage,
  setCurrentPage,
  cartCount,
  wishlistCount,
  onOpenCart,
  announcementText = "🔥 FAST SECURE SHIPPING IN EGYPT • INSTAPAY & WALLET PAYMENTS",
  whatsAppLink = "https://wa.me/201144585584"
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'home', label: 'HOME' },
    { id: 'shop', label: 'SHOP COUTURE' },
    { id: 'contact', label: 'CONNECT' }
  ];

  return (
    <header className="w-full fixed top-0 z-40 bg-black/90 backdrop-blur-md border-b border-neutral-900">
      {/* Tilted neon ticker bar */}
      <div className="w-full bg-[#FF6A00] py-1.5 overflow-hidden text-black font-sans font-black text-[10px] tracking-[0.2em] uppercase text-center relative z-10">
        <div className="inline-block animate-marquee whitespace-nowrap px-4 select-none">
          {announcementText} &nbsp;&nbsp; • &nbsp;&nbsp; {announcementText}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        {/* Logo and signature */}
        <div className="flex items-center gap-12">
          <button
            onClick={() => setCurrentPage('home')}
            className="flex items-baseline gap-1 group focus:outline-none"
          >
            <span className="text-4xl font-black tracking-tighter text-white transition-colors group-hover:text-[#FF6A00]">JAN</span>
            <span className="text-sm font-black text-[#FF6A00] uppercase tracking-widest">Store</span>
          </button>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8">
            {navItems.map((item) => {
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentPage(item.id)}
                  className="relative text-[11px] tracking-[0.25em] font-black uppercase transition-all py-1.5 cursor-pointer focus:outline-none"
                >
                  <span className={isActive ? "text-[#FF6A00]" : "text-neutral-400 hover:text-[#FF6A00]"}>
                    {item.label}
                  </span>
                  {isActive && (
                    <motion.div
                      layoutId="activeNavLine"
                      className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#FF6A00] shadow-[0_0_8px_#FF6A00]"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Action Widgets Toolbar */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Wishlist Button */}
          <button
            onClick={() => setCurrentPage('wishlist')}
            className="p-2 text-neutral-400 hover:text-[#FF6A00] transition-colors relative cursor-pointer"
            title="Wishlist"
          >
            <Heart className={`w-5 h-5 ${currentPage === 'wishlist' ? 'fill-[#FF6A00] text-[#FF6A00]' : ''}`} />
            {wishlistCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-[#FF6A00] text-black font-sans font-black text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center border border-black shadow-[0_0_4px_#FF6A00]">
                {wishlistCount}
              </span>
            )}
          </button>

          {/* Cart Bag Button */}
          <button
            onClick={onOpenCart}
            className="p-2 text-neutral-400 hover:text-white transition-colors relative cursor-pointer"
            title="Shopping Cart"
          >
            <ShoppingBag className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-[#FF6A00] text-black font-sans font-black text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center border border-black shadow-[0_0_4px_#FF6A00]">
                {cartCount}
              </span>
            )}
          </button>

          {/* Super Admin Dashboard Login Trigger */}
          <button
            onClick={() => setCurrentPage('admin')}
            className={`flex items-center gap-1.5 px-3 py-1.5 border text-[10px] tracking-wider uppercase font-bold transition-all relative overflow-hidden group cursor-pointer ${
              currentPage === 'admin'
                ? 'bg-orange-500/10 border-[#FF6A00] text-[#FF6A00] shadow-[0_0_10px_rgba(255,106,0,0.15)]'
                : 'border-neutral-800 text-neutral-400 hover:border-neutral-600 hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">CONTROL PANEL</span>
          </button>

          {/* Mobile Hamburguer Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="md:hidden bg-neutral-950 border-b border-neutral-900 px-6 py-8"
        >
          <div className="flex flex-col gap-6">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentPage(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`text-sm tracking-widest font-black uppercase text-left py-1 cursor-pointer ${
                  currentPage === item.id ? 'text-[#FF6A00]' : 'text-neutral-300 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
            <div className="h-[1px] bg-neutral-900 my-2" />
            
            {/* Quick whatsapp CTA */}
            <a
              href={whatsAppLink}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between text-neutral-400 hover:text-white mt-1 text-[11px] tracking-widest uppercase font-mono"
            >
              <span>DIRECT WHATSAPP LIVE</span>
              <ArrowUpRight className="w-4 h-4 text-[#FF6A00]" />
            </a>
          </div>
        </motion.div>
      )}
    </header>
  );
}
