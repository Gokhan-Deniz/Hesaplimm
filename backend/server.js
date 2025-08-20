// server.js (tam ve düzeltilmiş sürüm)
// ESM (type:module) ile uyumlu, doğru __dirname kullanımı + güvenli dosya okuma

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import { fileURLToPath } from 'url';

const app = express();
app.use(cors());
app.use(express.json());

// __dirname'i ESM'de doğru hesapla
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Veri dosyası yolu (server.js ile aynı klasördeki /data altından)
const dataPath = path.join(__dirname, 'data', 'mock_offers.json');

// Veri yükleme yardımcıları
function safeReadJson(p) {
  try {
    const raw = fs.readFileSync(p, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('[DATA] JSON okunamadı:', p, err.message);
    return { products: [], offers: {} };
  }
}

let data = safeReadJson(dataPath);

// Dosya değişirse otomatik yeniden yükle (nodemon ile birlikte güzel çalışır)
fs.watch(path.dirname(dataPath), { persistent: false }, (eventType, filename) => {
  if (filename && filename.toLowerCase() === 'mock_offers.json') {
    console.log('[DATA] mock_offers.json değişti, yeniden yükleniyor…');
    data = safeReadJson(dataPath);
  }
});

// Yardımcılar
function computeOfferTotals(offer) {
  const shippingFee = Number(offer.shipping_fee ?? 0);
  const price = Number(offer.price ?? 0);
  return { ...offer, total: price + shippingFee };
}

function normalize(s = '') {
  return String(s).toLowerCase().replace(/\s+/g, ' ').trim();
}

// Sağlık kontrolü
app.get('/api/health', (req, res) => {
  res.json({ ok: true, productsCount: data.products?.length ?? 0 });
});

// Arama
app.get('/api/search', (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json({ query: q, products: [], total: 0 });

  const qn = normalize(q);
  const products = (data.products || [])
    .filter((p) => normalize(p.name).includes(qn))
    .map((p) => {
      const offers = (data.offers?.[p.id] || []).map(computeOfferTotals);
      offers.sort((a, b) => a.total - b.total);
      const best = offers[0];
      return {
        id: p.id,
        name: p.name,
        brand: p.brand,
        model: p.model,
        gtin: p.gtin,
        thumbnail: p.thumbnail,
        best_total_price: best
          ? {
              site: best.site,
              seller: best.seller,
              price: Number(best.price),
              shipping_fee: Number(best.shipping_fee ?? 0),
              total: Number(best.total),
              delivery_eta_days: best.delivery_eta_days,
              url: best.url
            }
          : null
      };
    });

  res.json({ query: q, products, total: products.length });
});

// Ürün detay (mock)
app.get('/api/products/:id', (req, res) => {
  const id = req.params.id;
  const p = (data.products || []).find((x) => x.id === id);
  if (!p) return res.status(404).json({ error: 'not found' });
  res.json(p);
});

// Ürüne ait tüm teklifler (fiyat + kargo + toplam + teslimat)
app.get('/api/products/:id/prices', (req, res) => {
  const id = req.params.id;
  const offers = (data.offers?.[id] || []).map(computeOfferTotals);
  offers.sort((a, b) => a.total - b.total);
  res.json({ product_id: id, offers });
});

// Port
const PORT = process.env.PORT || 3000;
app.listen(PORT, '127.0.0.1', () => {
  console.log('[API] running on http://127.0.0.1:4000' + PORT);
  console.log('[DATA] path:', dataPath);
});

