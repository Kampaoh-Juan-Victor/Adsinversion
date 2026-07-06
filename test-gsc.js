#!/usr/bin/env node
// Test acceso Google Search Console API
const { GoogleAuth } = require('google-auth-library');
const path = require('path');

const CREDENTIALS_PATH = path.join(__dirname, 'ga4-credentials.json');

async function test() {
  const auth = new GoogleAuth({
    keyFile: CREDENTIALS_PATH,
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  });

  const client = await auth.getClient();
  const token = await client.getAccessToken();

  // Listar propiedades disponibles
  const res = await fetch('https://www.googleapis.com/webmasters/v3/sites', {
    headers: { Authorization: `Bearer ${token.token}` },
  });

  const data = await res.json();
  console.log('Status:', res.status);
  console.log('Propiedades:', JSON.stringify(data, null, 2));
}

test().catch(console.error);
