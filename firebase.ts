import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  projectId: "elemental-provider-7dckx",
  appId: "1:142217985509:web:e924e0223d7d1309d4430c",
  apiKey: "AIzaSyBEiyKVn-sCwoezO_Uxaj7hDDRyuzDns4Y",
  authDomain: "elemental-provider-7dckx.firebaseapp.com",
  storageBucket: "elemental-provider-7dckx.firebasestorage.app",
  messagingSenderId: "142217985509",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore targeting the custom database
export const db = getFirestore(app, "ai-studio-a82c5306-e08d-4ba4-9443-4b26cd95ee7b");

// Initialize Auth
export const auth = getAuth(app);

// Initialize Firebase Storage
export const storage = getStorage(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function cleanDocData(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(item => cleanDocData(item)).filter(v => v !== undefined);
  }
  
  const clean: any = {};
  Object.keys(obj).forEach((key) => {
    const value = obj[key];
    if (value === undefined) {
      return;
    }
    if (key === 'id') {
      return;
    }
    const cleanedVal = cleanDocData(value);
    if (cleanedVal !== undefined) {
      clean[key] = cleanedVal;
    }
  });
  return clean;
}

