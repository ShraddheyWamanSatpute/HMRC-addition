// Centralized configuration for app keys used across the app (Firebase, Stripe, GCP)
// Populate from environment variables at build time when possible.

interface FirebaseKeys {
  apiKey: string
  authDomain: string
  databaseURL: string
  projectId: string
  storageBucket: string
  messagingSenderId: string
  appId: string
  measurementId?: string
}

interface StripeKeys {
  publishableKey?: string
}

interface AppKeysShape {
  firebase: FirebaseKeys
  stripe: StripeKeys
}

const read = (key: string, fallback?: string): string => {
  // Vite exposes import.meta.env
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const env = (import.meta as any)?.env || {};
  return String(env[key] ?? fallback ?? '');
}

export const APP_KEYS: AppKeysShape = {
  firebase: {
    apiKey: "AIzaSyCsCjKGU4zTyjFlgI8uxdWqcU9zEJozOC4",
  authDomain: "stop-test-8025f.firebaseapp.com",
  databaseURL: "https://stop-test-8025f-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "stop-test-8025f",
  storageBucket: "stop-test-8025f.firebasestorage.app",
  messagingSenderId: "371297109865",
  appId: "1:371297109865:web:72eaea2c25f94e08d45ff8",
  measurementId: "G-DXBXG4X1Z7"
  },
  stripe: {
    publishableKey: read('pk_test_51S52tUQ34hzSXGP0Uoza2izEfpUhNHaQRJb4dSzdNc8gqeEYOHFtMvw2AkB7s8ybLOBq39stbddARPU7SWv6hE4E00HptWImz0'),
  },
}

export default APP_KEYS

//AIzaSyCoHvGrEXYmIaC781Z39qqueCcFxqovWwA
