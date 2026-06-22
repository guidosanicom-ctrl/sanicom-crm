// Ejecutar una sola vez: node scripts/generate-vapid.mjs
// Luego copiar las claves al .env.local y a los Secrets de Supabase Edge Functions

import pkg from 'web-push';
const { generateVAPIDKeys } = pkg;

const keys = generateVAPIDKeys();

console.log('\n=== VAPID KEYS GENERADAS ===\n');
console.log('Añadir en .env.local:');
console.log(`VITE_VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log('');
console.log('Añadir en Supabase Dashboard → Edge Functions → Secrets:');
console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log(`VAPID_EMAIL=mailto:admin@sanicom.com`);
console.log('\n============================\n');
