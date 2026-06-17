import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db, handleFirestoreError, OperationType, storage, cleanDocData } from '../firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Product, Order, Customer, Message, HomepageConfig } from '../types';
import { Lock, Eye, Check, AlertTriangle, RefreshCw, Plus, Trash2, Edit, Save, Compass, Settings, BarChart2, ShoppingCart, Users, MessageSquare, ShieldAlert, Sparkles, Send, Signal, Ticket } from 'lucide-react';

interface AdminSectionProps {
  products: Product[];
  onRefreshProducts: () => Promise<void>;
  homepageConfig: HomepageConfig;
  onUpdateHomepageConfig: (newConfig: HomepageConfig) => Promise<void>;
}

export default function AdminSection({
  products,
  onRefreshProducts,
  homepageConfig,
  onUpdateHomepageConfig
}: AdminSectionProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Active sub-navigation tabs
  const [activeTab, setActiveTab] = useState<'analytics' | 'products' | 'orders' | 'customers' | 'messages' | 'config' | 'logs' | 'coupons'>('analytics');

  // Firebase state collections
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [isAddingCoupon, setIsAddingCoupon] = useState(false);
  const [couponForm, setCouponForm] = useState({
    id: '',
    discountType: 'percentage' as 'percentage' | 'fixed',
    discountValue: '',
    expiryDate: '',
    isActive: true
  });
  const [isLoading, setIsLoading] = useState(false);

  // Notifications systems
  const [notificationLogs, setNotificationLogs] = useState<any[]>([]);
  const [tgBotToken, setTgBotToken] = useState('');
  const [tgChatId, setTgChatId] = useState('');
  const [twilioSid, setTwilioSid] = useState('');
  const [twilioAuth, setTwilioAuth] = useState('');
  const [twilioSender, setTwilioSender] = useState('');
  const [testSentStatus, setTestSentStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [testError, setTestError] = useState('');

  // CRUD Product Forms State
  const [isEditingProduct, setIsEditingProduct] = useState<Product | null>(null);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [pendingImageFiles, setPendingImageFiles] = useState<{ file: File; previewUrl: string }[]>([]);
  const [productForm, setProductForm] = useState<Partial<Product>>({
    name: '',
    price: 0,
    originalPrice: undefined,
    description: '',
    category: 'T-Shirts',
    type: 'clothes',
    images: [''],
    sizes: [], // will initialize based on type
    colors: [''],
    stock: 10,
    featured: false
  });

  // Screenshot viewer Modal State
  const [viewingScreenshotImg, setViewingScreenshotImg] = useState<string | null>(null);

  // Configuration forms state
  const [configForm, setConfigForm] = useState<HomepageConfig>({ ...homepageConfig });

  // Update form values on prop load
  useEffect(() => {
    setConfigForm({ ...homepageConfig });
  }, [homepageConfig]);

  // Load Admin integrations state
  useEffect(() => {
    // Attempt local storage auth
    const savedAuth = localStorage.getItem('jan_store_admin_auth');
    if (savedAuth === 'true') {
      setIsAuthenticated(true);
    }
    
    // Retrieve Telegram / WhatsApp tokens from localstorage/Firestore if configured
    const savedTgToken = localStorage.getItem('jan_tg_token');
    const savedTgChat = localStorage.getItem('jan_tg_chat');
    const savedTwilioSid = localStorage.getItem('jan_twilio_sid');
    const savedTwilioAuth = localStorage.getItem('jan_twilio_auth');
    const savedTwilioSender = localStorage.getItem('jan_twilio_sender');

    if (savedTgToken) setTgBotToken(savedTgToken);
    if (savedTgChat) setTgChatId(savedTgChat);
    if (savedTwilioSid) setTwilioSid(savedTwilioSid);
    if (savedTwilioAuth) setTwilioAuth(savedTwilioAuth);
    if (savedTwilioSender) setTwilioSender(savedTwilioSender);
  }, []);

  // Sync state collections
  const loadDatabaseCollections = async () => {
    setIsLoading(true);
    try {
      await fetchServerLogs();
    } catch (err) {
      console.error("Local warning fetching server state logs: ", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchServerLogs = async () => {
    try {
      const response = await fetch('/api/notification-logs');
      if (response.ok) {
        const data = await response.json();
        setNotificationLogs(data.logs || []);
      }
    } catch (e) {
      console.warn("Could not retrieve notification logs", e);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    setIsLoading(true);

    const unsubscribeOrders = onSnapshot(collection(db, 'orders'), (snapshot) => {
      const fetchedOrders: Order[] = [];
      const seenOrders = new Set<string>();
      snapshot.forEach((d) => {
        const id = d.id;
        if (!seenOrders.has(id)) {
          seenOrders.add(id);
          fetchedOrders.push({ ...d.data(), id } as Order);
        }
      });
      // Sort orders descending
      fetchedOrders.sort((a, b) => b.createdAt - a.createdAt);
      setOrders(fetchedOrders);
      setIsLoading(false);
    }, (err) => {
      console.error("Error listening to orders:", err);
      handleFirestoreError(err, OperationType.GET, 'orders');
      setIsLoading(false);
    });

    const unsubscribeMsgs = onSnapshot(collection(db, 'messages'), (snapshot) => {
      const fetchedMsgs: Message[] = [];
      const seenMsgs = new Set<string>();
      snapshot.forEach((d) => {
        const id = d.id;
        if (!seenMsgs.has(id)) {
          seenMsgs.add(id);
          fetchedMsgs.push({ ...d.data(), id } as Message);
        }
      });
      fetchedMsgs.sort((a, b) => b.createdAt - a.createdAt);
      setMessages(fetchedMsgs);
    }, (err) => {
      console.error("Error listening to messages:", err);
      handleFirestoreError(err, OperationType.GET, 'messages');
    });

    const unsubscribeCusts = onSnapshot(collection(db, 'customers'), (snapshot) => {
      const fetchedCusts: Customer[] = [];
      const seenCusts = new Set<string>();
      snapshot.forEach((d) => {
        const id = d.id;
        if (!seenCusts.has(id)) {
          seenCusts.add(id);
          fetchedCusts.push({ ...d.data(), id } as Customer);
        }
      });
      fetchedCusts.sort((a, b) => b.ordersCount - a.ordersCount);
      setCustomers(fetchedCusts);
    }, (err) => {
      console.error("Error listening to customers:", err);
      handleFirestoreError(err, OperationType.GET, 'customers');
    });

    const unsubscribeCoupons = onSnapshot(collection(db, 'coupons'), (snapshot) => {
      const fetchedCoupons: any[] = [];
      const seenCoupons = new Set<string>();
      snapshot.forEach((d) => {
        const id = d.id;
        if (!seenCoupons.has(id)) {
          seenCoupons.add(id);
          fetchedCoupons.push({ ...d.data(), id });
        }
      });
      fetchedCoupons.sort((a, b) => b.createdAt - a.createdAt);
      setCoupons(fetchedCoupons);
    }, (err) => {
      console.error("Error listening to coupons:", err);
      handleFirestoreError(err, OperationType.GET, 'coupons');
    });

    // Fetch API logs initially
    fetchServerLogs();

    return () => {
      unsubscribeOrders();
      unsubscribeMsgs();
      unsubscribeCusts();
      unsubscribeCoupons();
    };
  }, [isAuthenticated]);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'jan 2007') {
      setIsAuthenticated(true);
      setLoginError('');
      localStorage.setItem('jan_store_admin_auth', 'true');
    } else {
      setLoginError('INVALID SECURITY CLEARANCE ACCESS CODE.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('jan_store_admin_auth');
  };

  // Status modifiers helper
  const handleUpdateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, { status: newStatus });
      alert(`Order updated to status: ${newStatus}`);
      loadDatabaseCollections();
    } catch (err: any) {
      alert("Error updating order status: " + err?.message);
    }
  };

   // CRUD Product handling
  const clearPendingImageFilesAndRevoke = () => {
    pendingImageFiles.forEach(item => {
      try {
        URL.revokeObjectURL(item.previewUrl);
      } catch (err) {
        console.warn("Could not revoke object URL:", err);
      }
    });
    setPendingImageFiles([]);
  };

  const handleOpenAddProduct = () => {
    clearPendingImageFilesAndRevoke();
    const defaultSizes = ['S', 'M', 'L', 'XL', 'XXL'];
    const defaultSizeStock: Record<string, number> = {};
    defaultSizes.forEach((sz) => {
      defaultSizeStock[sz] = 10;
    });

    setProductForm({
      name: '',
      price: 0,
      originalPrice: undefined,
      description: '',
      category: 'T-Shirts',
      type: 'clothes',
      images: [],
      sizes: defaultSizes,
      sizeStock: defaultSizeStock,
      colors: ['Core Black'],
      stock: 50,
      featured: false
    });
    setIsAddingProduct(true);
    setIsEditingProduct(null);
  };

  const handleOpenEditProduct = (prod: Product) => {
    clearPendingImageFilesAndRevoke();
    const sizeStock = prod.sizeStock ? { ...prod.sizeStock } : {};
    const sizes = prod.sizes || [];
    sizes.forEach((s) => {
      if (sizeStock[s] === undefined) {
        sizeStock[s] = prod.stock || 10;
      }
    });

    setProductForm({ 
      ...prod, 
      images: prod.images ? prod.images.filter(u => u !== '') : [],
      sizes,
      sizeStock 
    });
    setIsEditingProduct(prod);
    setIsAddingProduct(false);
  };

  const handleProductFormSave = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("[DEBUG MODE: SAVE ASSETS] Form submit triggered.");
    console.log("[DEBUG MODE: SAVE ASSETS] Current form values:", {
      name: productForm.name,
      price: productForm.price,
      originalPrice: productForm.originalPrice,
      description: productForm.description,
      category: productForm.category,
      type: productForm.type,
      sizes: productForm.sizes,
      sizeStock: productForm.sizeStock,
      colors: productForm.colors,
      stock: productForm.stock,
      featured: productForm.featured,
      imagesCount: productForm.images?.length,
      pendingCount: pendingImageFiles.length
    });
    
    setIsUploadingImages(true);
    const uploadedUrls: string[] = [...(productForm.images || [])].filter(u => u !== '');
    console.log("[DEBUG MODE: SAVE ASSETS] Initial active image URLs from form state:", uploadedUrls);

    // 1. Upload any pending device images to Firebase Storage first (Requirement 3 & 5)
    if (pendingImageFiles.length > 0) {
      console.log(`[DEBUG MODE: SAVE ASSETS] Found ${pendingImageFiles.length} pending files to upload to Firebase Storage.`);
      try {
        for (let i = 0; i < pendingImageFiles.length; i++) {
          const { file } = pendingImageFiles[i];
          const randomID = Math.random().toString(36).substring(2, 9);
          const fileName = `${Date.now()}_${randomID}_${file.name}`;
          const storageRef = ref(storage, `product_images/${fileName}`);
          
          console.log(`[DEBUG MODE: SAVE ASSETS] [File ${i+1}/${pendingImageFiles.length}] Uploading filename: ${file.name} to path: product_images/${fileName}`);
          const snapshot = await uploadBytes(storageRef, file);
          const url = await getDownloadURL(snapshot.ref);
          console.log(`[DEBUG MODE: SAVE ASSETS] [File ${i+1}/${pendingImageFiles.length}] Upload completed. Storage result URL: ${url}`);
          uploadedUrls.push(url);
        }
      } catch (uploadErr: any) {
        console.error("[DEBUG MODE: SAVE ASSETS] Firebase Storage Upload failed: ", uploadErr);
        alert(`Failed to upload images to Firebase Storage: ${uploadErr?.message || uploadErr}`);
        setIsUploadingImages(false);
        return; // Halt save if upload fails
      }
    } else {
      console.log("[DEBUG MODE: SAVE ASSETS] No pending image files to upload.");
    }

    const activeImages = uploadedUrls.filter(u => u !== '');
    console.log("[DEBUG MODE: SAVE ASSETS] Final consolidated image URLs for submission:", activeImages);

    // Validation
    const isNameValid = !!productForm.name;
    const isPriceValid = productForm.price !== undefined && productForm.price !== null && !isNaN(Number(productForm.price)) && Number(productForm.price) >= 0;
    const areImagesValid = activeImages.length > 0;

    console.log("[DEBUG MODE: SAVE ASSETS] Performing client-side validations:", {
      isNameValid,
      isPriceValid,
      priceValue: productForm.price,
      areImagesValid,
      activeImagesCount: activeImages.length
    });

    if (!isNameValid || !isPriceValid || !areImagesValid) {
      console.error("[DEBUG MODE: SAVE ASSETS] Validation failed! Saving halted.", {
        nameError: !isNameValid ? 'Product Name is empty' : null,
        priceError: !isPriceValid ? 'Price is invalid/negative' : null,
        imagesError: !areImagesValid ? 'No active image URLs provided' : null
      });
      alert("Please provide a valid Product Name, non-negative Price, and upload/select at least one product image.");
      setIsUploadingImages(false);
      return;
    }

    console.log("[DEBUG MODE: SAVE ASSETS] All client-side validations passed. Preparing payload...");

    // 1. Calculate stock automatically from sizeStock
    let calculatedStock = 0;
    if (productForm.sizes && productForm.sizes.length > 0 && productForm.sizeStock) {
      calculatedStock = productForm.sizes.reduce((sum, sz) => {
        const qty = productForm.sizeStock?.[sz];
        const val = Number(qty);
        return sum + (isNaN(val) ? 0 : val);
      }, 0);
      console.log("[DEBUG MODE: SAVE ASSETS] Calculated stock sum from sizeStock:", calculatedStock);
    } else {
      // 3. Fallback: If stock is undefined, null or NaN, default to 0
      const fallbackStock = Number(productForm.stock);
      calculatedStock = isNaN(fallbackStock) ? 0 : fallbackStock;
      console.log("[DEBUG MODE: SAVE ASSETS] Fallback stock value from productForm:", calculatedStock);
    }

    // 6. Safeguard: ensure stock is a safe positive integer and never NaN
    const safeStock = isNaN(calculatedStock) || calculatedStock === null || calculatedStock === undefined ? 0 : Math.max(0, Math.floor(calculatedStock));
    console.log("[DEBUG MODE: SAVE ASSETS] Final safeStock value specified for persistence:", safeStock);

    // 2. Persist ONLY URL strings array to Firestore database (Requirement 3)
    try {
      const submission = {
        ...productForm,
        images: activeImages,
        price: Number(productForm.price),
        originalPrice: productForm.originalPrice ? Number(productForm.originalPrice) : undefined,
        stock: safeStock,
        createdAt: isEditingProduct ? isEditingProduct.createdAt : Date.now()
      };

      const sanitizedData = cleanDocData(submission);
      console.log("[DEBUG MODE: SAVE ASSETS] Final stock value in sanitizedData before write:", sanitizedData.stock);
      console.log("[DEBUG MODE: SAVE ASSETS] Saving sanitized product fields to Firestore: ", sanitizedData);

      if (isEditingProduct) {
        console.log(`[DEBUG MODE: SAVE ASSETS] EDIT FLOW. Targeting document ID: ${isEditingProduct.id} in collection: products`);
        const prodRef = doc(db, 'products', isEditingProduct.id);
        await updateDoc(prodRef, sanitizedData);
        console.log(`[DEBUG MODE: SAVE ASSETS] Document ${isEditingProduct.id} in products updated successfully in Firestore!`);
        alert("Product updated successfully!");
      } else {
        console.log("[DEBUG MODE: SAVE ASSETS] CREATE FLOW. Adding new document into collection: products");
        const docRef = await addDoc(collection(db, 'products'), sanitizedData);
        console.log(`[DEBUG MODE: SAVE ASSETS] New document created with auto-id: ${docRef.id} in products!`);
        alert("New product registered successfully!");
      }

      console.log("[DEBUG MODE: SAVE ASSETS] Performing post-save state cleanups...");
      // Cleanup preview URLs
      clearPendingImageFilesAndRevoke();
      setIsAddingProduct(false);
      setIsEditingProduct(null);
      
      try {
        console.log("[DEBUG MODE: SAVE ASSETS] Invoking onRefreshProducts to load updated data...");
        await onRefreshProducts();
        console.log("[DEBUG MODE: SAVE ASSETS] onRefreshProducts completed successfully.");
      } catch (e) {
        console.warn("[DEBUG MODE: SAVE ASSETS] Safe non-blocking config reload warning:", e);
      }
    } catch (err: any) {
      console.error("[DEBUG MODE: SAVE ASSETS] Error saving product to Firestore:", err);
      alert("Error saving product catalog: " + err?.message);
    } finally {
      setIsUploadingImages(false);
      console.log("[DEBUG MODE: SAVE ASSETS] Save execution complete.");
    }
  };

  const handleDeleteProduct = async (prodId: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      console.log(`[DEBUG MODE] Deleting product from Firestore: ${prodId}`);
      await deleteDoc(doc(db, 'products', prodId));
      alert("Product removed from catalog.");
      try {
        await onRefreshProducts();
      } catch (e) {
        console.warn("[DEBUG MODE] Safe non-blocking config reload warning:", e);
      }
    } catch (err: any) {
      console.error("[DEBUG MODE] Error deleting product from Firestore:", err);
      alert("Error removing product: " + err?.message);
    }
  };

  const handleMultipleImageFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newPending: { file: File; previewUrl: string }[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const previewUrl = URL.createObjectURL(file);
      newPending.push({ file, previewUrl });
    }

    setPendingImageFiles((prev) => [...prev, ...newPending]);
  };

  const handleRemovePendingImage = (idx: number) => {
    setPendingImageFiles((prev) => {
      const copy = [...prev];
      const removed = copy.splice(idx, 1)[0];
      if (removed) {
        try {
          URL.revokeObjectURL(removed.previewUrl);
        } catch (err) {
          console.warn("Could not revoke object URL:", err);
        }
      }
      return copy;
    });
  };

  const handleRemoveImageAtIndex = (idx: number) => {
    const orig = [...(productForm.images || [])];
    orig.splice(idx, 1);
    setProductForm({
      ...productForm,
      images: orig.length > 0 ? orig : []
    });
  };

  const handleAddNewCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponForm.id || !couponForm.discountValue) {
      alert("Please provide Code and Value.");
      return;
    }
    const couponId = couponForm.id.trim().toUpperCase();
    if (!couponId) {
      alert("Invalid Code");
      return;
    }
    try {
      await setDoc(doc(db, 'coupons', couponId), {
        discountType: couponForm.discountType,
        discountValue: Number(couponForm.discountValue),
        expiryDate: couponForm.expiryDate || null,
        isActive: couponForm.isActive,
        createdAt: Date.now()
      });
      alert(`Coupon ${couponId} created successfully!`);
      // Reset Form State
      setCouponForm({
        id: '',
        discountType: 'percentage',
        discountValue: '',
        expiryDate: '',
        isActive: true
      });
      setIsAddingCoupon(false);
      await loadDatabaseCollections();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `coupons/${couponId}`);
    }
  };

  const handleDeleteCoupon = async (code: string) => {
    if (!confirm(`Are you sure you want to delete coupon ${code}?`)) return;
    try {
      await deleteDoc(doc(db, 'coupons', code));
      alert(`Coupon ${code} deleted.`);
      await loadDatabaseCollections();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `coupons/${code}`);
    }
  };

  const handleToggleCouponActive = async (coupon: any) => {
    try {
      await updateDoc(doc(db, 'coupons', coupon.id), {
        isActive: !coupon.isActive
      });
      await loadDatabaseCollections();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `coupons/${coupon.id}`);
    }
  };

  const handleSaveHomepageConfig = async () => {
    try {
      await onUpdateHomepageConfig(configForm);
      alert("Dynamic homepage layout and announcements successfully updated!");
    } catch (err: any) {
      alert("Failed updating config: " + err?.message);
    }
  };

  // Test Telegram credentials
  const handleTestTelegram = async () => {
    if (!tgBotToken || !tgChatId) {
      alert("Please enter Telegram Bot Token and Chat ID to test.");
      return;
    }
    setTestSentStatus('testing');
    setTestError('');
    try {
      const resp = await fetch('/api/test-telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botToken: tgBotToken, chatId: tgChatId })
      });
      const data = await resp.json();
      if (resp.ok) {
        setTestSentStatus('success');
        // Save to client context
        localStorage.setItem('jan_tg_token', tgBotToken);
        localStorage.setItem('jan_tg_chat', tgChatId);
        fetchServerLogs();
      } else {
        setTestSentStatus('failed');
        setTestError(data.error || "Message delivery failed.");
      }
    } catch (e: any) {
      setTestSentStatus('failed');
      setTestError(e.message || String(e));
    }
  };

  const handleSaveWhatsAppConfig = () => {
    localStorage.setItem('jan_twilio_sid', twilioSid);
    localStorage.setItem('jan_twilio_auth', twilioAuth);
    localStorage.setItem('jan_twilio_sender', twilioSender);
    alert("WhatsApp Twilio credentials cached locally on the server context!");
  };

  // Aggregate analytics details
  const totalEarnings = orders
    .filter(o => o.status !== 'Pending Review')
    .reduce((acc, o) => acc + o.total, 0);

  const pendingCount = orders.filter(o => o.status === 'Pending Review').length;

  return (
    <div className="min-h-screen bg-black text-white pt-24 pb-16 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Lock Clearance Box Protection */}
        {!isAuthenticated ? (
          <div className="max-w-md mx-auto my-12 bg-neutral-950 border border-neutral-900 p-8 shadow-[0_0_50px_rgba(255,106,0,0.06)] relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-[#FF6A00]" />
            <div className="flex flex-col items-center text-center">
              <div className="p-4 bg-orange-600/10 border border-[#FF6A00] text-[#FF6A00] mb-6 rounded-none">
                <Lock className="w-8 h-8 animate-pulse" />
              </div>
              <h2 className="font-sans font-black tracking-widest text-lg uppercase mb-2">SECURED CONTROLS</h2>
              <p className="font-mono text-[9px] text-neutral-500 uppercase tracking-widest leading-relaxed mb-6">
                Enter your security coordinator authorization code. Controlled elements are log encrypted.
              </p>

              <form onSubmit={handleLoginSubmit} className="w-full space-y-4">
                <div className="space-y-1 text-left">
                  <label className="font-mono text-[10px] text-neutral-400 tracking-widest uppercase">AUTHORIZATION KEY</label>
                  <input
                    type="password"
                    placeholder="ENTER ACCESS KEY"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-black border border-neutral-800 focus:border-[#FF6A00] px-4 py-3 text-sm text-white font-mono tracking-widest focus:outline-none placeholder-neutral-700"
                  />
                </div>

                {loginError && (
                  <div className="p-3 bg-red-950/20 border border-red-900 text-red-500 font-mono text-[10px] tracking-wider uppercase text-left flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 flex-none mt-0.5" />
                    <span>{loginError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-[#FF6A00] hover:bg-[#FF6A00]/90 text-black font-sans font-black tracking-widest text-xs py-3.5 flex items-center justify-center gap-2 cursor-pointer transition-all shadow-[0_0_15px_rgba(255,106,0,0.15)]"
                >
                  DECRYPT TERMINAL
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div>
            {/* Authenticated Dashboard Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-neutral-900 mb-8">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-red-600/10 border border-red-500 text-red-500 font-mono font-bold text-[9px] uppercase px-2 py-0.5 tracking-widest">
                    SYSTEM LIVE_OPERATIONAL
                  </span>
                  <span className="font-mono text-[9px] text-neutral-500 uppercase tracking-wider">
                    ID: JAN_HQ_2007
                  </span>
                </div>
                <h1 className="font-sans font-black text-3xl sm:text-4xl text-white tracking-tighter uppercase leading-none">
                  SUPER ADMIN DASHBOARD
                </h1>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={loadDatabaseCollections}
                  disabled={isLoading}
                  className="p-2 border border-neutral-800 hover:border-white hover:text-white text-neutral-400 font-bold transition-all cursor-pointer flex items-center gap-2 text-xs font-mono"
                  title="Synchronize Database Collections"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>REFRESH SYNC</span>
                </button>

                <button
                  onClick={handleLogout}
                  className="px-4 py-2 border border-red-950/40 text-red-500 bg-red-950/5 hover:bg-red-500 hover:text-black font-mono font-bold text-xs tracking-wider transition-all cursor-pointer"
                >
                  LOCK CONTROLS
                </button>
              </div>
            </div>

            {/* Analytical Totals Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-neutral-950 border border-neutral-900 p-6 flex flex-col justify-between">
                <div className="flex items-center justify-between text-neutral-500 font-mono text-[10px] uppercase tracking-widest">
                  <span>TOTAL SALES REVENUE</span>
                  <BarChart2 className="w-4 h-4 text-[#FF6A00]" />
                </div>
                <h3 className="font-sans font-black text-3xl text-white tracking-tight mt-3">
                  {totalEarnings} <span className="text-xs font-mono font-bold text-neutral-500">EGP</span>
                </h3>
                <p className="font-mono text-[8px] text-neutral-600 uppercase mt-2">
                  Excludes Pending Reviews
                </p>
              </div>

              <div className="bg-neutral-950 border border-neutral-900 p-6 flex flex-col justify-between">
                <div className="flex items-center justify-between text-neutral-500 font-mono text-[10px] uppercase tracking-widest">
                  <span>ORDERS SUBMITTED</span>
                  <ShoppingCart className="w-4 h-4 text-[#FF6A00]" />
                </div>
                <h3 className="font-sans font-black text-3xl text-white tracking-tight mt-3">
                  {orders.length} <span className="text-xs font-mono font-bold text-neutral-500">ORDERS</span>
                </h3>
                <p className="font-mono text-[8px] text-neutral-600 uppercase mt-2 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full inline-block animate-ping" />
                  {pendingCount} IN REVIEW COPIES
                </p>
              </div>

              <div className="bg-neutral-950 border border-neutral-900 p-6 flex flex-col justify-between">
                <div className="flex items-center justify-between text-neutral-500 font-mono text-[10px] uppercase tracking-widest">
                  <span>PRODUCTS ON SHELF</span>
                  <Compass className="w-4 h-4 text-[#FF6A00]" />
                </div>
                <h3 className="font-sans font-black text-3xl text-white tracking-tight mt-3">
                  {products.length} <span className="text-xs font-mono font-bold text-neutral-500">ITEMS</span>
                </h3>
                <p className="font-mono text-[8px] text-neutral-600 uppercase mt-2">
                  Separate Clothing & Footwear
                </p>
              </div>

              <div className="bg-neutral-950 border border-neutral-900 p-6 flex flex-col justify-between">
                <div className="flex items-center justify-between text-neutral-500 font-mono text-[10px] uppercase tracking-widest">
                  <span>MESSAGES FILED</span>
                  <MessageSquare className="w-4 h-4 text-[#FF6A00]" />
                </div>
                <h3 className="font-sans font-black text-3xl text-white tracking-tight mt-3">
                  {messages.length} <span className="text-xs font-mono font-bold text-neutral-500">MESSAGES</span>
                </h3>
                <p className="font-mono text-[8px] text-neutral-600 uppercase mt-2">
                  Customer feedback direct
                </p>
              </div>
            </div>

            {/* Dashboard Sub-navigation Tabs */}
            <div className="flex flex-wrap items-center gap-2 border-b border-neutral-900 pb-3 mb-8">
              {[
                { id: 'analytics', label: 'ANALYTICS', icon: BarChart2 },
                { id: 'products', label: 'PRODUCT CATALOG', icon: Compass },
                { id: 'orders', label: 'CUSTOMER ORDERS', icon: ShoppingCart },
                { id: 'coupons', label: 'COUPONS MANAGER', icon: Ticket },
                { id: 'customers', label: 'CUSTOMERS LOG', icon: Users },
                { id: 'messages', label: 'INBOX', icon: MessageSquare },
                { id: 'config', label: 'STORE LAYOUT', icon: Settings },
                { id: 'logs', label: 'NOTIFICATIONS LOGS', icon: Signal }
              ].map((tab) => {
                const IconComp = tab.icon;
                const isSelected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-4 py-2.5 text-xs font-mono font-bold uppercase transition-all border cursor-pointer ${
                      isSelected
                        ? 'bg-[#FF6A00] text-black border-[#FF6A00] shadow-[0_0_10px_rgba(255,106,0,0.15)] animate-none'
                        : 'border-neutral-900 text-neutral-450 hover:bg-neutral-950 hover:text-white'
                    }`}
                  >
                    <IconComp className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* TAB CONTENTS */}
            
            {/* ANALYTICS TAB */}
            {activeTab === 'analytics' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Sales performance list */}
                  <div className="bg-neutral-950 border border-neutral-900 p-6">
                    <h3 className="font-sans font-black text-sm tracking-wider uppercase mb-6 text-white border-b border-neutral-900 pb-3">
                      TOP CONSTRUCT SALES DEMAND
                    </h3>
                    <div className="space-y-4">
                      {products.slice(0, 4).map((p, i) => (
                        <div key={p.id} className="flex items-center gap-4 py-1.5">
                          <span className="font-mono text-xs text-neutral-500">0{i+1}</span>
                          <div className="w-8 aspect-square bg-neutral-900 border border-neutral-800 overflow-hidden flex-none">
                            <img src={p.images[0]} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-sans font-extrabold text-xs text-neutral-200 uppercase truncate">{p.name}</p>
                            <p className="font-mono text-[9px] text-neutral-500 uppercase">{p.category} // {p.price} EGP</p>
                          </div>
                          <div className="text-right">
                            <span className="font-sans font-black text-xs text-[#FF6A00]">{p.stock} LEFT</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Operational status dashboard */}
                  <div className="bg-neutral-950 border border-neutral-900 p-6 flex flex-col justify-between">
                    <div>
                      <h3 className="font-sans font-black text-sm tracking-wider uppercase mb-6 text-white border-b border-neutral-900 pb-3">
                        DISPATCH MONITOR
                      </h3>
                      <div className="space-y-3 font-mono text-xs text-neutral-400">
                        <div className="flex justify-between py-1 border-b border-neutral-900">
                          <span>SHIPPING SERVICES STATUS</span>
                          <span className="text-emerald-500">PROMO_DISPATCH</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-neutral-900">
                          <span>SUPPORT BOT ENGINES</span>
                          <span className="text-[#FF6A00]">TELEGRAM_BOT // DISPATCHED</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-neutral-900">
                          <span>WHATSAPP ALERTS TERMINAL</span>
                          <span className="text-neutral-500">STANDBY_TUNNELED</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-neutral-900">
                          <span>GATEWAY REGION</span>
                          <span className="text-white">CAIRO, EG (UTC+2)</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 p-4 border border-dashed border-[#FF6A00]/20 bg-orange-600/5 text-[#FF6A00] font-mono text-[10px] tracking-widest uppercase flex items-center gap-3">
                      <Sparkles className="w-5 h-5 flex-none" />
                      <span>JAN COUTURE BRAND METRICS HEALTHY. BRAND REPUTATION INDEX 100% SECURED.</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PRODUCT CATALOG TAB - CRUDS */}
            {activeTab === 'products' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center bg-neutral-950 p-4 border border-neutral-900">
                  <span className="font-mono text-[11px] text-neutral-400 tracking-wider">
                    {products.length} REGISTERED PRODUCTS IN CONTROLLERS
                  </span>
                  <button
                    onClick={handleOpenAddProduct}
                    className="px-4 py-2 bg-[#FF6A00] text-black font-sans font-black tracking-widest text-[10px] uppercase hover:bg-white transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>ADD SHELF PRODUCT</span>
                  </button>
                </div>

                {/* ADD/EDIT FORM DRAWER */}
                <AnimatePresence>
                  {(isAddingProduct || isEditingProduct) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-neutral-950 border border-[#FF6A00]/30 p-6 space-y-6 overflow-hidden"
                    >
                      <h4 className="font-sans font-black tracking-widest text-xs uppercase text-[#FF6A00] border-b border-neutral-900 pb-2">
                        {isAddingProduct ? 'ENTER NEW SHELF PRODUCT' : `EDITING COMPONENT [ID: ${isEditingProduct?.id}]`}
                      </h4>

                      <form onSubmit={handleProductFormSave} className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-xs">
                        {/* Title col */}
                        <div className="space-y-1">
                          <label className="text-neutral-400 tracking-wider">PRODUCT NAME</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. JAN INDUSTRIAL WIND BREAKER"
                            value={productForm.name}
                            onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                            className="w-full bg-black border border-neutral-800 focus:border-[#FF6A00] px-3 py-2 text-white focus:outline-none uppercase"
                          />
                        </div>

                        {/* Dropdown Type select */}
                        <div className="space-y-1">
                          <label className="text-neutral-400 tracking-wider">PRODUCT SECTOR</label>
                          <select
                            value={productForm.type}
                            onChange={(e) => {
                              const v = e.target.value as 'clothes' | 'shoes';
                              // Auto-swap default size brackets
                              const sizes = v === 'clothes' ? ['S', 'M', 'L', 'XL', 'XXL'] : ['41', '42', '43', '44', '45'];
                              setProductForm({ ...productForm, type: v, sizes });
                            }}
                            className="w-full bg-black border border-neutral-800 focus:border-[#FF6A00] px-3 py-2 text-white focus:outline-none"
                          >
                            <option value="clothes">CLOTHING (T-SHIRT, HOODIE, JACKET, ETC.)</option>
                            <option value="shoes">FOOTWEAR (SNEAKER, SHOES)</option>
                          </select>
                        </div>

                        {/* Category */}
                        <div className="space-y-1">
                          <label className="text-neutral-400 tracking-wider">CATEGORY DISPLAY TAG</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Hoodies, sneakers, pants"
                            value={productForm.category}
                            onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                            className="w-full bg-black border border-neutral-800 focus:border-[#FF6A00] px-3 py-2 text-white focus:outline-none uppercase"
                          />
                        </div>

                        {/* Price */}
                        <div className="space-y-1">
                          <label className="text-neutral-400 tracking-wider">DISPLAY PRICE (EGP)</label>
                          <input
                            type="number"
                            required
                            min={0}
                            placeholder="Price in Egyptian Pound"
                            value={productForm.price || ''}
                            onChange={(e) => setProductForm({ ...productForm, price: Number(e.target.value) })}
                            className="w-full bg-black border border-neutral-800 focus:border-[#FF6A00] px-3 py-2 text-white focus:outline-none"
                          />
                        </div>

                        {/* Discount / Original price */}
                        <div className="space-y-1">
                          <label className="text-neutral-400 tracking-wider">ORIGINAL COMPARE PRICE (EGP, OPTIONAL)</label>
                          <input
                            type="number"
                            min={0}
                            placeholder="Leave blank if no active discount sale"
                            value={productForm.originalPrice || ''}
                            onChange={(e) => setProductForm({ ...productForm, originalPrice: e.target.value ? Number(e.target.value) : undefined })}
                            className="w-full bg-black border border-neutral-800 focus:border-[#FF6A00] px-3 py-2 text-white focus:outline-none"
                          />
                        </div>

                        {/* Stock */}
                        <div className="space-y-1">
                          <label className="text-neutral-500 tracking-wider">TOTAL INVENTORY STOCK (AUTO SUM)</label>
                          <input
                            type="number"
                            readOnly
                            disabled
                            value={productForm.stock || 0}
                            className="w-full bg-neutral-950 border border-neutral-900 px-3 py-2 text-neutral-500 focus:outline-none cursor-not-allowed font-mono"
                          />
                        </div>

                        {/* Color specifications */}
                        <div className="space-y-1">
                          <label className="text-neutral-400 tracking-wider">FABRIC COLORS (COMMA-SEPARATED)</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Tactical Black, Matte Orange"
                            value={productForm.colors?.join(', ') || ''}
                            onChange={(e) => setProductForm({ ...productForm, colors: e.target.value.split(',').map(s => s.trim()) })}
                            className="w-full bg-black border border-neutral-800 focus:border-[#FF6A00] px-3 py-2 text-white focus:outline-none"
                          />
                        </div>

                        {/* Array sizes toggle box */}
                        <div className="space-y-2 col-span-1 md:col-span-2">
                          <label className="text-neutral-400 tracking-wider block">CONSTRUCTED SIZE COUPLING (SELECT ALL APPLICABLE)</label>
                          <div className="flex flex-wrap gap-2 pt-1">
                            {((productForm.type === 'clothes') 
                                ? ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'] 
                                : ['39', '40', '41', '42', '43', '44', '45', '46']
                            ).map((size) => {
                              const included = productForm.sizes?.includes(size);
                              return (
                                <button
                                  type="button"
                                  key={size}
                                  onClick={() => {
                                    const currentSizes = productForm.sizes || [];
                                    const nextSizes = included
                                      ? currentSizes.filter(s => s !== size)
                                      : [...currentSizes, size];

                                    const nextSizeStock = { ...(productForm.sizeStock || {}) };
                                    if (included) {
                                      delete nextSizeStock[size];
                                    } else {
                                      nextSizeStock[size] = 10; // default initial stock
                                    }
                                    const totalStock = Object.values(nextSizeStock).reduce((acc: number, qty: any) => acc + (typeof qty === 'number' ? qty : 0), 0);

                                    setProductForm({ 
                                      ...productForm, 
                                      sizes: nextSizes,
                                      sizeStock: nextSizeStock,
                                      stock: totalStock
                                    });
                                  }}
                                  className={`px-3 py-1.5 border text-xs font-mono font-bold cursor-pointer transition-colors ${
                                    included
                                      ? 'bg-neutral-200 text-black border-white'
                                      : 'border-neutral-800 hover:border-neutral-500 text-neutral-400'
                                  }`}
                                >
                                  {size}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Size Specific Stock entry grids */}
                        {productForm.sizes && productForm.sizes.length > 0 && (
                          <div className="space-y-3 col-span-1 md:col-span-2 p-4 bg-zinc-950 border border-neutral-900">
                            <label className="text-neutral-300 font-mono tracking-widest text-[11px] uppercase block">// SIZE SPECIFIC INVENTORY VALUES (EDIT HERE)</label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              {productForm.sizes.map((sz) => {
                                const val = productForm.sizeStock ? (productForm.sizeStock[sz] !== undefined ? productForm.sizeStock[sz] : 10) : 10;
                                return (
                                  <div key={sz} className="space-y-1">
                                    <label className="text-neutral-500 text-[10px] font-mono tracking-wider">SIZE {sz} STOCK</label>
                                    <input
                                      type="number"
                                      min={0}
                                      required
                                      value={val}
                                      onChange={(e) => {
                                        const updatedStock = {
                                          ...(productForm.sizeStock || {}),
                                          [sz]: Number(e.target.value)
                                        };
                                        const totalStock = Object.values(updatedStock).reduce((acc: number, qty: any) => acc + (typeof qty === 'number' ? qty : 0), 0);
                                        setProductForm({
                                          ...productForm,
                                          sizeStock: updatedStock,
                                          stock: totalStock
                                        });
                                      }}
                                      className="w-full bg-black border border-neutral-800 focus:border-[#FF6A00] px-3 py-1.5 text-xs text-white uppercase"
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Multiple Device Image Upload with previews */}
                        <div className="space-y-3 col-span-1 md:col-span-2 p-4 bg-zinc-950 border border-neutral-900">
                          <label className="text-neutral-300 font-mono tracking-widest text-[11px] uppercase block">// REGISTER COUTURE IMAGES (DEVICE FILES & MULTI-IMAGE GALLERY)</label>
                          
                          <div className="flex flex-wrap items-center gap-4">
                            <input
                              type="file"
                              multiple
                              accept="image/*"
                              id="product-images-upload-input"
                              onChange={handleMultipleImageFilesSelect}
                              className="hidden"
                              disabled={isUploadingImages}
                            />
                            <label
                              htmlFor="product-images-upload-input"
                              className="px-4 py-2.5 bg-neutral-900 border border-neutral-800 hover:border-[#FF6A00] text-neutral-200 hover:text-white font-mono text-xs uppercase cursor-pointer flex items-center gap-2 transition-all font-bold"
                            >
                              {isUploadingImages ? <RefreshCw className="w-4 h-4 animate-spin text-[#FF6A00]" /> : <Plus className="w-4 h-4" />}
                              <span>{isUploadingImages ? 'UPLOADING...' : 'SELECT PHOTOS/FILES'}</span>
                            </label>
                            
                            <span className="font-mono text-[9px] text-neutral-500 uppercase">
                              {(productForm.images || []).filter(u => u !== '').length} existing + {pendingImageFiles.length} pending preview(s)
                            </span>
                          </div>

                          {/* Previews Grid */}
                          {(((productForm.images || []).filter(u => u !== '').length > 0) || pendingImageFiles.length > 0) && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-neutral-900">
                              
                              {/* Existing Uploaded Images */}
                              {(productForm.images || []).filter(u => u !== '').map((url, idx) => (
                                <div key={`uploaded-${idx}`} className="relative aspect-square border border-neutral-800 bg-black group overflow-hidden">
                                  <img
                                    src={url}
                                    alt="Couture Preview"
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-cover"
                                  />
                                  <div className="absolute bottom-1 left-1 bg-green-900/90 text-[8px] font-mono px-1.5 py-0.5 text-green-300 font-bold tracking-widest border border-green-700 uppercase">
                                    ACTIVE
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveImageAtIndex(idx)}
                                    className="absolute top-1 right-1 p-1 bg-neutral-950/80 hover:bg-neutral-900 text-white border border-neutral-800 hover:border-red-500 cursor-pointer text-[10px]"
                                    title="Remove this image"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}

                              {/* Pending Local Preview Files (Requirement 3) */}
                              {pendingImageFiles.map((item, idx) => (
                                <div key={`pending-${idx}`} className="relative aspect-square border border-yellow-800/60 bg-black group overflow-hidden">
                                  <img
                                    src={item.previewUrl}
                                    alt="Pending Preview"
                                    className="w-full h-full object-cover brightness-75"
                                  />
                                  <div className="absolute bottom-1 left-1 bg-yellow-950/90 text-[8px] font-mono px-1.5 py-0.5 text-yellow-400 font-bold tracking-widest border border-yellow-700 uppercase animate-pulse">
                                    PREVIEW
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleRemovePendingImage(idx)}
                                    className="absolute top-1 right-1 p-1 bg-neutral-950/80 hover:bg-neutral-800 text-white border border-neutral-800 hover:border-neutral-500 cursor-pointer text-[10px]"
                                    title="Remove this preview"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}

                            </div>
                          )}
                        </div>

                        {/* Description */}
                        <div className="space-y-1 col-span-1 md:col-span-2">
                          <label className="text-neutral-400 tracking-wider">STREETWEAR COPY DESCRIPTION</label>
                          <textarea
                            required
                            rows={3}
                            placeholder="Describe loopbacks, zippers, embroidery details..."
                            value={productForm.description}
                            onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                            className="w-full bg-black border border-neutral-800 focus:border-[#FF6A00] px-3 py-2 text-white focus:outline-none"
                          />
                        </div>

                        <div className="col-span-1 md:col-span-2 flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="featured"
                            checked={productForm.featured || false}
                            onChange={(e) => setProductForm({ ...productForm, featured: e.target.checked })}
                            className="w-4 h-4 bg-black border-neutral-800 Accent-orange-500 cursor-pointer"
                          />
                          <label htmlFor="featured" className="text-neutral-300 tracking-wider cursor-pointer font-bold uppercase select-none">
                            FEATURE ON HOMEPAGE SLIDESHOW GALLERY
                          </label>
                        </div>

                        {/* Actions buttons */}
                        <div className="col-span-1 md:col-span-2 flex justify-end gap-3 pt-4 border-t border-neutral-900">
                          <button
                            type="button"
                            onClick={() => {
                              setIsAddingProduct(false);
                              setIsEditingProduct(null);
                            }}
                            className="px-4 py-2 border border-neutral-800 hover:border-neutral-600 text-neutral-400 hover:text-white cursor-pointer uppercase text-xs"
                          >
                            CANCEL
                          </button>
                          
                          <button
                            type="submit"
                            className="px-6 py-2.5 bg-[#FF6A00] hover:bg-orange-500 text-black font-sans font-black tracking-widest text-xs uppercase cursor-pointer flex items-center gap-1.5"
                          >
                            <Save className="w-4 h-4" />
                            <span>SAVE ASSETS</span>
                          </button>
                        </div>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Listing of products list */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map((p) => (
                    <div key={p.id} className="bg-neutral-950 border border-neutral-900 p-4 space-y-4 relative flex flex-col justify-between">
                      <div>
                        {/* Img cover */}
                        <div className="aspect-[4/3] bg-neutral-900 border border-neutral-900 overflow-hidden relative mb-3">
                          <img src={p.images[0]} className="w-full h-full object-cover" />
                          <div className="absolute top-2 left-2 bg-black/90 px-2.5 py-0.5 border border-zinc-800 text-[9px] font-mono font-bold uppercase text-neutral-350">
                            {p.category}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 text-neutral-500 font-mono text-[9px] uppercase tracking-wider mb-1">
                          <span>JAN // {p.type.toUpperCase()}</span>
                          <span>•</span>
                          <span>{p.stock} STOCK</span>
                          {p.featured && (
                            <span className="text-[#FF6A00] font-bold">★ FEATURED</span>
                          )}
                        </div>

                        <h5 className="font-sans font-extrabold text-sm text-neutral-100 tracking-wider uppercase truncate">
                          {p.name}
                        </h5>
                        <p className="font-mono text-xs text-white mt-1">
                          {p.price} EGP {p.originalPrice && <span className="text-neutral-500 line-through text-[10px] ml-1.5">{p.originalPrice} EGP</span>}
                        </p>
                      </div>

                      {/* Editing Actions */}
                      <div className="flex gap-2 pt-3 border-t border-neutral-900">
                        <button
                          onClick={() => handleOpenEditProduct(p)}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 border border-neutral-800 hover:border-[#FF6A00] hover:text-[#FF6A00] text-xs font-mono transition-colors cursor-pointer"
                        >
                          <Edit className="w-3 h-3" />
                          <span>EDIT</span>
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p.id)}
                          className="px-3 py-1.5 border border-neutral-900 hover:border-red-900 hover:bg-neutral-950 text-red-500 text-xs font-mono transition-colors cursor-pointer"
                          title="Delete Product"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CUSTOMER ORDERS TAB */}
            {activeTab === 'orders' && (
              <div className="space-y-6">
                <div className="bg-neutral-950 p-4 border border-neutral-900 font-mono text-[11px] text-neutral-400">
                  {orders.length} REGISTERED INCOMING TRANSACTIONS FOR REVIEWING
                </div>

                <div className="space-y-6">
                  {orders.length === 0 ? (
                    <div className="p-12 text-center text-neutral-600 border border-dashed border-neutral-900 font-mono text-sm uppercase">
                      NO INCOMING ORDERS REGISTERED
                    </div>
                  ) : (
                    orders.map((or) => {
                      const orSnippet = or.id.slice(-6).toUpperCase();
                      const dateText = new Date(or.createdAt).toLocaleString();
                      
                      return (
                        <div key={or.id} className="bg-neutral-950 border border-neutral-900 relative">
                          {/* Colored status line */}
                          <div className={`absolute top-0 inset-x-0 h-[2px] ${
                            or.status === 'Pending Review' ? 'bg-yellow-500' :
                            or.status === 'Paid' ? 'bg-indigo-500' :
                            or.status === 'Shipped' ? 'bg-blue-500' : 'bg-emerald-500'
                          }`} />

                          {/* Order metadata summary */}
                          <div className="p-6">
                            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 pb-4 border-b border-neutral-900">
                              <div>
                                <span className="font-mono text-[10px] text-neutral-500 block uppercase">
                                  TIMESTAMP: {dateText} // ADDR_ID: #{orSnippet}
                                </span>
                                <h4 className="font-sans font-black text-base text-white tracking-widest uppercase mt-1">
                                  ORDER: #{orSnippet}
                                </h4>
                              </div>

                              <div className="flex flex-wrap items-center gap-3">
                                {/* Direct manual status selection */}
                                <div className="space-y-1">
                                  <span className="font-mono text-[9px] text-neutral-500 uppercase block">SET TRANSIT STATE</span>
                                  <select
                                    value={or.status}
                                    onChange={(e) => handleUpdateOrderStatus(or.id, e.target.value as any)}
                                    className="bg-black border border-neutral-800 text-xs text-[#FF6A00] px-3 py-1.5 focus:outline-none font-mono tracking-widest font-bold"
                                  >
                                    <option value="Pending Review">🟢 PENDING MANUAL REVIEW</option>
                                    <option value="Paid">💳 MARK PAID & CONFIRMED</option>
                                    <option value="Shipped">✈️ MARK PACKAGE SHIPPED</option>
                                    <option value="Delivered">📦 MARK DELIVERED</option>
                                  </select>
                                </div>
                              </div>
                            </div>

                            {/* Two cols: Item descriptors vs Customer payments attachments */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 font-mono text-xs text-neutral-300">
                              {/* Left: Customer + items selection */}
                              <div className="space-y-4">
                                <div>
                                  <h5 className="font-sans font-extrabold text-[#FF6A00] tracking-widest uppercase text-xs mb-2">
                                    RECIPIENT DOSSIER
                                  </h5>
                                  <div className="bg-black/45 border border-neutral-900 p-4 space-y-1.5 font-bold">
                                    <p><span className="text-neutral-500">CLIENT:</span> {or.name}</p>
                                    <p><span className="text-neutral-500">PHONE:</span> {or.phone}</p>
                                    <p><span className="text-neutral-500">ADDRESS:</span> {or.address}</p>
                                  </div>
                                </div>

                                <div>
                                  <h5 className="font-sans font-extrabold text-neutral-400 tracking-widest uppercase text-[10px] mb-2">
                                    CART LAYERING
                                  </h5>
                                  <div className="space-y-2">
                                    {or.items.map((it, idx) => (
                                      <div key={idx} className="flex items-center gap-3 py-1.5 border-b border-neutral-900">
                                        <div className="w-8 aspect-square bg-neutral-900 overflow-hidden flex-none">
                                          <img src={it.image} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-grow min-w-0">
                                          <p className="font-sans font-extrabold text-[11px] text-white uppercase truncate">{it.name}</p>
                                          <p className="font-mono text-[9px] text-[#FF6A00] tracking-wider uppercase">
                                            SIZE: {it.size} // COLOR: {it.color}
                                          </p>
                                        </div>
                                        <span className="font-mono font-bold text-neutral-400">{it.quantity}x</span>
                                        <span className="font-bold text-neutral-200">{it.price} EGP</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                <div className="pt-2 border-t border-neutral-900 font-sans font-black flex justify-between text-sm text-white uppercase tracking-wider">
                                  <span>TOTAL TRANSACTION VALUE:</span>
                                  <span className="text-[#FF6A00] font-mono text-base font-black">{or.total} EGP</span>
                                </div>
                              </div>

                              {/* Right: Payments screenshot verification */}
                              <div className="flex flex-col justify-between">
                                <div>
                                  <h5 className="font-sans font-extrabold text-white tracking-widest uppercase text-xs mb-2 flex items-center justify-between">
                                    <span>PROOF OF ATTACHMENT</span>
                                    <span className="font-mono text-[9px] text-[#FF6A00]">
                                      METHOD: {or.paymentMethod.toUpperCase()}
                                    </span>
                                  </h5>

                                  {or.paymentSenderNumber && (
                                    <div className="mb-4 bg-neutral-900 border border-neutral-800 p-3 font-mono text-xs text-neutral-300 space-y-1">
                                      <p className="text-neutral-550 text-[8px] font-bold uppercase tracking-wider">SENDER SATELLITE NUMBER</p>
                                      <p className="text-[#FF6A00] font-black text-sm tracking-widest">{or.paymentSenderNumber}</p>
                                    </div>
                                  )}

                                  {or.couponApplied && (
                                    <div className="mb-4 bg-emerald-950/20 border border-emerald-900/40 p-3 font-mono text-xs text-emerald-500 space-y-1">
                                      <p className="text-emerald-600 text-[8px] font-bold uppercase tracking-wider">APPLIED COUPON</p>
                                      <p className="font-black text-xs">{or.couponApplied} (-{or.discountAmount || 0} EGP)</p>
                                    </div>
                                  )}

                                  {or.paymentScreenshot ? (
                                    <div className="bg-black border border-neutral-900 p-2 text-center group cursor-pointer relative overflow-hidden flex items-center justify-center">
                                      <img
                                        src={or.paymentScreenshot}
                                        alt="Transaction receipt verification"
                                        className="h-44 object-contain brightness-95 group-hover:brightness-100 transition-all"
                                      />
                                      <div
                                        onClick={() => setViewingScreenshotImg(or.paymentScreenshot)}
                                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2"
                                      >
                                        <Eye className="w-4 h-4 text-[#FF6A00]" />
                                        <span className="font-bold uppercase tracking-wider text-[10px] text-white">REVEAL SCREENSHOT</span>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="p-8 text-center text-red-500 border border-neutral-900 font-mono text-[10px] bg-red-950/5 flex flex-col items-center justify-center">
                                      <AlertTriangle className="w-6 h-6 mb-2" />
                                      <span>ERROR: NO SCREENSHOT WAS UPLOADED WITH PAYMENT</span>
                                    </div>
                                  )}
                                </div>

                                <div className="mt-4 p-3 bg-black/50 border border-neutral-900 text-[10px] text-neutral-500 leading-relaxed uppercase">
                                  Verify payments on wallet <b>01227474877</b> against this screenshot. If amount matches total total, change transit state to <b>Mark Paid & Confirmed</b> to update records.
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* CUSTOMERS TAB */}
            {activeTab === 'customers' && (
              <div className="space-y-6">
                <div className="bg-neutral-950 p-4 border border-neutral-900 font-mono text-[11px] text-neutral-400">
                  {customers.length} REGISTERED CUSTOMER DICTIONARIES EXPOSED
                </div>

                <div className="bg-neutral-950 border border-neutral-900 overflow-hidden">
                  <table className="w-full text-left border-collapse font-mono text-xs">
                    <thead>
                      <tr className="border-b border-neutral-900 text-neutral-500 uppercase tracking-widest text-[10px]">
                        <th className="p-4">CLIENT NAME</th>
                        <th className="p-4">PHONE REGISTRY</th>
                        <th className="p-4">DELIVERY DOMAIN</th>
                        <th className="p-4 text-center">ORDER VOLUME</th>
                        <th className="p-4 text-right">CUMULATIVE VALUES</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-900 text-neutral-350">
                      {customers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-neutral-600 uppercase">
                            NO CUSTOMERS DOCUMENTED IN SYSTEM
                          </td>
                        </tr>
                      ) : (
                        customers.map((c) => (
                          <tr key={c.id} className="hover:bg-neutral-950/50">
                            <td className="p-4 font-sans font-extrabold text-white uppercase">{c.name}</td>
                            <td className="p-4 text-[#FF6A00] font-bold">{c.phone}</td>
                            <td className="p-4 truncate max-w-xs">{c.address}</td>
                            <td className="p-4 text-center font-bold text-white">{c.ordersCount}x</td>
                            <td className="p-4 text-right font-black text-[#FF6A00]">{c.totalSpent} EGP</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* MESSAGE INBOX TAB */}
            {activeTab === 'messages' && (
              <div className="space-y-6">
                <div className="bg-neutral-950 p-4 border border-neutral-900 font-mono text-[11px] text-neutral-400">
                  {messages.length} CUSTOMER INCOMING CONTACT SUBMISSIONS
                </div>

                <div className="space-y-4">
                  {messages.length === 0 ? (
                    <div className="p-12 text-center text-neutral-600 border border-dashed border-neutral-900 font-mono text-sm uppercase">
                      INBOX EMPTY
                    </div>
                  ) : (
                    messages.map((m) => {
                      const dateString = new Date(m.createdAt).toLocaleString();
                      return (
                        <div key={m.id} className="bg-neutral-950 border border-neutral-900 p-6 flex flex-col justify-between">
                          <div className="flex justify-between items-start border-b border-neutral-900 pb-3 mb-4">
                            <div>
                              <h5 className="font-sans font-black text-sm text-white tracking-widest uppercase">
                                MESSAGE FROM: {m.name}
                              </h5>
                              <p className="font-mono text-[9px] text-[#FF6A00] tracking-widest uppercase mt-1">
                                EMAIL: {m.email} // PHONE: {m.phone}
                              </p>
                            </div>
                            <span className="font-mono text-[9px] text-neutral-600">{dateString}</span>
                          </div>

                          <p className="font-sans text-neutral-300 text-xs leading-relaxed italic bg-black/45 p-4 border border-neutral-950 font-medium">
                            "{m.message}"
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* COUPON MANAGER TAB VIEW */}
            {activeTab === 'coupons' && (
              <div className="space-y-6 animate-fadeIn font-mono text-xs">
                <div className="flex justify-between items-center border-b border-neutral-900 pb-4">
                  <div>
                    <h3 className="text-sm font-sans font-black tracking-widest text-white uppercase">// COUPONS MANAGER</h3>
                    <p className="text-neutral-500 text-[10px] uppercase">Create and manage active checkout discount codes</p>
                  </div>
                  <button
                    onClick={() => setIsAddingCoupon(!isAddingCoupon)}
                    className="px-4 py-2 bg-[#FF6A01] hover:bg-[#FF6A00] text-black font-sans font-black tracking-widest text-[11px] uppercase transition-all cursor-pointer"
                  >
                    {isAddingCoupon ? 'CLOSE CONSOLE' : 'CREATE COUPON'}
                  </button>
                </div>

                {isAddingCoupon && (
                  <form onSubmit={handleAddNewCoupon} className="p-6 bg-neutral-950 border border-neutral-900 space-y-4 max-w-xl">
                    <span className="text-[#FF6A00] font-bold block uppercase tracking-wider">// CREATE ACTION INITIALIZATION</span>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-neutral-500 font-bold uppercase block">COUPON CODE (UPPERCASE)</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. EXTRA20"
                          value={couponForm.id}
                          onChange={(e) => setCouponForm({ ...couponForm, id: e.target.value.toUpperCase() })}
                          className="w-full bg-black border border-neutral-800 focus:border-[#FF6A00] px-3 py-2 text-white focus:outline-none uppercase"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-neutral-500 font-bold uppercase block">DISCOUNT TYPE</label>
                        <select
                          value={couponForm.discountType}
                          onChange={(e) => setCouponForm({ ...couponForm, discountType: e.target.value as any })}
                          className="w-full bg-black border border-neutral-800 focus:border-[#FF6A00] px-3 py-2 text-white focus:outline-none uppercase font-bold"
                        >
                          <option value="percentage">percentage (%)</option>
                          <option value="fixed">Fixed value (EGP)</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-neutral-500 font-bold uppercase block">DISCOUNT VALUE</label>
                        <input
                          type="number"
                          required
                          min={1}
                          placeholder={couponForm.discountType === 'percentage' ? 'e.g. 20' : 'e.g. 150'}
                          value={couponForm.discountValue}
                          onChange={(e) => setCouponForm({ ...couponForm, discountValue: e.target.value })}
                          className="w-full bg-black border border-neutral-800 focus:border-[#FF6A00] px-3 py-2 text-white focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-neutral-500 font-bold uppercase block">EXPIRY DATE (OPTIONAL)</label>
                        <input
                          type="date"
                          value={couponForm.expiryDate}
                          onChange={(e) => setCouponForm({ ...couponForm, expiryDate: e.target.value })}
                          className="w-full bg-black border border-neutral-800 focus:border-[#FF6A00] px-3 py-2 text-white focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="coupon-active-checkbox"
                        checked={couponForm.isActive}
                        onChange={(e) => setCouponForm({ ...couponForm, isActive: e.target.checked })}
                        className="rounded bg-black border-neutral-800 text-[#FF6A00] focus:ring-0 cursor-pointer"
                      />
                      <label htmlFor="coupon-active-checkbox" className="text-neutral-400 font-bold uppercase cursor-pointer">
                        Mark Coupon Active immediately
                      </label>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-[#FF6A00] text-black font-sans font-black tracking-widest text-xs py-3 uppercase hover:bg-white transition-all cursor-pointer"
                    >
                      COMMIT COUPON TO DATABASE
                    </button>
                  </form>
                )}

                <div className="border border-neutral-900 overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-neutral-950 text-neutral-500 font-bold border-b border-neutral-900 uppercase">
                        <th className="p-4">COUPON CODE</th>
                        <th className="p-4">DISCOUNT</th>
                        <th className="p-4">EXPIRY</th>
                        <th className="p-4">STATUS</th>
                        <th className="p-4 text-right">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-950">
                      {coupons.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-neutral-600 uppercase">
                            NO ACTIVE DISCOUNTS INSTALLED IN DATABASE.
                          </td>
                        </tr>
                      ) : (
                        coupons.map((cp) => (
                          <tr key={cp.id} className="hover:bg-neutral-950/40 transition-colors">
                            <td className="p-4 text-white font-black tracking-wider">{cp.id}</td>
                            <td className="p-4 text-[#FF6A00] font-bold">
                              {cp.discountType === 'percentage' ? `${cp.discountValue}%` : `${cp.discountValue} EGP`}
                            </td>
                            <td className="p-4 text-neutral-400 font-mono">
                              {cp.expiryDate ? cp.expiryDate : 'NEVER EXPIRES'}
                            </td>
                            <td className="p-4">
                              <span
                                onClick={() => handleToggleCouponActive(cp)}
                                className={`px-2 py-1 text-[10px] font-black cursor-pointer select-none ${
                                  cp.isActive
                                    ? 'bg-[#FF6A00]/15 text-[#FF6A00] border border-[#FF6A00]/40'
                                    : 'bg-neutral-800 text-neutral-500 border border-neutral-900'
                                }`}
                              >
                                {cp.isActive ? 'ACTIVE' : 'INACTIVE'}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <button
                                onClick={() => handleDeleteCoupon(cp.id)}
                                className="p-1 text-neutral-500 hover:text-red-500 transition-colors cursor-pointer"
                                title="Delete Coupon"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* CORE HOMEPAGE & DISK CONFIGURATOR */}
            {activeTab === 'config' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Dynamic Texts Content Editing form col */}
                  <div className="bg-neutral-950 border border-neutral-900 p-6 space-y-6 font-mono text-xs">
                    <h3 className="font-sans font-black text-sm text-[#FF6A00] tracking-widest uppercase border-b border-neutral-900 pb-2">
                      HOMEPAGE STATEMENTS CONTROLS
                    </h3>

                    <div className="space-y-4">
                      {/* Hero title */}
                      <div className="space-y-1">
                        <label className="text-neutral-400">HERO DISPATCH TITLE</label>
                        <input
                          type="text"
                          value={configForm.heroTitle}
                          onChange={(e) => setConfigForm({ ...configForm, heroTitle: e.target.value })}
                          className="w-full bg-black border border-neutral-800 focus:border-[#FF6A00] px-3 py-2 text-white focus:outline-none uppercase font-bold"
                        />
                      </div>

                      {/* Hero Sub */}
                      <div className="space-y-1">
                        <label className="text-neutral-400">HERO DESCRIPTION SUBTITLE</label>
                        <textarea
                          rows={3}
                          value={configForm.heroSubtitle}
                          onChange={(e) => setConfigForm({ ...configForm, heroSubtitle: e.target.value })}
                          className="w-full bg-black border border-neutral-800 focus:border-[#FF6A00] px-3 py-2 text-white focus:outline-none"
                        />
                      </div>

                      {/* Announcement ticker text */}
                      <div className="space-y-1">
                        <label className="text-neutral-400">ANNOUNCEMENT TICKER SCROLLER TEXT</label>
                        <input
                          type="text"
                          value={configForm.announcementText}
                          onChange={(e) => setConfigForm({ ...configForm, announcementText: e.target.value })}
                          className="w-full bg-black border border-neutral-800 focus:border-[#FF6A00] px-3 py-2 text-[#FF6A00] focus:outline-none font-bold uppercase"
                        />
                      </div>

                      {/* Hero Image */}
                      <div className="space-y-1">
                        <label className="text-neutral-400">HERO COVER BANNER BACKDROP IMAGE URL</label>
                        <input
                          type="text"
                          value={configForm.heroBannerImg}
                          onChange={(e) => setConfigForm({ ...configForm, heroBannerImg: e.target.value })}
                          className="w-full bg-black border border-neutral-800 focus:border-[#FF6A00] px-3 py-2 text-white focus:outline-none"
                        />
                      </div>

                      {/* Promo label text */}
                      <div className="space-y-1">
                        <label className="text-neutral-400">HERO PROMO BADGE TEXT</label>
                        <input
                          type="text"
                          value={configForm.heroPromoText}
                          onChange={(e) => setConfigForm({ ...configForm, heroPromoText: e.target.value })}
                          className="w-full bg-black border border-neutral-800 focus:border-[#FF6A00] px-3 py-2 text-white focus:outline-none font-bold uppercase"
                        />
                      </div>

                      {/* Brand story */}
                      <div className="space-y-1">
                        <label className="text-neutral-400">BRAND STORY / ABOUT PARAGRAPH</label>
                        <textarea
                          rows={4}
                          value={configForm.aboutText}
                          onChange={(e) => setConfigForm({ ...configForm, aboutText: e.target.value })}
                          className="w-full bg-black border border-neutral-800 focus:border-[#FF6A00] px-3 py-2 text-white focus:outline-none"
                        />
                      </div>

                      {/* Save configuration buttons */}
                      <div className="pt-4 border-t border-neutral-900 text-right">
                        <button
                          type="button"
                          onClick={handleSaveHomepageConfig}
                          className="px-6 py-3 bg-[#FF6A00] text-black font-sans font-black tracking-widest text-xs uppercase hover:bg-white transition-colors cursor-pointer"
                        >
                          SAVE VISUAL CONTEXT
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Real-time Bot configuration tester panels col */}
                  <div className="space-y-6">
                    {/* Telegram Panel configuration */}
                    <div className="bg-neutral-950 border border-neutral-900 p-6 space-y-4 font-mono text-xs">
                      <h3 className="font-sans font-black text-sm text-[#FF6A00] tracking-widest uppercase border-b border-neutral-900 pb-2 flex items-center justify-between">
                        <span>TELEGRAM INSTANT BOT AGENT</span>
                        <Signal className="w-4 h-4 text-[#FF6A00] animate-pulse" />
                      </h3>

                      <p className="text-neutral-500 text-[10px] uppercase leading-relaxed">
                        Input Telegram Bot Credentials to instantly stream order details securely to your Telegram groups or channels.
                      </p>

                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-neutral-400 block">TELEGRAM BOT API TOKEN</label>
                          <input
                            type="password"
                            placeholder="e.g. 1234567890:ABC-XYZ_testkey"
                            value={tgBotToken}
                            onChange={(e) => setTgBotToken(e.target.value)}
                            className="w-full bg-black border border-neutral-800 focus:border-[#FF6A00] px-3 py-2 text-white focus:outline-none font-mono"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-neutral-400 block">DESTINATION CHAT / GROUP ID</label>
                          <input
                            type="text"
                            placeholder="e.g. -1001234567890"
                            value={tgChatId}
                            onChange={(e) => setTgChatId(e.target.value)}
                            className="w-full bg-black border border-neutral-800 focus:border-[#FF6A00] px-3 py-2 text-white focus:outline-none font-mono"
                          />
                        </div>

                        {testError && (
                          <div className="p-2.5 bg-red-950/20 border border-red-900 font-mono text-[9px] text-red-500 uppercase leading-normal">
                            TEST ERROR: {testError}
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-3 pt-2">
                          <span className="text-[10px] text-neutral-600 block">
                            {testSentStatus === 'success' && '🟢 TEST SUCCESSFUL! MESSAGE DEPOSITED.'}
                            {testSentStatus === 'failed' && '🔴 MESSAGE ROUTE REFUSED.'}
                            {testSentStatus === 'testing' && '⏳ DISPATCHING SECURITY PROBE...'}
                          </span>
                          
                          <button
                            type="button"
                            onClick={handleTestTelegram}
                            disabled={testSentStatus === 'testing'}
                            className="px-5 py-2 border border-[#FF6A00] bg-orange-600/5 hover:bg-[#FF6A00] hover:text-black font-mono font-bold text-xs tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>TEST BOT NOW</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* WhatsApp Twilio Panel configurations */}
                    <div className="bg-neutral-950 border border-neutral-900 p-6 space-y-4 font-mono text-xs">
                      <h3 className="font-sans font-black text-sm text-[#FF6A00] tracking-widest uppercase border-b border-neutral-900 pb-2">
                        WHATSAPP TWILIO COUREER
                      </h3>

                      <p className="text-neutral-500 text-[10px] uppercase leading-relaxed">
                        Configure WhatsApp gateway credentials to receive instant orders summary messages on wallet target <b>+201227474877</b>.
                      </p>

                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-neutral-400">TWILIO ACCOUNT SID</label>
                          <input
                            type="text"
                            placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                            value={twilioSid}
                            onChange={(e) => setTwilioSid(e.target.value)}
                            className="w-full bg-black border border-neutral-800 focus:border-[#FF6A00] px-3 py-2 text-white focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-neutral-400">TWILIO AUTH TOKEN</label>
                          <input
                            type="password"
                            placeholder="Your Twilio Authentication token value"
                            value={twilioAuth}
                            onChange={(e) => setTwilioAuth(e.target.value)}
                            className="w-full bg-black border border-neutral-800 focus:border-[#FF6A00] px-3 py-2 text-white focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-neutral-400">TWILIO WHATSAPP EXPEDIENT SENDER</label>
                          <input
                            type="text"
                            placeholder="+14155238886 (Twilio Sandbox sender)"
                            value={twilioSender}
                            onChange={(e) => setTwilioSender(e.target.value)}
                            className="w-full bg-black border border-neutral-800 focus:border-[#FF6A00] px-3 py-2 text-white focus:outline-none"
                          />
                        </div>

                        <div className="text-right pt-2">
                          <button
                            type="button"
                            onClick={handleSaveWhatsAppConfig}
                            className="px-5 py-2 bg-neutral-900 border border-neutral-800 text-white hover:border-[#FF6A00] font-mono font-bold text-xs tracking-wider transition-colors cursor-pointer"
                          >
                            ACCUMULATE TWILIO AUTH
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* NOTIFICATION LOGS (For validation) */}
            {activeTab === 'logs' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="bg-neutral-950 p-4 border border-neutral-900 font-mono text-[11px] text-neutral-400 flex justify-between items-center">
                  <span>LAST 50 NOTIFICATION PIPELINES PROCESSED IN MEMORY REGISTER</span>
                  <button
                    onClick={loadDatabaseCollections}
                    className="text-[#FF6A00] hover:underline font-bold"
                  >
                    SYNC LOGS
                  </button>
                </div>

                <div className="space-y-4 font-mono text-xs">
                  {notificationLogs.length === 0 ? (
                    <div className="p-12 text-center text-neutral-600 border border-dashed border-neutral-900 uppercase">
                      NO REGISTERED EVENT DISPATCH OUTFLOWS REPORTED YET. TRY PLACING AN ORDER!
                    </div>
                  ) : (
                    notificationLogs.map((lg) => {
                      const logDate = new Date(lg.timestamp).toLocaleString();
                      return (
                        <div key={lg.id} className="bg-neutral-950 border border-neutral-900 p-5 space-y-3 relative">
                          <div className="flex justify-between items-center border-b border-neutral-900 pb-2.5">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${
                                lg.status === 'SUCCESS' ? 'bg-emerald-500' :
                                lg.status === 'FAILED' ? 'bg-red-500 animate-pulse' : 'bg-yellow-500'
                              }`} />
                              <span className={`font-black uppercase tracking-wider ${
                                lg.status === 'SUCCESS' ? 'text-emerald-500' :
                                lg.status === 'FAILED' ? 'text-red-500' : 'text-yellow-500'
                              }`}>
                                {lg.type.toUpperCase()} DISPATCH
                              </span>
                              <span className="text-neutral-500 font-normal">[{lg.id}]</span>
                            </div>
                            <span className="text-neutral-600 text-[10px]">{logDate}</span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs text-neutral-400">
                            <div>
                              <p className="text-neutral-600 tracking-wider">TARGET DESTINATION</p>
                              <p className="font-bold text-white uppercase mt-0.5 truncate">{lg.recipient}</p>
                            </div>
                            <div>
                              <p className="text-neutral-600 tracking-wider">STATUS METRICS</p>
                              <p className="font-bold text-white mt-0.5">{lg.status}</p>
                            </div>
                            <div className="col-span-1 md:col-span-2">
                              <p className="text-neutral-600 tracking-wider">ERROR SIGNATURES</p>
                              <p className="font-mono text-neutral-500 text-[10px] mt-0.5 leading-snug break-all truncate">
                                {lg.errorMessage || "NONE_DETECTED // ROUTE CLEAR"}
                              </p>
                            </div>
                          </div>

                          <div className="p-3 bg-black/40 border border-neutral-950 text-neutral-350 text-[10px] leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
                            {lg.payload}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* FULLPROOF SCREENSHOT EXPANSION LIGHTBOX */}
      {viewingScreenshotImg && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4">
          <button
            onClick={() => setViewingScreenshotImg(null)}
            className="absolute top-6 right-6 p-2 text-neutral-400 hover:text-white border border-neutral-800 bg-neutral-950 cursor-pointer"
          >
            DISMISS ATTACHMENT
          </button>
          <img
            src={viewingScreenshotImg}
            className="max-w-full max-h-[85vh] object-contain border border-neutral-900 shadow-2xl"
          />
          <p className="font-mono text-[9px] text-neutral-500 uppercase tracking-widest mt-4">
            SCREENSHOT DETAILED VIEW // RESOLVED IN LOCAL HOST
          </p>
        </div>
      )}
    </div>
  );
}
