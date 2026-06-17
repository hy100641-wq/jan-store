import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db, handleFirestoreError, OperationType, cleanDocData } from './firebase';
import { collection, getDocs, addDoc, doc, setDoc, getDoc, updateDoc, onSnapshot, query, where, deleteDoc } from 'firebase/firestore';
import { Product, CartItem, Order, Customer, Message, HomepageConfig, Review } from './types';
import { INITIAL_PRODUCTS, DEFAULT_HOMEPAGE_CONFIG, INSTAPAY_WALLET_INFO } from './data';

// Component Imports
import SplashLoader from './components/SplashLoader';
import Header from './components/Header';
import Footer from './components/Footer';
import ProductCard from './components/ProductCard';
import CartSidebar from './components/CartSidebar';
import BannerSlider from './components/BannerSlider';
import AdminSection from './components/AdminSection';

// Lucide icon imports
import { Sparkles, MessageSquare, ArrowRight, Star, Heart, Check, Trash2, Camera, Compass, Phone, ShieldAlert, CheckCircle, Info } from 'lucide-react';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<string>('home'); // home, shop, about, contact, admin, wishlist, checkout
  
  // Background Ambient Music states
  const [isMusicMuted, setIsMusicMuted] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Premium soft luxury chill background track
    const audio = new Audio("https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3");
    audio.loop = true;
    audio.volume = 0.12; // Soft volume by default
    audioRef.current = audio;

    const handleAutoplayInitiation = () => {
      if (audioRef.current) {
        audioRef.current.play()
          .then(() => {
            setIsMusicMuted(false);
          })
          .catch((e) => {
            console.warn("Autoplay block bypass attempted: ", e);
          });
      }
      window.removeEventListener('click', handleAutoplayInitiation);
      window.removeEventListener('scroll', handleAutoplayInitiation);
    };

    window.addEventListener('click', handleAutoplayInitiation);
    window.addEventListener('scroll', handleAutoplayInitiation);

    return () => {
      audio.pause();
      window.removeEventListener('click', handleAutoplayInitiation);
      window.removeEventListener('scroll', handleAutoplayInitiation);
    };
  }, []);

  const handleToggleMute = () => {
    if (!audioRef.current) return;
    if (isMusicMuted) {
      audioRef.current.play()
        .then(() => setIsMusicMuted(false))
        .catch((e) => console.warn(e));
    } else {
      audioRef.current.pause();
      setIsMusicMuted(true);
    }
  };
  
  // E-commerce states
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Dynamic Content state configs
  const [homepageConfig, setHomepageConfig] = useState<HomepageConfig>(DEFAULT_HOMEPAGE_CONFIG);

  // Filter terms in Shop View
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedSector, setSelectedSector] = useState<'ALL' | 'clothes' | 'shoes'>('ALL');
  const [selectedSize, setSelectedSize] = useState<string>('ALL');
  const [priceRange, setPriceRange] = useState<number>(6000);

  // Detail View Active Selectors
  const [activeSize, setActiveSize] = useState<string>('');
  const [activeColor, setActiveColor] = useState<string>('');

  // Checkout Multi-step Form State
  const [checkoutStep, setCheckoutStep] = useState<1 | 2>(1); // 1: Delivery detail, 2: Screenshot proof
  const [checkoutForm, setCheckoutForm] = useState({
    name: '',
    phone: '',
    address: '',
    paymentMethod: 'wallet' as 'wallet' | 'instapay',
    screenshotBase64: '',
    paymentSenderNumber: ''
  });
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [constructedOrderSuccess, setConstructedOrderSuccess] = useState<Order | null>(null);

  // Dynamic Coupon State variables
  const [coupons, setCoupons] = useState<any[]>([]);
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);
  const [couponError, setCouponError] = useState('');

  // Contact Message Form State
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [messageSuccess, setMessageSuccess] = useState(false);

  // Product Review Form states
  const [reviewAuthorName, setReviewAuthorName] = useState('');
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Load catalogs and synchronize seeding
  const loadDatabaseData = async () => {
    let activeConf = DEFAULT_HOMEPAGE_CONFIG;
    let activeProducts: Product[] = [];

    // 1. Fetch homepage configs
    try {
      const configSnap = await getDocs(collection(db, 'config'));
      let foundConfig = false;
      configSnap.forEach((doc) => {
        if (doc.id === 'homepage') {
          activeConf = doc.data() as HomepageConfig;
          foundConfig = true;
        }
      });
      if (!foundConfig) {
        // Auto-configure default layout if none exists
        try {
          await setDoc(doc(db, 'config', 'homepage'), DEFAULT_HOMEPAGE_CONFIG);
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, 'config/homepage');
        }
      }
      setHomepageConfig(activeConf);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'config');
    }
  };

  useEffect(() => {
    loadDatabaseData();

    // Real-time stream for products (Requirement 1 & 5)
    console.log("[DEBUG MODE] Initializing real-time onSnapshot listener for products collection.");
    const unsubscribeProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      console.log(`[DEBUG MODE] Received products snapshot update with ${snapshot.size} document(s).`);
      const activeProducts: Product[] = [];
      const seenIds = new Set<string>();

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const id = docSnap.id; // Always use docSnap.id (Requirement 1)
        
        if (!seenIds.has(id)) {
          seenIds.add(id);
          activeProducts.push({ ...data, id } as Product);
        } else {
          console.warn(`[DEBUG MODE] Duplicate product ID encountered and skipped: ${id}`);
        }
      });
      // Sort newest products first for premium catalog experience
      activeProducts.sort((a, b) => b.createdAt - a.createdAt);
      console.log(`[DEBUG MODE] Setting products state with ${activeProducts.length} unique items.`);
      setProducts(activeProducts);
    }, (err) => {
      console.error("[DEBUG MODE] Error listening to products collection:", err);
    });

    // Real-time stream for coupons (Requirement 3)
    const unsubscribeCoupons = onSnapshot(collection(db, 'coupons'), (snapshot) => {
      const activeCoupons: any[] = [];
      const seenCoupons = new Set<string>();
      snapshot.forEach((docSnap) => {
        const id = docSnap.id;
        if (!seenCoupons.has(id)) {
          seenCoupons.add(id);
          activeCoupons.push({ ...docSnap.data(), id });
        }
      });
      setCoupons(activeCoupons);
    }, (err) => {
      console.error("[DEBUG MODE] Error listening to coupons collection:", err);
    });

    // Real-time stream for reviews (Requirement 2)
    const unsubscribeReviews = onSnapshot(collection(db, 'reviews'), (snapshot) => {
      const activeReviews: Review[] = [];
      const seenReviews = new Set<string>();
      snapshot.forEach((docSnap) => {
        const id = docSnap.id;
        if (!seenReviews.has(id)) {
          seenReviews.add(id);
          activeReviews.push({ ...docSnap.data(), id } as Review);
        }
      });
      setReviews(activeReviews);
    }, (err) => {
      console.error("[DEBUG MODE] Error listening to reviews collection:", err);
    });

    // Cache retrievals
    const savedCart = localStorage.getItem('jan_store_cart');
    const savedWish = localStorage.getItem('jan_store_wishlist');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (err) {
        console.warn("Could not reload cart string", err);
      }
    }
    if (savedWish) {
      try {
        setWishlist(JSON.parse(savedWish));
      } catch (err) {
        console.warn("Could not reload wishlist string", err);
      }
    }

    return () => {
      unsubscribeProducts();
      unsubscribeCoupons();
      unsubscribeReviews();
    };
  }, []);

  // Synchronization helpers
  const syncCartLocalStorage = (newCart: CartItem[]) => {
    setCart(newCart);
    localStorage.setItem('jan_store_cart', JSON.stringify(newCart));
  };

  const syncWishlistLocalStorage = (newWish: Product[]) => {
    setWishlist(newWish);
    localStorage.setItem('jan_store_wishlist', JSON.stringify(newWish));
  };

  // Cart operations
  const handleAddToCart = (product: Product, size: string, color: string, qty: number = 1) => {
    if (!size) {
      alert("PLEASE SELECT YOUR SIZE BRACKET BEFORE CARING FOR LAYERS.");
      return;
    }
    const isSizeOutOfStock = product.sizeStock !== undefined 
      ? (product.sizeStock[size] || 0) <= 0 
      : product.stock <= 0;
    if (isSizeOutOfStock) {
      alert("SORRY, THE SELECTED SIZE IS CURRENTLY OUT OF STOCK.");
      return;
    }

    if (!color) {
      color = product.colors[0];
    }

    const existingIdx = cart.findIndex(
      (item) =>
        item.product.id === product.id &&
        item.selectedSize === size &&
        item.selectedColor === color
    );

    const updatedCart = [...cart];
    if (existingIdx > -1) {
      updatedCart[existingIdx].quantity += qty;
    } else {
      updatedCart.push({
        product,
        selectedSize: size,
        selectedColor: color,
        quantity: qty
      });
    }

    syncCartLocalStorage(updatedCart);
    setIsCartOpen(true);
    // Dismiss selected product details trigger
    setSelectedProduct(null);
  };

  const handleUpdateCartQuantity = (idx: number, qty: number) => {
    if (qty < 1) return;
    const updated = [...cart];
    updated[idx].quantity = qty;
    syncCartLocalStorage(updated);
  };

  const handleRemoveCartItem = (idx: number) => {
    const updated = cart.filter((_, i) => i !== idx);
    syncCartLocalStorage(updated);
  };

  // Wishlist operations
  const handleToggleWishlist = (product: Product) => {
    const exist = wishlist.some((p) => p.id === product.id);
    let updated: Product[];
    if (exist) {
      updated = wishlist.filter((p) => p.id !== product.id);
    } else {
      updated = [...wishlist, product];
    }
    syncWishlistLocalStorage(updated);
  };

  // Detail View initializations
  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    // Find first size in stock
    const firstInStock = product.sizes.find(s => {
      const isSizeOutOfStock = product.sizeStock !== undefined 
        ? (product.sizeStock[s] || 0) <= 0 
        : product.stock <= 0;
      return !isSizeOutOfStock;
    });
    setActiveSize(firstInStock || product.sizes[0] || '');
    setActiveColor(product.colors[0] || '');
    setCurrentPage('product-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Drag and drop / base64 image capture logic for receipts
  const handleScreenshotFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const file = files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setCheckoutForm({
          ...checkoutForm,
          screenshotBase64: reader.result as string
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // Place checkout order
  const handlePlaceOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutForm.name || !checkoutForm.phone || !checkoutForm.address) {
      alert("Please provide absolute delivery identifiers (Name, Contact Phone, and Address).");
      return;
    }
    if (!checkoutForm.paymentSenderNumber) {
      alert("Please enter the required Payment Sender Number you sent the balance from.");
      return;
    }
    if (!checkoutForm.screenshotBase64) {
      alert("Please upload your mobile wallet or InstaPay payment screenshot to verify payment.");
      return;
    }

    setIsPlacingOrder(true);
    try {
      const orderTotal = cart.reduce((acc, it) => acc + it.product.price * it.quantity, 0);

      // Create structured items array
      const orderItems = cart.map((it) => ({
        productId: it.product.id,
        name: it.product.name,
        price: it.product.price,
        size: it.selectedSize,
        color: it.selectedColor,
        quantity: it.quantity,
        image: it.product.images[0]
      }));

      const newOrder: Omit<Order, 'id'> = {
        name: checkoutForm.name,
        phone: checkoutForm.phone,
        address: checkoutForm.address,
        items: orderItems,
        total: discountedTotal,
        paymentMethod: checkoutForm.paymentMethod,
        paymentScreenshot: checkoutForm.screenshotBase64,
        status: 'Pending Review',
        createdAt: Date.now(),
        paymentSenderNumber: checkoutForm.paymentSenderNumber,
        couponApplied: appliedCoupon ? appliedCoupon.id : undefined,
        discountAmount: appliedCoupon ? (orderTotal - discountedTotal) : undefined
      };

      // 1. Post order to firebase collection with cleanDocData sanitization
      const cleanOrderPayload = cleanDocData(newOrder);
      console.log("[DEBUG MODE] Submitting clean sanitized order: ", cleanOrderPayload);
      const orderRef = await addDoc(collection(db, 'orders'), cleanOrderPayload);
      const insertedOrderObj = { id: orderRef.id, ...cleanOrderPayload } as Order;

      // Deduct size-specific stock in Firestore
      for (const it of cart) {
        try {
          const productRef = doc(db, 'products', it.product.id);
          const productSnap = await getDoc(productRef);
          if (productSnap.exists()) {
            const prodData = productSnap.data();
            const currentSizeStock = prodData.sizeStock || {};
            const currentSizeQty = currentSizeStock[it.selectedSize] !== undefined 
              ? currentSizeStock[it.selectedSize] 
              : (prodData.stock || 0);

            const newSizeQty = Math.max(0, currentSizeQty - it.quantity);
            const updatedSizeStock = {
              ...currentSizeStock,
              [it.selectedSize]: newSizeQty
            };

            // Re-calculate general stock
            const newTotalStock = Object.values(updatedSizeStock).reduce(
              (acc: number, val: any) => acc + (typeof val === 'number' ? val : 0), 
              0
            );

            await updateDoc(productRef, {
              sizeStock: updatedSizeStock,
              stock: newTotalStock
            });
          }
        } catch (stockErr) {
          console.warn("Could not deduct stock for product: " + it.product.id, stockErr);
        }
      }

      // Reload database data to match fresh stock inventory
      await loadDatabaseData();

      // 2. Synchronize target customer metrics
      const clientSnap = await getDocs(collection(db, 'customers'));
      let clientMatchId = '';
      let existingCount = 0;
      let existingSpend = 0;
      
      clientSnap.forEach((doc) => {
        const d = doc.data();
        if (d.phone === checkoutForm.phone) {
          clientMatchId = doc.id;
          existingCount = d.ordersCount || 0;
          existingSpend = d.totalSpent || 0;
        }
      });

      const nextClientObj = {
        name: checkoutForm.name,
        phone: checkoutForm.phone,
        address: checkoutForm.address,
        ordersCount: existingCount + 1,
        totalSpent: existingSpend + discountedTotal,
        createdAt: Date.now()
      };

      if (clientMatchId) {
        await setDoc(doc(db, 'customers', clientMatchId), nextClientObj, { merge: true });
      } else {
        await addDoc(collection(db, 'customers'), nextClientObj);
      }

      // Retrieve locally saved notifications credentials
      const savedTgToken = localStorage.getItem('jan_tg_token') || '';
      const savedTgChat = localStorage.getItem('jan_tg_chat') || '';
      const savedTwilioSid = localStorage.getItem('jan_twilio_sid') || '';
      const savedTwilioAuth = localStorage.getItem('jan_twilio_auth') || '';
      const savedTwilioSender = localStorage.getItem('jan_twilio_sender') || '';

      // 3. Trigger Express server backend dispatch notifications
      try {
        await fetch('/api/notify-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            order: insertedOrderObj,
            telegramConfig: { botToken: savedTgToken, chatId: savedTgChat },
            whatsappConfig: { twilioSid: savedTwilioSid, twilioAuthToken: savedTwilioAuth, whatsappSender: savedTwilioSender }
          })
        });
      } catch (err) {
        console.warn("Notification route had server lookup warnings", err);
      }

      setConstructedOrderSuccess(insertedOrderObj);
      // Empty local cart
      syncCartLocalStorage([]);
      
      // Reset checkout details
      setCheckoutForm({
        name: '',
        phone: '',
        address: '',
        paymentMethod: 'wallet',
        screenshotBase64: '',
        paymentSenderNumber: ''
      });
      setCheckoutStep(1);
      setAppliedCoupon(null);
      setCouponCodeInput('');

    } catch (err: any) {
      alert("Error submitting order check: " + err?.message);
    } finally {
      setIsPlacingOrder(false);
    }
  };

  // Submit Contacts Form
  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.message || !contactForm.phone) {
      alert("Please enter Name, Phone Number, and your message query.");
      return;
    }

    setIsSendingMessage(true);
    try {
      const payload: Omit<Message, 'id'> = {
        name: contactForm.name,
        email: contactForm.email || 'N/A',
        phone: contactForm.phone,
        message: contactForm.message,
        createdAt: Date.now()
      };

      await addDoc(collection(db, 'messages'), payload);
      setMessageSuccess(true);
      setContactForm({ name: '', email: '', phone: '', message: '' });
      setTimeout(() => setMessageSuccess(false), 5000);
    } catch (err: any) {
      alert("Could not register message: " + err?.message);
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Submit new product review (Requirement 2)
  const handleCreateReview = async (e: React.FormEvent, pId: string) => {
    e.preventDefault();
    if (!reviewAuthorName.trim() || !reviewComment.trim()) {
      alert("الرجاء إدخال الاسم والتعليق لكتابة المراجعة.");
      return;
    }
    setIsSubmittingReview(true);
    try {
      const reviewPayload: Review = {
        productId: pId,
        customerName: reviewAuthorName.trim(),
        rating: reviewRating,
        comment: reviewComment.trim(),
        createdAt: Date.now()
      };
      await addDoc(collection(db, 'reviews'), reviewPayload);
      setReviewAuthorName('');
      setReviewComment('');
      setReviewRating(5);
      alert("تمت إضافة مراجعتك بنجاح! شكراً لك.");
    } catch (err: any) {
      alert("تعذر حفظ المراجعة: " + err?.message);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Requirement 3: Apply Coupon logic during checkout
  const handleApplyCoupon = () => {
    setCouponError('');
    if (!couponCodeInput.trim()) {
      setCouponError('الرجاء إدخال كود الخصم أولاً.');
      return;
    }

    const code = couponCodeInput.trim().toUpperCase();
    const foundCoupon = coupons.find(c => c.id.toUpperCase() === code);

    if (!foundCoupon) {
      setCouponError('كود الخصم غير صالح أو غير موجود.');
      return;
    }

    if (!foundCoupon.isActive) {
      setCouponError('عذراً، هذا الكود غير مفعل حالياً.');
      return;
    }

    // Expiry check (optional)
    if (foundCoupon.expiryDate) {
      const expiryTime = new Date(foundCoupon.expiryDate).getTime();
      if (Date.now() > expiryTime) {
        setCouponError('عذراً، انتهت صلاحية كود الخصم هذا.');
        return;
      }
    }

    // Apply successfully
    setAppliedCoupon(foundCoupon);
    setCouponError('');
    alert(`تم تطبيق كود الخصم بنجاح! تم خصم ${foundCoupon.discountType === 'percentage' ? `${foundCoupon.discountValue}%` : `${foundCoupon.discountValue} EGP`}`);
  };

  // Save Config update handler
  const handleUpdateHomepageConfig = async (newConfig: HomepageConfig) => {
    try {
      await setDoc(doc(db, 'config', 'homepage'), newConfig);
      setHomepageConfig(newConfig);
    } catch (err) {
      console.error("Could not update layout configs", err);
      throw err;
    }
  };

  // Catalog Filters calculations
  const filteredProducts = products.filter((prod) => {
    // 1. Search Query
    if (searchQuery && !prod.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    
    // 2. Category Dropdowns
    if (selectedCategory !== 'ALL' && prod.category.toUpperCase() !== selectedCategory.toUpperCase()) return false;
    
    // 3. Clothes vs Shoes sectors
    if (selectedSector !== 'ALL' && prod.type !== selectedSector) return false;
    
    // 4. Maximum prices limits
    if (prod.price > priceRange) return false;

    // 5. Sizes specific filterings
    if (selectedSize !== 'ALL' && !prod.sizes.includes(selectedSize)) return false;

    return true;
  });

  // Unique list of categories in database
  const categoriesList = ['ALL', ...Array.from(new Set(products.map((p) => p.category)))];

  const cartTotalVal = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);

  // Requirement 3: Discount calculation based on applied coupon
  const discountedTotal = (() => {
    if (!appliedCoupon) return cartTotalVal;
    if (appliedCoupon.discountType === 'percentage') {
      const discount = (cartTotalVal * appliedCoupon.discountValue) / 100;
      return Math.round(Math.max(0, cartTotalVal - discount));
    } else {
      // fixed value
      return Math.round(Math.max(0, cartTotalVal - appliedCoupon.discountValue));
    }
  })();

  return (
    <div className="bg-black text-white min-h-screen relative overflow-hidden flex flex-col justify-between selection:bg-[#FF6A00] selection:text-black font-sans">
      
      {/* Background visual indicators */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(255,106,0,0.03),transparent_40%)] pointer-events-none" />

      {/* Screen Loader Splash */}
      <AnimatePresence>
        {loading && <SplashLoader onComplete={() => setLoading(false)} />}
      </AnimatePresence>

      {!loading && (
        <>
          {/* Header Layout */}
          <Header
            currentPage={currentPage}
            setCurrentPage={(page) => {
              setCurrentPage(page);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            cartCount={cart.reduce((acc, it) => acc + it.quantity, 0)}
            wishlistCount={wishlist.length}
            onOpenCart={() => setIsCartOpen(true)}
            announcementText={homepageConfig.announcementText}
            whatsAppLink={homepageConfig.whatsAppLink}
          />

          {/* Cart sliding overlay drawer component */}
          <AnimatePresence>
            {isCartOpen && (
              <CartSidebar
                isOpen={isCartOpen}
                onClose={() => setIsCartOpen(false)}
                cartItems={cart}
                onUpdateQuantity={handleUpdateCartQuantity}
                onRemoveItem={handleRemoveCartItem}
                onProceedToCheckout={() => {
                  setIsCartOpen(false);
                  setCurrentPage('checkout');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            )}
          </AnimatePresence>

          {/* Page Routing Pipeline wrapper */}
          <main className="flex-grow pt-24">
            
            {/* VIEW: HOME VIEW */}
            {currentPage === 'home' && (
              <div className="space-y-20 pb-20 animate-fadeIn">
                {/* Hero section slide component */}
                <BannerSlider
                  onBrowseShop={() => setCurrentPage('shop')}
                  overrideConfig={{
                    heroTitle: homepageConfig.heroTitle,
                    heroSubtitle: homepageConfig.heroSubtitle,
                    heroBannerImg: homepageConfig.heroBannerImg,
                    heroPromoText: homepageConfig.heroPromoText
                  }}
                />

                {/* Sub banner highlighting MEN ONLY exclusivity */}
                <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative py-12 border-y border-neutral-900">
                  <span className="font-mono text-[9px] text-neutral-500 tracking-[0.4em] uppercase block mb-4">
                    COUTURE SPECIALTY DIVISION
                  </span>
                  <h2 className="font-sans font-black text-3xl sm:text-6xl text-white tracking-widest uppercase leading-snug">
                    FORMULATED <span className="text-outline-white">EXCLUSIVELY</span> FOR MEN
                  </h2>
                  <p className="font-sans text-neutral-400 text-sm max-w-2xl mx-auto mt-4 tracking-wide leading-relaxed">
                    Zero compromises. Tactical structures, industrial cuts, premium fabrications, and street couture profiles. Tailored for absolute presence. No auxiliary ranges.
                  </p>
                  <div className="flex justify-center gap-6 mt-8 text-neutral-600 font-mono text-[11px] font-bold tracking-widest uppercase">
                    <span>⚡ HEAVY COTTON DRAPES</span>
                    <span>⚡ STABILIZED CALFSKIN SOLES</span>
                  </div>
                </section>

                {/* Dynamic sliders showing FEATURED menswear products inside catalogue */}
                <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 border-b border-neutral-900 pb-6">
                    <div>
                      <span className="text-[#FF6A00] font-mono font-bold text-xs tracking-widest uppercase block mb-2">// CURRENT FEATURED RELEASES</span>
                      <h2 className="font-sans font-black text-3xl sm:text-4xl text-white tracking-tighter uppercase leading-none">
                        HOTTEST <span className="text-outline-white">DROP</span> MODULES
                      </h2>
                    </div>
                    <button
                      onClick={() => setCurrentPage('shop')}
                      className="text-xs font-mono font-black tracking-widest uppercase text-neutral-400 hover:text-white flex items-center gap-2 group transition-colors cursor-pointer"
                    >
                      BROWSE ALL SYSTEMS <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1.5 text-[#FF6A00]" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {products.filter(p => p.featured).slice(0, 3).map((prod) => (
                      <ProductCard
                        key={prod.id}
                        product={prod}
                        onSelect={handleSelectProduct}
                        isWishlisted={wishlist.some(p => p.id === prod.id)}
                        onToggleWishlist={handleToggleWishlist}
                      />
                    ))}
                  </div>
                </section>

                {/* Big promotional display layout block */}
                <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="bg-neutral-950 border border-neutral-900 grid grid-cols-1 lg:grid-cols-12 overflow-hidden items-stretch">
                    <div className="col-span-1 lg:col-span-12 xl:col-span-5 relative min-h-[300px] lg:min-h-auto overflow-hidden">
                      <img
                        src="https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=1200&q=80"
                        alt="Masculine luxury outerwear design"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    
                    <div className="col-span-1 lg:col-span-12 xl:col-span-7 p-8 sm:p-12 lg:p-16 flex flex-col justify-center space-y-6">
                      <span className="text-[#FF6A00] font-mono text-[10px] tracking-widest block font-bold uppercase">
                        SPECIAL FABRIC RELEASE
                      </span>
                      <h3 className="font-sans font-black text-3xl sm:text-5xl text-white tracking-tighter uppercase leading-none">
                        THE DOUBLE <span className="text-outline-white">HEAVY</span> 450GSM FLEECE
                      </h3>
                      <p className="font-sans text-neutral-400 text-sm leading-relaxed">
                        Retains structural architectural silhouette shape even after hours of continuous wear. Handloomed with heavy organic cotton fibers and accented with durable reinforced double stitching loops.
                      </p>
                      
                      <div className="flex gap-4 pt-4">
                        <button
                          onClick={() => {
                            setSelectedCategory('Hoodies');
                            setCurrentPage('shop');
                          }}
                          className="px-8 py-4 bg-[#FF6A00] text-black font-sans font-black tracking-widest text-xs uppercase hover:translate-y-[-2px] hover:shadow-[0_10px_30px_-10px_rgba(255,106,0,0.5)] transition-all cursor-pointer rounded-none"
                        >
                          SHOP HOODIES DROP
                        </button>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* VIEW: SHOP VIEW */}
            {currentPage === 'shop' && (
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10 animate-fadeIn">
                
                {/* Header indicators */}
                <div className="border-b border-neutral-900 pb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                  <div>
                    <span className="font-mono text-xs tracking-widest text-neutral-500 uppercase block mb-1">
                      CORE CATALOG LISTINGS
                    </span>
                    <h1 className="font-sans font-black text-3xl sm:text-5xl text-white tracking-tighter uppercase leading-none">
                      COUTURE DEPLOYED
                    </h1>
                  </div>

                  {/* Search query box */}
                  <div className="w-full md:max-w-xs relative font-mono">
                    <input
                      type="text"
                      placeholder="SEARCH COUTURE..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-black border border-neutral-800 text-xs text-white px-4 py-3 focus:border-[#FF6A00] focus:outline-none uppercase tracking-widest placeholder-neutral-700 font-bold"
                    />
                  </div>
                </div>

                {/* Filters Row Panels */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                  {/* Left panel filter controllers */}
                  <div className="col-span-1 space-y-8 bg-neutral-950/40 p-6 border border-neutral-900/60 font-mono text-xs">
                    
                    {/* Clothing vs shoes categorisations */}
                    <div className="space-y-3">
                      <h4 className="text-white font-extrabold tracking-widest uppercase text-[11px] border-b border-neutral-900 pb-1.5 flex items-center justify-between">
                        <span>COUPLING</span>
                        <span className="text-[#FF6A00] text-[9px]">SOLO_MALE</span>
                      </h4>
                      <div className="grid grid-cols-3 gap-2">
                        {['ALL', 'clothes', 'shoes'].map((sec) => (
                          <button
                            key={sec}
                            onClick={() => {
                              setSelectedSector(sec as any);
                              // Reset active size filter tag on grid swap to avert mismatch
                              setSelectedSize('ALL');
                            }}
                            className={`py-2 text-[10px] font-black uppercase text-center border cursor-pointer ${
                              selectedSector === sec
                                ? 'bg-white text-black border-white'
                                : 'border-neutral-800 text-neutral-400 hover:text-white'
                            }`}
                          >
                            {sec}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Category list tags inside shop page */}
                    <div className="space-y-3">
                      <h4 className="text-white font-semibold tracking-widest uppercase text-[11px] border-b border-neutral-900 pb-1.5">
                        CATEGORIES
                      </h4>
                      <div className="space-y-2">
                        {categoriesList.map((cat) => (
                          <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`w-full text-left font-mono font-bold text-[11px] uppercase tracking-wider block py-1 transition-colors ${
                              selectedCategory === cat ? 'text-[#FF6A00] font-extrabold' : 'text-neutral-400 hover:text-white'
                            }`}
                          >
                            ⚔️ {cat}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Sizes Selection filter widgets */}
                    <div className="space-y-3">
                      <h4 className="text-white font-semibold tracking-widest uppercase text-[11px] border-b border-neutral-900 pb-1.5">
                        SIZE DECK
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {['ALL', ...((selectedSector === 'shoes') 
                            ? ['41', '42', '43', '44', '45'] 
                            : ['S', 'M', 'L', 'XL', 'XXL']
                        )].map((size) => (
                          <button
                            key={size}
                            onClick={() => setSelectedSize(size)}
                            className={`w-9 h-9 border text-[10px] font-bold font-mono tracking-tighter flex items-center justify-center cursor-pointer transition-colors ${
                              selectedSize === size
                                ? 'bg-[#FF6A00] text-black border-[#FF6A00]'
                                : 'border-neutral-800 text-neutral-400 hover:border-[#FF6A00]'
                            }`}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Price Slider filter */}
                    <div className="space-y-3">
                      <div className="flex justify-between font-bold text-[11px] tracking-wider">
                        <span className="text-neutral-400">MAX PRICE CAP</span>
                        <span className="text-[#FF6A00]">{priceRange} EGP</span>
                      </div>
                      <input
                        type="range"
                        min={1000}
                        max={6000}
                        step={100}
                        value={priceRange}
                        onChange={(e) => setPriceRange(Number(e.target.value))}
                        className="w-full accent-[#FF6A00] bg-neutral-900"
                      />
                    </div>
                  </div>

                  {/* Right product catalogue grid listings */}
                  <div className="col-span-1 lg:col-span-3 space-y-8">
                    {filteredProducts.length === 0 ? (
                      <div className="p-16 text-center border border-neutral-900 text-neutral-600 bg-neutral-950 flex flex-col justify-center items-center font-mono text-sm uppercase gap-4">
                        <Compass className="w-10 h-10 text-neutral-800" />
                        <span>NO COUTURE SPEC MATCHES ACTIVE FILTERS</span>
                        <button
                          onClick={() => {
                            setSelectedCategory('ALL');
                            setSelectedSector('ALL');
                            setSelectedSize('ALL');
                            setPriceRange(6000);
                            setSearchQuery('');
                          }}
                          className="mt-2 text-[#FF6A00] underline font-bold tracking-widest text-xs"
                        >
                          RESET SYSTEM FILTERS
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredProducts.map((prod) => (
                          <ProductCard
                            key={prod.id}
                            product={prod}
                            onSelect={handleSelectProduct}
                            isWishlisted={wishlist.some(p => p.id === prod.id)}
                            onToggleWishlist={handleToggleWishlist}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* VIEW: PRODUCT DETAIL LAYOUT VIEW */}
            {currentPage === 'product-detail' && selectedProduct && (() => {
              const productReviews = reviews.filter(r => r.productId === selectedProduct.id);
              const totalReviewsCount = productReviews.length;
              const averageRatingVal = totalReviewsCount > 0 
                ? Number((productReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviewsCount).toFixed(1)) 
                : 0;

              return (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fadeIn">
                  <button
                    onClick={() => setCurrentPage('shop')}
                    className="font-mono text-xs tracking-widest uppercase text-neutral-500 hover:text-white mb-8 block select-none cursor-pointer"
                  >
                    ← BACK TO COLLECTION FILES
                  </button>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 font-sans">
                    
                    {/* Left: Images Column layouts */}
                    <div className="col-span-1 lg:col-span-7 space-y-6">
                      <div className="aspect-[3/4] bg-neutral-950 border border-neutral-900 overflow-hidden relative">
                        <img
                          src={selectedProduct.images[0]}
                          alt={selectedProduct.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>

                      {/* Secondary slider options if they exist in DB list */}
                      {selectedProduct.images.length > 1 && (
                        <div className="grid grid-cols-4 gap-4">
                          {selectedProduct.images.slice(0, 4).map((img, i) => (
                            <div key={i} className="aspect-square bg-neutral-900 border border-neutral-800 overflow-hidden">
                              <img src={img} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Right Detail parameters */}
                    <div className="col-span-1 lg:col-span-5 space-y-8 flex flex-col justify-between">
                      
                      <div className="space-y-6">
                        {/* Tags */}
                        <div className="flex gap-2">
                          <span className="bg-[#FF6A00] text-black text-[9px] tracking-widest uppercase py-1 px-2.5 font-bold">
                            {selectedProduct.type} SECTOR
                          </span>
                          <span className="bg-neutral-950 text-neutral-400 border border-neutral-800 text-[9px] tracking-widest uppercase py-1 px-2.5 font-bold">
                            CAT: {selectedProduct.category}
                          </span>
                        </div>

                        {/* Header title */}
                        <div className="space-y-3">
                          <h1 className="font-sans font-black text-2xl sm:text-4xl text-white tracking-widest uppercase mb-1">
                            {selectedProduct.name}
                          </h1>

                          {/* Requirement 2: Rating displays next to price/title */}
                          <div className="flex items-center gap-2 font-mono text-[10px] text-neutral-450 uppercase tracking-widest bg-zinc-950 py-1.5 px-3 border border-neutral-900 self-start">
                            <div className="flex items-center text-amber-500">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`w-3.5 h-3.5 ${
                                    star <= Math.round(averageRatingVal)
                                      ? 'fill-amber-500 text-amber-500'
                                      : 'text-neutral-800'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-white font-bold ml-1">
                              {averageRatingVal > 0 ? `${averageRatingVal} / 5.0` : 'NO RATINGS'}
                            </span>
                            <span className="text-zinc-850">|</span>
                            <span className="text-[#FF6A00] font-bold">({totalReviewsCount} {totalReviewsCount === 1 ? 'REVIEW' : 'REVIEWS'})</span>
                          </div>

                          <div className="flex items-center gap-3 pt-2">
                            <span className="font-sans font-black text-2xl text-[#FF6A00]">{selectedProduct.price} EGP</span>
                            {selectedProduct.originalPrice && (
                              <span className="font-sans font-bold text-neutral-500 text-sm line-through">{selectedProduct.originalPrice} EGP</span>
                            )}
                          </div>
                        </div>

                        {/* Description */}
                        <p className="font-sans text-neutral-400 text-sm leading-relaxed tracking-wider font-light">
                          {selectedProduct.description}
                        </p>

                        {/* Config Size select panels */}
                        <div className="space-y-3 font-mono text-xs">
                          <span className="text-neutral-500 font-bold block">// CHOOSE COUTURE SIZE BRACKET</span>
                          <div className="flex flex-wrap gap-2.5">
                            {selectedProduct.sizes.map((s) => {
                              const isSizeOutOfStock = selectedProduct.sizeStock !== undefined 
                                ? (selectedProduct.sizeStock[s] || 0) <= 0 
                                : selectedProduct.stock <= 0;
                              return (
                                <button
                                  key={s}
                                  disabled={isSizeOutOfStock}
                                  onClick={() => setActiveSize(s)}
                                  className={`w-12 h-12 border text-xs font-bold tracking-tighter flex items-center justify-center transition-colors relative ${
                                    isSizeOutOfStock
                                      ? 'border-neutral-900 text-neutral-650 bg-neutral-950/40 cursor-not-allowed line-through'
                                      : activeSize === s
                                      ? 'bg-[#FF6A00] text-black border-[#FF6A00] cursor-pointer'
                                      : 'border-neutral-800 text-neutral-300 hover:border-white cursor-pointer'
                                  }`}
                                >
                                  {s}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Colors display info */}
                        <div className="space-y-3 font-mono text-xs">
                          <span className="text-neutral-500 font-bold block">// CHOOSE FABRIC COLORWAY</span>
                          <div className="flex flex-wrap gap-2">
                            {selectedProduct.colors.map((col) => (
                              <button
                                key={col}
                                onClick={() => setActiveColor(col)}
                                className={`px-4 py-2 border text-[10px] font-bold uppercase transition-colors cursor-pointer ${
                                  activeColor === col
                                    ? 'bg-white text-black border-white font-extrabold'
                                    : 'border-neutral-800 text-neutral-400 hover:text-white'
                                }`}
                              >
                                {col}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Operational action buy indicators */}
                      <div className="space-y-4 pt-6 border-t border-neutral-900 font-sans">
                        
                        {/* Out of stock checks */}
                        {selectedProduct.stock === 0 || (selectedProduct.sizeStock !== undefined && activeSize && (selectedProduct.sizeStock[activeSize] || 0) <= 0) ? (
                          <div className="p-4 border border-red-900 text-red-500 font-mono text-center uppercase tracking-widest text-[10px] sm:text-xs font-bold bg-neutral-950/80">
                            {selectedProduct.stock === 0 ? 'SYSTEM: OUT OF STOCK' : `SYSTEM: SIZE ${activeSize} OUT OF STOCK`}
                          </div>
                        ) : (
                          <button
                            onClick={() => handleAddToCart(selectedProduct, activeSize, activeColor)}
                            className="w-full bg-[#FF6A00] text-black font-sans font-black tracking-widest text-xs py-4 flex items-center justify-center gap-2 hover:bg-white transition-all cursor-pointer rounded-none hover:shadow-[0_0_20px_rgba(255,106,0,0.25)]"
                          >
                            INITIALIZE TO COUTURE BAG
                          </button>
                        )}

                        <button
                          onClick={() => handleToggleWishlist(selectedProduct)}
                          className="w-full border border-neutral-800 hover:border-neutral-500 font-mono font-bold text-neutral-400 hover:text-white text-[10px] tracking-widest py-3 flex items-center justify-center gap-2 uppercase cursor-pointer"
                        >
                          <Heart className="w-3.5 h-3.5" />
                          <span>
                            {wishlist.some(p => p.id === selectedProduct.id) ? 'REMOVE FROM COUTURE DESIRE' : 'STORE IN COUTURE DESIRE'}
                          </span>
                        </button>
                      </div>

                    </div>
                  </div>

                  {/* REVIEWS SYSTEM (Requirement 2): Display reviews system under each product clearly */}
                  <div className="mt-20 pt-12 border-t border-neutral-900 space-y-12 animate-fadeIn font-mono">
                    <div className="border-b border-neutral-900 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-baseline gap-4 text-xs">
                      <h3 className="font-sans font-black text-lg tracking-widest text-[#FF6A00] uppercase">// COUTURE CUSTOMER REVIEWS</h3>
                      <span className="text-neutral-500 font-bold">{totalReviewsCount} TOTAL CONTRIBUTIONS RECORDED</span>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 text-xs text-neutral-300">
                      {/* Write a review column (customer form) */}
                      <div className="lg:col-span-5 bg-neutral-950 border border-neutral-900 p-6 space-y-4">
                        <h4 className="font-sans font-black text-white text-xs tracking-widest uppercase">// LEAVE YOUR VERDICT</h4>
                        
                        <form onSubmit={(e) => handleCreateReview(e, selectedProduct.id)} className="space-y-4">
                          <div className="space-y-1">
                            <label className="text-neutral-500 font-bold block uppercase text-[9px] tracking-wider">Your Name / الاسم</label>
                            <input
                              type="text"
                              required
                              placeholder="John Doe"
                              value={reviewAuthorName}
                              onChange={(e) => setReviewAuthorName(e.target.value)}
                              className="w-full bg-black border border-neutral-850 text-white px-3 py-2 text-xs focus:border-[#FF6A00] focus:outline-none uppercase placeholder-neutral-800 font-bold"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-neutral-500 font-bold block uppercase text-[9px] tracking-wider">Rating / التقييم</label>
                            <div className="flex gap-2 bg-black/60 p-2.5 border border-zinc-900 col-span-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  type="button"
                                  key={star}
                                  onClick={() => setReviewRating(star)}
                                  className="focus:outline-none cursor-pointer hover:scale-110 transition-transform"
                                >
                                  <Star
                                    className={`w-5 h-5 ${
                                      star <= reviewRating
                                        ? 'fill-amber-550 text-amber-500'
                                        : 'text-neutral-800'
                                    }`}
                                  />
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-neutral-500 font-bold block uppercase text-[9px] tracking-wider">Comment / التعليق</label>
                            <textarea
                              required
                              rows={3}
                              placeholder="WHAT ARE YOUR CONCRETE IMPRESSIONS ABOUT FIT, QUALITY, AND FABRIC LAYERS..."
                              value={reviewComment}
                              onChange={(e) => setReviewComment(e.target.value)}
                              className="w-full bg-black border border-neutral-850 text-white px-3 py-2 text-xs focus:border-[#FF6A00] focus:outline-none uppercase placeholder-neutral-800 font-bold leading-relaxed"
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={isSubmittingReview}
                            className="w-full bg-[#FF6A00] hover:bg-white text-black font-sans font-black py-3 tracking-widest text-[10px] uppercase transition-colors uppercase cursor-pointer"
                          >
                            {isSubmittingReview ? "SUBMITTING MODEL..." : "POST CONTRIBUTION VERDICT"}
                          </button>
                        </form>
                      </div>

                      {/* Display reviews list column */}
                      <div className="lg:col-span-7 space-y-6">
                        <h4 className="font-sans font-black text-white text-xs tracking-widest uppercase">// ACTIVE CONTRIBUTIONS</h4>

                        {productReviews.length === 0 ? (
                          <div className="p-12 border border-dashed border-neutral-900 text-center text-neutral-600 font-mono uppercase">
                            No reviews recorded yet for this piece. Be the first to leave your feedback.
                          </div>
                        ) : (
                          <div className="space-y-4 max-h-[420px] overflow-y-auto pr-2 divide-y divide-neutral-900">
                            {productReviews.map((rev) => (
                              <div key={rev.id} className="pt-4 first:pt-0 space-y-2.5">
                                <div className="flex justify-between items-center text-[11px]">
                                  <span className="font-extrabold text-white uppercase">{rev.customerName}</span>
                                  <span className="text-neutral-600 text-[9px]">{new Date(rev.createdAt).toLocaleDateString()}</span>
                                </div>

                                <div className="flex items-center text-amber-500">
                                  {[1, 2, 3, 4, 5].map((index) => (
                                    <Star
                                      key={index}
                                      className={`w-3.5 h-3.5 ${
                                        index <= rev.rating ? 'fill-amber-500 text-amber-500' : 'text-neutral-850'
                                      }`}
                                    />
                                  ))}
                                </div>

                                <p className="text-neutral-400 text-[11px] leading-relaxed uppercase break-words font-light">
                                  {rev.comment}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                </div>
              );
            })()}

            {/* VIEW: CONNECT / CONTACTS */}
            {currentPage === 'contact' && (
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 animate-fadeIn">
                <div className="text-center space-y-4 max-w-2xl mx-auto mb-16">
                  <span className="text-[#FF6A00] font-mono text-xs tracking-[0.4em] block font-bold">
                    // HQ CONNECT SERVICES
                  </span>
                  <h1 className="font-sans font-black text-3xl sm:text-5xl text-white tracking-widest uppercase">
                    CONNECT WITH US DIRECTLY
                  </h1>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                  {/* Left info column */}
                  <div className="col-span-1 lg:col-span-5 space-y-8 font-mono text-xs">
                    <div className="bg-neutral-950 border border-neutral-900 p-6 space-y-4">
                      <h4 className="font-sans font-black text-white text-xs tracking-widest uppercase border-b border-neutral-900 pb-2">
                        STATION DATA DETAILS
                      </h4>
                      <p className="text-neutral-400">
                        <b>HQ LOCATION:</b> CAIRO, EGYPT
                      </p>
                      <p className="text-[#FF6A00]">
                        <b>SUPPORT WALLET HOTLINE:</b> 01227474877
                      </p>
                      <p className="text-neutral-455">
                        <b>LIVE WHATSAPP HELP:</b> +201144585584
                      </p>
                    </div>

                    <div className="bg-neutral-950 border border-neutral-900 p-6 space-y-4">
                      <h4 className="font-sans font-black text-white text-xs tracking-widest uppercase border-b border-neutral-900 pb-2">
                        EXTERNAL INTEL SOCIALS
                      </h4>
                      <div className="space-y-2 uppercase leading-normal font-bold">
                        <a href={homepageConfig.instaLink} target="_blank" rel="noreferrer" className="block text-neutral-400 hover:text-white underline decoration-[#FF6A00]">
                          Instagram Profile ↗
                        </a>
                        <a href={homepageConfig.tiktokLink} target="_blank" rel="noreferrer" className="block text-neutral-400 hover:text-white underline decoration-[#FF6A00]">
                          TikTok Drops Channel ↗
                        </a>
                        <a href={homepageConfig.facebookLink} target="_blank" rel="noreferrer" className="block text-neutral-400 hover:text-white underline decoration-[#FF6A00]">
                          Facebook Community ↗
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Right contact forms input */}
                  <div className="col-span-1 lg:col-span-7 bg-neutral-950 border border-neutral-900 p-8 relative">
                    <div className="absolute top-0 inset-x-0 h-[2px] bg-[#FF6A00]" />
                    
                    <h3 className="font-sans font-black text-base tracking-widest uppercase text-white mb-6">
                      FILE INCOMING CUSTOMER SUPPORT MESSAGE
                    </h3>

                    <form onSubmit={handleContactSubmit} className="space-y-4 font-mono text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-neutral-400">YOUR FULL NAME</label>
                          <input
                            type="text"
                            required
                            placeholder="NAME IDENTIFIER"
                            value={contactForm.name}
                            onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                            className="w-full bg-black border border-neutral-800 focus:border-[#FF6A00] text-white px-3 py-2 focus:outline-none uppercase"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-neutral-400">PHONE REGISTERED (EG)</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. 011xxxxxxxx"
                            value={contactForm.phone}
                            onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                            className="w-full bg-black border border-neutral-800 focus:border-[#FF6A00] text-white px-3 py-2 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-neutral-400">EMAIL CONTACT (OPTIONAL)</label>
                        <input
                          type="email"
                          placeholder="EMAIL ROUTING TARGET"
                          value={contactForm.email}
                          onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                          className="w-full bg-black border border-neutral-800 focus:border-[#FF6A00] text-white px-3 py-2  focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-neutral-400">YOUR SPECIAL REQUIREMENT MESSAGE</label>
                        <textarea
                          required
                          rows={4}
                          placeholder="ENTER DETAILED COUTURE REQUESTS AND GENERAL QUERIES..."
                          value={contactForm.message}
                          onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                          className="w-full bg-black border border-neutral-800 focus:border-[#FF6A00] text-white px-3 py-2  focus:outline-none"
                        />
                      </div>

                      {messageSuccess && (
                        <div className="p-3 bg-emerald-950/20 border border-emerald-900 text-emerald-500 uppercase tracking-widest font-mono text-[10px] flex items-center gap-2">
                          <Check className="w-4 h-4 flex-none" />
                          <span>MESSAGE SUCCESSFULLY SUBMITTED TO THE SUPER INBOX.</span>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={isSendingMessage}
                        className="w-full bg-white text-black font-sans font-black tracking-widest text-[11px] py-3.5 hover:bg-[#FF6A00] hover:text-black transition-colors cursor-pointer rounded-none uppercase"
                      >
                        {isSendingMessage ? 'QUEUING TRANSMISSION...' : 'DEPOSIT MESSAGE IN COURIER'}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW: WISHLIST VIEW */}
            {currentPage === 'wishlist' && (
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fadeIn">
                <div className="border-b border-neutral-900 pb-6 mb-10">
                  <span className="font-mono text-xs tracking-widest text-neutral-500 uppercase block mb-1">
                    YOUR STORED PREFERENCES
                  </span>
                  <h1 className="font-sans font-black text-3xl sm:text-5xl text-white tracking-widest uppercase mb-2">
                    COUTURE DESIRES
                  </h1>
                </div>

                {wishlist.length === 0 ? (
                  <div className="p-16 text-center border border-dashed border-neutral-900 text-neutral-600 bg-neutral-950 flex flex-col justify-center items-center font-mono text-sm uppercase gap-4">
                    <Heart className="w-12 h-12" />
                    <span>WISHLIST DRY. NO PREFERENCES ADDED YET.</span>
                    <button
                      onClick={() => setCurrentPage('shop')}
                      className="mt-2 text-[#FF6A00] underline font-bold tracking-widest text-xs cursor-pointer"
                    >
                      EXPLORE NEW RELEASES
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    {wishlist.map((prod) => (
                      <ProductCard
                        key={prod.id}
                        product={prod}
                        onSelect={handleSelectProduct}
                        isWishlisted={true}
                        onToggleWishlist={handleToggleWishlist}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* VIEW: MULTI-STEP CHECKOUT (WITH SCREENSHOT VERIFY) */}
            {currentPage === 'checkout' && (
              <div className="max-w-3xl mx-auto px-4 py-12 animate-fadeIn font-sans">
                {constructedOrderSuccess ? (
                  <div className="bg-neutral-950 border border-emerald-900/40 p-8 space-y-6 text-center text-white relative">
                    <div className="absolute top-0 inset-x-0 h-[2px] bg-emerald-500" />
                    
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500 text-emerald-500 rounded-none w-fit mx-auto">
                      <CheckCircle className="w-10 h-10 animate-pulse" />
                    </div>

                    <h2 className="font-sans font-black text-2xl sm:text-3xl tracking-widest uppercase">
                      ORDER SUCCESSFULLY QUEUED
                    </h2>

                    <p className="font-mono text-[9px] text-neutral-500 uppercase tracking-widest leading-loose">
                      Your premium transaction has been received and coded into our queue databases.
                    </p>

                    <div className="bg-black border border-neutral-900 p-6 space-y-3 font-mono text-xs text-left">
                      <p><span className="text-neutral-500">TRANSACTION IDENTIFIER:</span> {constructedOrderSuccess.id.toUpperCase()}</p>
                      <p><span className="text-neutral-500">STATUS:</span> <span className="text-yellow-500 font-extrabold uppercase">PENDING MANUAL REVIEW</span></p>
                      <p><span className="text-neutral-500">CLIENT:</span> {constructedOrderSuccess.name}</p>
                      <p><span className="text-neutral-500">PHONE:</span> {constructedOrderSuccess.phone}</p>
                      <p><span className="text-neutral-500">DESTINATION:</span> {constructedOrderSuccess.address}</p>
                      <p><span className="text-neutral-500">TOTAL PAID:</span> <span className="text-[#FF6A00] font-bold">{constructedOrderSuccess.total} EGP</span></p>
                    </div>

                    <div className="p-4 border border-zinc-800 bg-black text-neutral-400 font-mono text-[10px] leading-relaxed uppercase text-left">
                      💡 <b>NOTICE:</b> Our dispatch coordinator is manually matching payment records against your uploaded screenshot. Once confirmed, you will receive real-time package updates.
                    </div>

                    <div className="pt-4 flex flex-col sm:flex-row gap-4">
                      <button
                        onClick={() => {
                          setConstructedOrderSuccess(null);
                          setCurrentPage('home');
                        }}
                        className="flex-1 bg-[#FF6A00] text-black font-sans font-black py-3 text-xs tracking-widest uppercase cursor-pointer transition-colors"
                      >
                        RETURN TO HOMEPAGE
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-neutral-950 border border-neutral-900 p-6 sm:p-8 relative">
                    <div className="absolute top-0 inset-x-0 h-[2px] bg-[#FF6A00]" />
                    
                    {/* Checkout Heading step counters */}
                    <div className="flex justify-between items-center border-b border-neutral-900 pb-4 mb-6 font-mono text-xs text-neutral-500">
                      <span className="font-sans font-black text-base text-white tracking-widest uppercase">
                        TRANSACTION CHEQUE OUT
                      </span>
                      <span>STEP 0{checkoutStep} / 02</span>
                    </div>

                    {cart.length === 0 ? (
                      <div className="p-12 text-center text-neutral-600 font-mono uppercase">
                        Your checkout queue is empty. Return to store catalogue.
                        <button
                          onClick={() => setCurrentPage('shop')}
                          className="mt-4 block mx-auto text-[#FF6A00] font-black underline text-xs"
                        >
                          SHOP NOW
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* UNIFIED DESIGN CHECKOUT ORDER SUMMARY & COUPONS */}
                        <div className="bg-neutral-950 border border-neutral-900 p-5 space-y-4 font-mono text-xs animate-fadeIn text-neutral-300">
                          <h4 className="text-white font-black tracking-widest border-b border-neutral-900 pb-2 uppercase text-[11px]">// APPAREL ORDER SPEC SUMMARY</h4>
                          <div className="divide-y divide-neutral-900 max-h-36 overflow-y-auto pr-1">
                            {cart.map((item, idx) => (
                              <div key={`${item.product.id}-${idx}`} className="py-2.5 flex justify-between items-center text-neutral-450 text-[11px]">
                                <div className="min-w-0 pr-2">
                                  <span className="text-white font-extrabold block truncate">{item.product.name}</span>
                                  <span className="text-neutral-600 text-[9px] uppercase tracking-wider block">SIZE: {item.selectedSize} // COLOR: {item.selectedColor}</span>
                                </div>
                                <span className="text-right whitespace-nowrap">{item.quantity}x @ <span className="text-[#FF6A01] font-bold">{item.product.price} EGP</span></span>
                              </div>
                            ))}
                          </div>

                          <div className="pt-3 border-t border-neutral-900 space-y-3">
                            {/* Input coupon field */}
                            <div className="space-y-1">
                              <label className="text-neutral-500 font-bold block uppercase text-[9px] tracking-wider">PROMOTIONAL CODE DISCOUNT</label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  placeholder="ENTER CODE..."
                                  value={couponCodeInput}
                                  onChange={(e) => {
                                    setCouponCodeInput(e.target.value.toUpperCase());
                                    setCouponError('');
                                  }}
                                  className="bg-black border border-neutral-850 text-white px-3 py-2 text-xs uppercase focus:border-[#FF6A00] focus:outline-none flex-grow placeholder-neutral-700 tracking-wider"
                                />
                                <button
                                  type="button"
                                  onClick={handleApplyCoupon}
                                  className="px-4 py-2 bg-[#FF6A00] hover:bg-white text-black font-sans font-black tracking-widest text-[10px] uppercase transition-colors uppercase cursor-pointer"
                                >
                                  APPLY
                                </button>
                              </div>
                            </div>
                            
                            {couponError && (
                              <p className="text-red-500 text-[10px] uppercase font-bold tracking-wider">{couponError}</p>
                            )}

                            {appliedCoupon && (
                              <div className="flex justify-between items-center bg-emerald-950/20 border border-emerald-900/40 p-2 text-[10px] font-bold text-emerald-500 uppercase">
                                <span>✓ PROMO APPLIED: {appliedCoupon.id} ({appliedCoupon.discountType === 'percentage' ? `${appliedCoupon.discountValue}%` : `${appliedCoupon.discountValue} EGP`} OFF)</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAppliedCoupon(null);
                                    setCouponCodeInput('');
                                  }}
                                  className="text-red-500 hover:text-white underline font-bold cursor-pointer"
                                >
                                  REMOVE
                                </button>
                              </div>
                            )}

                            {/* Totals Section */}
                            <div className="space-y-1.5 pt-2 border-t border-neutral-900 font-bold uppercase transition-all">
                              <div className="flex justify-between text-neutral-500 text-[10px]">
                                <span>ORIGINAL PRICE</span>
                                <span>{cartTotalVal} EGP</span>
                              </div>
                              {appliedCoupon && (
                                <div className="flex justify-between text-emerald-500 text-[10px]">
                                  <span>COUTURE DISCOUNT SAVINGS</span>
                                  <span>
                                    -{cartTotalVal - discountedTotal} EGP
                                  </span>
                                </div>
                              )}
                              <div className="flex justify-between text-white text-sm tracking-wide font-black border-t border-neutral-900 pt-2">
                                <span className="text-[#FF6A01]">NET TOTAL TRANSACTION</span>
                                <span className="text-[#FF6A01] text-base">{discountedTotal} EGP</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Step 1: Delivery identifiers */}
                        {checkoutStep === 1 && (
                          <form onSubmit={(e) => { e.preventDefault(); setCheckoutStep(2); }} className="space-y-4 font-mono text-xs text-neutral-350">
                            <h3 className="font-sans font-black text-sm tracking-widest uppercase text-[#FF6A00] mb-4">
                              01 // RECIPIENT DELIVERY IDENTIFICATION
                            </h3>

                            <div className="space-y-1">
                              <label className="text-neutral-400">RECIPIENT FULL NAME</label>
                              <input
                                type="text"
                                required
                                placeholder="ENTER RECIPIENT NAME"
                                value={checkoutForm.name}
                                onChange={(e) => setCheckoutForm({ ...checkoutForm, name: e.target.value })}
                                className="w-full bg-black border border-neutral-800 focus:border-[#FF6A00] text-white px-3 py-2.5 focus:outline-none uppercase"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-neutral-400">PHONE CONTACT NUMBER (EGYPT)</label>
                              <input
                                type="tel"
                                required
                                placeholder="e.g. 012xxxxxxxx"
                                value={checkoutForm.phone}
                                onChange={(e) => setCheckoutForm({ ...checkoutForm, phone: e.target.value })}
                                className="w-full bg-black border border-neutral-800 focus:border-[#FF6A00] text-white px-3 py-2.5 focus:outline-none"
                              />
                              <p className="font-mono text-[9px] text-[#FF6A00] leading-snug uppercase">
                                MUST correspond with active Telegram/WhatsApp line to secure delivery notifications.
                              </p>
                            </div>

                            <div className="space-y-1">
                              <label className="text-neutral-400">EXPLICIT DELIVERY ADDR FILE</label>
                              <textarea
                                required
                                rows={3}
                                placeholder="STREET NAME, APARTMENT NUMBER, NEIGHBORHOOD, CITY AREA IN EGYPT"
                                value={checkoutForm.address}
                                onChange={(e) => setCheckoutForm({ ...checkoutForm, address: e.target.value })}
                                className="w-full bg-black border border-neutral-800 focus:border-[#FF6A00] text-white px-3 py-2.5 focus:outline-none uppercase"
                              />
                            </div>

                            <div className="pt-4 border-t border-neutral-900 text-right">
                              <button
                                type="submit"
                                className="px-6 py-3.5 bg-[#FF6A00] text-black font-sans font-black tracking-widest text-[10px] uppercase hover:bg-white transition-colors cursor-pointer"
                              >
                                PROCEED TO PAYMENTS MODULE
                              </button>
                            </div>
                          </form>
                        )}

                        {/* Step 2: Payment screenshots upload */}
                        {checkoutStep === 2 && (
                          <form onSubmit={handlePlaceOrderSubmit} className="space-y-6 font-mono text-xs text-neutral-350">
                            <h3 className="font-sans font-black text-sm tracking-widest uppercase text-[#FF6A00]">
                              02 // MOBILE PAYMENTS PLATFORMS PROTOCOL
                            </h3>

                            <div className="bg-black/45 border border-zinc-800 p-5 space-y-4 font-mono font-bold leading-relaxed text-xs uppercase text-white">
                              <p className="text-amber-500 font-extrabold flex items-center gap-1.5 leading-snug">
                                <Info className="w-4 h-4 flex-none" />
                                <span>CASH ON DELIVERY DETAILED SERVICES DISABLED ENTIRELY</span>
                              </p>
                              <p className="text-neutral-300">
                                Please execute bank transfer total of <span className="text-[#FF6A50] font-black">{discountedTotal} EGP</span> to current verified wallet or account channels below:
                              </p>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 font-mono">
                                <div className="border border-neutral-805 p-3.5 bg-neutral-950">
                                  <p className="text-neutral-514 text-[9px] mb-1">MOBILE WALLET CHANNEL (Vodafone/Aman/Etc)</p>
                                  <p className="text-[#FF6A00] font-black text-sm">NUMBER: {INSTAPAY_WALLET_INFO.walletNumber}</p>
                                  <p className="text-neutral-500 text-[8px] mt-1">DIRECT MOBILE EGP DEPOSIT</p>
                                </div>

                                <div className="border border-neutral-805 p-3.5 bg-neutral-950">
                                  <p className="text-neutral-514 text-[9px] mb-1">INSTAPAY BANK WALLET ADRESSE</p>
                                  <p className="text-[#FF6A00] font-black text-sm">ACCOUNT ID: {INSTAPAY_WALLET_INFO.instaPayId}</p>
                                  <p className="text-neutral-500 text-[8px] mt-1">SAFE REALTIME BANK TRANSIT</p>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-4">
                              <div className="space-y-2">
                                <label className="text-neutral-300 font-bold block uppercase tracking-wider">SELECT PAYMENT METHOD TRANSFERRED</label>
                                <div className="grid grid-cols-2 gap-4">
                                  <button
                                    type="button"
                                    onClick={() => setCheckoutForm({ ...checkoutForm, paymentMethod: 'wallet' })}
                                    className={`py-3.5 border font-extrabold tracking-widest cursor-pointer text-center text-xs uppercase ${
                                      checkoutForm.paymentMethod === 'wallet'
                                        ? 'bg-neutral-200 text-black border-white'
                                        : 'border-neutral-800 text-neutral-400 hover:text-white'
                                    }`}
                                  >
                                    Mobile Wallet
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setCheckoutForm({ ...checkoutForm, paymentMethod: 'instapay' })}
                                    className={`py-3.5 border font-extrabold tracking-widest cursor-pointer text-center text-xs uppercase ${
                                      checkoutForm.paymentMethod === 'instapay'
                                        ? 'bg-neutral-200 text-black border-white'
                                        : 'border-neutral-800 text-neutral-400 hover:text-white'
                                    }`}
                                  >
                                    InstaPay Transfer
                                  </button>
                                </div>
                              </div>

                              {/* Requirement 4: REQUIRED PAYMENT SENDER FIELD */}
                              <div className="space-y-1">
                                <label className="text-neutral-300 font-bold block uppercase tracking-wider">
                                  PAYMENT SENDER NUMBER
                                </label>
                                <input
                                  type="text"
                                  required
                                  placeholder="الرقم الذي تم التحويل منه (Vodafone Cash / InstaPay Account)"
                                  value={checkoutForm.paymentSenderNumber}
                                  onChange={(e) => setCheckoutForm({ ...checkoutForm, paymentSenderNumber: e.target.value })}
                                  className="w-full bg-black border border-neutral-800 focus:border-[#FF6A00] text-white px-3 py-2.5 focus:outline-none uppercase placeholder-neutral-700 font-bold"
                                />
                                <p className="font-mono text-[9px] text-[#FF6A00] leading-snug uppercase">
                                  العميل لازم يكتب الرقم اللي حول منه لتأكيد عملية الدفع ومطابقتها.
                                </p>
                              </div>
                            </div>

                            {/* Screenshots Proof Upload file */}
                            <div className="space-y-3">
                              <label className="text-neutral-400 font-bold uppercase tracking-wider block">UPLOAD TRANSFER CONFIRMATION RECEIPT SCREENSHOT</label>
                              
                              <div className="border-2 border-dashed border-neutral-800 hover:border-[#FF6A00] bg-black p-8 text-center cursor-pointer transition-all relative flex flex-col items-center justify-center space-y-3">
                                <input
                                  type="file"
                                  accept="image/*"
                                  required
                                  onChange={handleScreenshotFileChange}
                                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                />
                                
                                <Camera className="w-8 h-8 text-neutral-500" />
                                
                                {checkoutForm.screenshotBase64 ? (
                                  <p className="text-emerald-500 font-bold font-mono tracking-wider text-[10px] uppercase">
                                    ✓ RECEIPT SCREENSHOT ATTACHED SUCCESSFULLY
                                  </p>
                                ) : (
                                  <>
                                    <p className="font-sans font-extrabold text-[#FF6A00] text-[11px] tracking-wider uppercase">
                                      DRAG AND DROP OR CLICK TO UPLOAD PROOF
                                    </p>
                                    <p className="font-mono text-[8px] text-neutral-600 uppercase">
                                      Supports JPG, PNG, WEBP transaction screenshots
                                    </p>
                                  </>
                                )}
                              </div>

                              {checkoutForm.screenshotBase64 && (
                                <div className="p-2 border border-neutral-800 bg-neutral-950 flex items-center justify-center">
                                  <img
                                    src={checkoutForm.screenshotBase64}
                                    className="max-h-36 object-contain"
                                    alt="Payment confirmation render"
                                  />
                                </div>
                              )}
                            </div>

                            {/* Proceed orders actions */}
                            <div className="flex gap-4 pt-4 border-t border-neutral-900">
                              <button
                                type="button"
                                onClick={() => setCheckoutStep(1)}
                                className="px-5 py-3 border border-neutral-805 hover:border-neutral-500 text-neutral-400 uppercase text-xs"
                              >
                                EDIT ADDR FILE
                              </button>

                              <button
                                type="submit"
                                disabled={isPlacingOrder}
                                className="flex-grow py-3.5 bg-[#FF6A00] text-black font-sans font-black tracking-widest text-[#050505] text-xs uppercase hover:bg-white transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                              >
                                {isPlacingOrder ? 'TRANSMITTING TRANSIT CHEQUE...' : 'CONFIRM AND SUBMIT ORDER SPEC'}
                              </button>
                            </div>
                          </form>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* VIEW: CONTROL PANEL ADMINS */}
            {currentPage === 'admin' && (
              <AdminSection
                products={products}
                onRefreshProducts={loadDatabaseData}
                homepageConfig={homepageConfig}
                onUpdateHomepageConfig={handleUpdateHomepageConfig}
              />
            )}

          </main>

          {/* Persistent live Float widgets WhatsApp buttons */}
          <a
            href={homepageConfig.whatsAppLink}
            target="_blank"
            rel="noreferrer"
            className="fixed bottom-6 right-6 z-35 bg-[#25D366] hover:bg-emerald-600 transition-all text-white p-4 shadow-[0_0_20px_#25D366] flex items-center justify-center group focus:outline-none cursor-pointer rounded-full"
            title="Chat on WhatsApp"
          >
            <Phone className="w-5 h-5 fill-white-30" />
            <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 group-hover:ml-2.5 font-sans font-black text-xs tracking-widest uppercase">
              WHATSAPP LIVE HELP
            </span>
          </a>

          {/* Background Ambient Music Controller */}
          <div className="fixed bottom-6 left-6 z-35 flex items-center gap-2">
            <button
              onClick={handleToggleMute}
              className="p-3.5 bg-neutral-950/90 hover:bg-black border border-neutral-900 hover:border-[#FF6A00] flex items-center gap-2.5 text-neutral-400 hover:text-white transition-all duration-300 font-mono text-[10px] tracking-widest uppercase cursor-pointer shadow-xl rounded-none"
              title={isMusicMuted ? "Unmute Background Music" : "Mute Background Music"}
            >
              <div className="flex items-center gap-2">
                {!isMusicMuted ? (
                  <span className="flex items-end gap-[2.5px] h-3 w-3.5 mt-0.5">
                    <span className="bg-[#FF6A00] w-[2px] h-full animate-bounce [animation-duration:0.8s]" />
                    <span className="bg-[#FF6A00] w-[2px] h-1/2 animate-bounce [animation-duration:0.5s]" />
                    <span className="bg-[#FF6A00] w-[2px] h-4/5 animate-bounce [animation-duration:0.7s]" />
                  </span>
                ) : (
                  <span className="flex items-end gap-[2.5px] h-3 w-3.5 mt-0.5 opacity-40">
                    <span className="bg-neutral-600 w-[2px] h-0.5" />
                    <span className="bg-neutral-600 w-[2px] h-0.5" />
                    <span className="bg-neutral-600 w-[2px] h-0.5" />
                  </span>
                )}
                <span>{isMusicMuted ? "[ Ambient Muted ]" : "[ Ambient Live ]"}</span>
              </div>
            </button>
          </div>

          {/* Footer Component layouts */}
          <Footer
            setCurrentPage={(page) => {
              setCurrentPage(page);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            instaLink={homepageConfig.instaLink}
            tiktokLink={homepageConfig.tiktokLink}
            facebookLink={homepageConfig.facebookLink}
          />
        </>
      )}
    </div>
  );
}
