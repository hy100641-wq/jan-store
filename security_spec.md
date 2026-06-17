# Firestore Security Specification: JAN Store

This specification is a comprehensive outline of the database constraints, integrity rules, and validation paradigms designed to protect our streetwear couture web platform.

---

## 1. Data Invariants

1. **Category Integrity**: A catalog piece must fall into specific subcategories (`T-Shirts`, `Hoodies`, `Jackets`, `Pants`, `Sneakers`, `Shoes`).
2. **Economic Validation**: Every product's `price` must be a non-negative floating-point or integer value. Original comparison prices must also exceed or equal zero.
3. **Transaction Immutability**: Placing an order must lock crucial metrics like `total` and `paymentScreenshot` to prevent downstream tampering.
4. **Phone Identifier Uniqueness**: Customers profiles are queried and structured surrounding unique valid mobile contact numbers.
5. **No Spoof Auth Shield**: Since the checkout flow supports guest checkout via mobile screenshots, incoming data must validate layout shapes explicitly rather than delegating security to simple claims.

---

## 2. The "Dirty Dozen" Threat Payloads
Below are 12 specific payloads mapped to trigger security blocks and ensure safe database mutations:

```json
[
  {
    "desc": "Payload 1: Product created with a negative price",
    "path": "products/prod_bad_price",
    "data": { "name": "Tactical Vest", "price": -299, "description": "Too cheap", "category": "Jackets", "type": "clothes", "stock": 5, "featured": false, "images": ["https://img.jpg"], "sizes": ["L"], "colors": ["Black"], "createdAt": 1718536000 }
  },
  {
    "desc": "Payload 2: Product image array missing (empty)",
    "path": "products/prod_no_images",
    "data": { "name": "Heavy Fleece", "price": 4500, "description": "Empty picture", "category": "Hoodies", "type": "clothes", "stock": 5, "featured": false, "images": [], "sizes": ["L"], "colors": ["Black"], "createdAt": 1718536000 }
  },
  {
    "desc": "Payload 3: Product created with unsupported clothing type",
    "path": "products/prod_bad_type",
    "data": { "name": "Invalid Suit", "price": 1000, "description": "Wrong type tag", "category": "Suits", "type": "armor", "stock": 5, "featured": false, "images": ["https://img.jpg"], "sizes": ["L"], "colors": ["Black"], "createdAt": 1718536000 }
  },
  {
    "desc": "Payload 4: Placed order containing negative total spend",
    "path": "orders/order_neg_spend",
    "data": { "name": "Customer Name", "phone": "0912345678", "address": "Manila", "items": [], "total": -100, "paymentMethod": "wallet", "paymentScreenshot": "Base64Mock...", "status": "Pending Review", "createdAt": 1718536000 }
  },
  {
    "desc": "Payload 5: Placed order with unsupported payment carrier option",
    "path": "orders/order_bad_carrier",
    "data": { "name": "Customer Name", "phone": "0912345678", "address": "Manila", "items": [], "total": 4500, "paymentMethod": "bitcoin", "paymentScreenshot": "Base64Mock...", "status": "Pending Review", "createdAt": 1718536000 }
  },
  {
    "desc": "Payload 6: Placed order with illegal status state bypass",
    "path": "orders/order_bad_status",
    "data": { "name": "Customer Name", "phone": "0912345678", "address": "Manila", "items": [], "total": 4500, "paymentMethod": "wallet", "paymentScreenshot": "Base64Mock...", "status": "Delivered_Bypass", "createdAt": 1718536000 }
  },
  {
    "desc": "Payload 7: Client info tracked with negative order frequency count",
    "path": "customers/cust_neg_count",
    "data": { "name": "Client Name", "phone": "0912345678", "address": "Cebu", "ordersCount": -5, "totalSpent": 1500, "createdAt": 1718536000 }
  },
  {
    "desc": "Payload 8: Client info tracked with negative overall accumulated spend value",
    "path": "customers/cust_neg_spend",
    "data": { "name": "Client Name", "phone": "0912345678", "address": "Cebu", "ordersCount": 1, "totalSpent": -550, "createdAt": 1718536000 }
  },
  {
    "desc": "Payload 9: Customer help contact message registered with empty message body",
    "path": "messages/msg_empty",
    "data": { "name": "Customer Help", "phone": "0912345678", "message": "", "createdAt": 1718536000 }
  },
  {
    "desc": "Payload 10: Customer help contact message registered with empty name identifier",
    "path": "messages/msg_no_name",
    "data": { "name": "", "phone": "0912345678", "message": "My payment is complete, help me out", "createdAt": 1718536000 }
  },
  {
    "desc": "Payload 11: Homepage customization configuration banner image length overshoot (maliciously oversized URL)",
    "path": "config/homepage",
    "data": { "heroTitle": "Title", "heroSubtitle": "Subtitle", "heroBannerImg": "https://over-exceedingly-loooooooooooooooooong-url-attack...", "heroPromoText": "Promo", "aboutText": "About", "aboutImage": "Image", "instaLink": "http", "tiktokLink": "http", "facebookLink": "http", "whatsAppLink": "http", "animationEnabled": true, "announcementText": "Text" }
  },
  {
    "desc": "Payload 12: Injection of a malicious string into target collection identifiers",
    "path": "config/../../../etc/passwd",
    "data": { "heroTitle": "Title" }
  }
]
```

---

## 3. The Test Runner Spec (`firestore.rules.test.ts`)

```typescript
import { assertFails, assertSucceeds, initializeTestApp } from '@firebase/testing';

describe("JAN Store Fortress Security Rules", () => {
  const app = initializeTestApp({ projectId: "elemental-provider-7dckx" });
  const db = app.firestore();

  it("should fail to write product with negative price (Payload 1)", async () => {
    const docRef = db.collection('products').doc('prod_bad_price');
    await assertFails(docRef.set({
      name: "Tactical Vest",
      price: -299,
      description: "Too cheap",
      category: "Jackets",
      type: "clothes",
      stock: 5,
      featured: false,
      images: ["https://img.jpg"],
      sizes: ["L"],
      colors: ["Black"],
      createdAt: Date.now()
    }));
  });

  it("should succeed and let anyone browse store products list", async () => {
    const query = db.collection('products').limit(10);
    await assertSucceeds(query.get());
  });
});
```
