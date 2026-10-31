/*
  GEWY BUILDS - settings for BOTH apps (shop + admin).
  Phone push notifications are OFF in this free version (they need Firebase's paid plan).
  Everything else works: products, orders, custom requests, chat, money.
*/
globalThis.GEWY_CONFIG = {
  shopName: 'GEWY BUILDS',
  currency: 'EUR',
  firebase: {
    apiKey: "AIzaSyAeUdGfnUpYXMR2Yz6GcruCkRhUmwK-5tA",
    authDomain: "gewy-builds.firebaseapp.com",
    projectId: "gewy-builds",
    storageBucket: "gewy-builds.firebasestorage.app",
    messagingSenderId: "452232123435",
    appId: "1:452232123435:web:90da259e27c75c0165066e"
  },
  vapidKey: ''
};
