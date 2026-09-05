/* ============================================================
   Monarch & Laurel — Shared product data + cart logic
   Every page (kidswear.html, bharat.html, product-template.html,
   cart.html, checkout.html) reads from this one file, which in
   turn reads from the published Google Sheet below.

   SHEET COLUMNS: id, collection, name, price, images, description,
   sizes, colors, active
   "images" holds one or more photo paths separated by commas, e.g.
   assets/bharat/noir-garden-1.jpg,assets/bharat/noir-garden-2.jpg
   Each product can have as many (or as few) photos as it actually has.

   TO CONNECT YOUR SHEET: paste your "Publish to web" CSV link
   below, replacing the placeholder. That's the only edit needed.
   ============================================================ */

const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ_MT3_NHD2lVq6OmMQkAH7Lz7Z3B0yBRM6p0GDMuGnXgbBHh36CiOsdgODHRzoNaV7GsI2Ftsm6oHy/pub?gid=0&single=true&output=csv";

/* ---------- Fetch + parse product data ---------- */

async function fetchProducts() {
  const res = await fetch(SHEET_CSV_URL, { cache: "no-store" });
  if (!res.ok) throw new Error("Could not load product sheet (" + res.status + ")");
  const csvText = await res.text();
  const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });

  return parsed.data
    .filter(row => (row.active || "").toString().trim().toUpperCase() !== "FALSE")
    .map(row => {
      const images = (row.images || "").split(",").map(s => s.trim()).filter(Boolean);
      return {
        id: (row.id || "").trim(),
        collection: (row.collection || "").trim(),
        name: (row.name || "").trim(),
        price: parseFloat(row.price) || 0,
        images: images,
        image: images[0] || "", // convenience: first photo, used wherever only one thumbnail is needed (grid cards, cart, checkout)
        description: (row.description || "").trim(),
        sizes: (row.sizes || "").split(",").map(s => s.trim()).filter(Boolean),
        colors: (row.colors || "").split(",").map(c => c.trim()).filter(Boolean),
      };
    })
    .filter(p => p.id && p.name);
}

function formatRs(n) {
  return "Rs. " + Number(n).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* Placeholder SVG icon shown when a product has no image yet */
function placeholderFrame(collection) {
  const dressIcon = '<path d="M22 10h16l4 12-8-4v32H26V18l-8 4z"/>';
  const sareeIcon = '<path d="M10 46c8-4 12-14 12-26M50 46c-8-4-12-14-12-26M22 20c3 8 3 16 0 24M38 20c-3 8-3 16 0 24"/>';
  const isKids = collection === "Kidswear";
  return `<svg viewBox="0 0 60 60" fill="none" stroke-width="1">${isKids ? dressIcon : sareeIcon}</svg><span class="soon">Photography Pending</span>`;
}

/* ---------- Cart (stored in the browser's localStorage) ---------- */
/* Persists across pages/visits on the live site. Each item:
   { id, name, price, image, collection, size, color, qty } */

const CART_KEY = "ml_cart";

function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateNavBagCount();
}

function addToCart(item) {
  const cart = getCart();
  const existing = cart.find(
    c => c.id === item.id && c.size === item.size && c.color === item.color
  );
  if (existing) {
    existing.qty += item.qty;
  } else {
    cart.push(item);
  }
  saveCart(cart);
}

function removeFromCart(index) {
  const cart = getCart();
  cart.splice(index, 1);
  saveCart(cart);
}

function updateCartQty(index, qty) {
  const cart = getCart();
  if (cart[index]) {
    cart[index].qty = Math.max(1, qty);
    saveCart(cart);
  }
}

function cartSubtotal(cart) {
  return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
}

function cartCount(cart) {
  return cart.reduce((sum, item) => sum + item.qty, 0);
}

function updateNavBagCount() {
  const badge = document.getElementById("navBagCount");
  if (!badge) return;
  const count = cartCount(getCart());
  badge.textContent = count;
  badge.style.display = count > 0 ? "flex" : "none";
}

document.addEventListener("DOMContentLoaded", updateNavBagCount);
