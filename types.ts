export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number; // for showing discount
  description: string;
  category: string; // T-Shirts, Hoodies, Jackets, Pants, Sneakers, Shoes
  type: 'clothes' | 'shoes';
  images: string[];
  sizes: string[]; // clothes e.g. S, M, L, XL, XXL or shoes e.g. 41, 42, 43, 44, 45
  colors: string[];
  stock: number;
  featured: boolean;
  createdAt: number;
  sizeStock?: Record<string, number>; // Maps size to its exact stock count
}

export interface CartItem {
  product: Product;
  selectedSize: string;
  selectedColor: string;
  quantity: number;
}

export interface Order {
  id: string;
  name: string;
  phone: string;
  address: string;
  items: {
    productId: string;
    name: string;
    price: number;
    size: string;
    color: string;
    quantity: number;
    image: string;
  }[];
  total: number;
  paymentMethod: 'wallet' | 'instapay';
  paymentScreenshot: string; // Base64 string representing the screenshot
  status: 'Pending Review' | 'Paid' | 'Shipped' | 'Delivered';
  createdAt: number;
  paymentSenderNumber?: string;
  couponApplied?: string;
  discountAmount?: number;
}

export interface Review {
  id?: string;
  productId: string;
  customerName: string;
  rating: number; // 1 to 5
  comment: string;
  createdAt: number;
}

export interface Customer {
  id: string; // can be phone number or auto-id
  name: string;
  phone: string;
  address: string;
  createdAt: number;
  ordersCount: number;
  totalSpent: number;
}

export interface Message {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  createdAt: number;
}

export interface HomepageConfig {
  heroTitle: string;
  heroSubtitle: string;
  heroBannerImg: string;
  heroPromoText: string;
  aboutText: string;
  aboutImage: string;
  instaLink: string;
  tiktokLink: string;
  facebookLink: string;
  whatsAppLink: string;
  animationEnabled: boolean;
  announcementText: string;
}
