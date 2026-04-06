// ============================================================
// SUPABASE — inicialización
// ============================================================
const SUPABASE_URL  = 'https://vytflddvmznwvrlyjdvk.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5dGZsZGR2bXpud3ZybHlqZHZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NjcxODgsImV4cCI6MjA5MDU0MzE4OH0.G9OFwUp10P-qMDlDCV290j8K0jw1Z1j7gj-WejizxPk';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON);

// ============================================================
// ESTADO GLOBAL
// ============================================================
let products    = [];
let cart        = [];
let currentUser = null;

// Acción pendiente: se ejecuta automáticamente después del login
// Ejemplo: { type: 'addToCart', payload: 5 }
//          { type: 'openCart' }
//          { type: 'checkout' }
let pendingIntent = null;

// ============================================================
// PARTE 1 — requireLogin
// Verifica sesión activa contra Supabase.
// Si no hay sesión: guarda la intención pendiente, abre el modal
// y retorna null. Si hay sesión: retorna el usuario.
// ============================================================
async function requireLogin(intent = null) {
  const { data: { user } } = await db.auth.getUser();

  if (!user) {
    // Guardar qué quería hacer el usuario para ejecutarlo post-login
    if (intent) pendingIntent = intent;

    // Mostrar mensaje explicativo antes de abrir el modal
    showToast('Iniciá sesión para continuar 🔐', '🔒');
    setTimeout(() => openLogin('login'), 500);
    return null;
  }

  return user;
}

// Ejecuta la acción pendiente después de un login exitoso
function runPendingIntent() {
  if (!pendingIntent) return;
  const intent = pendingIntent;
  pendingIntent = null;

  switch (intent.type) {
    case 'addToCart':
      addToCart(intent.payload, null);
      break;
    case 'openCart':
      setTimeout(() => openCart(), 300);
      break;
    case 'checkout':
      setTimeout(() => openCart(), 300);
      showToast('Podés finalizar tu compra 🛒', '✨');
      break;
  }
}

// ============================================================
// PRODUCTOS — carga desde Supabase con fallback local
// ============================================================
const FALLBACK_PRODUCTS = [
  { id:1,  name:'Sahumerio Palo Santo',     cat:'sahumerios', price:2800,  oldPrice:null,  bg:'#ede4d8', badge:'nuevo', desc:'Purificá tu espacio con el aroma del palo santo sagrado.' },
  { id:2,  name:'Sahumerio de Lavanda',     cat:'sahumerios', price:2400,  oldPrice:null,  bg:'#e8e0f0', badge:null,    desc:'Relax y calma para el final del día.' },
  { id:3,  name:'Cono Sahumador',           cat:'sahumerios', price:3200,  oldPrice:null,  bg:'#f0e8d8', badge:null,    desc:'Sahumador artesanal de cerámica con diseño floral.' },
  { id:4,  name:'Vela de Soja Natural',     cat:'velas',      price:3800,  oldPrice:null,  bg:'#f5f0e8', badge:'nuevo', desc:'Vela artesanal de soja 100% natural con fragancia a vainilla.' },
  { id:5,  name:'Vela de Cera de Abeja',    cat:'velas',      price:4200,  oldPrice:null,  bg:'#f0ead8', badge:null,    desc:'Purifica el aire y crea una atmósfera de bienestar.' },
  { id:6,  name:'Cuarzo Rosa',              cat:'cristales',  price:1800,  oldPrice:null,  bg:'#f5e0e8', badge:null,    desc:'Piedra del amor incondicional y la sanación emocional.' },
  { id:7,  name:'Amatista Cruda',           cat:'cristales',  price:2200,  oldPrice:2800,  bg:'#ece0f5', badge:'promo', desc:'Protección espiritual y apertura de la intuición.' },
  { id:8,  name:'Bombita de Baño Rosa',     cat:'bombitas',   price:1500,  oldPrice:null,  bg:'#fce8f0', badge:'nuevo', desc:'Ritual de baño con sales, aceites y flores.' },
  { id:9,  name:'Difusor para Auto',        cat:'difusores',  price:2000,  oldPrice:null,  bg:'#e8f0f5', badge:null,    desc:'Aromaterapia en movimiento.' },
  { id:10, name:'Kit Ritual Completo',      cat:'kits',       price:9800,  oldPrice:12000, bg:'#f0ede8', badge:'nuevo', desc:'Sahumerio + vela + cuarzo + guía de rituales.' },
  { id:11, name:'Kit Iniciación Holística', cat:'kits',       price:7500,  oldPrice:null,  bg:'#e8f0e8', badge:null,    desc:'Para quienes empiezan su camino espiritual.' },
];

async function loadProducts() {
  showProductsSkeleton();
  try {
    const { data, error } = await db
      .from('products')
      .select('*, categories(slug)')
      .eq('active', true)
      .order('id');

    if (error || !data || data.length === 0) throw error || new Error('empty');

    products = data.map(p => ({
      ...p,
      cat:       p.categories?.slug || '',
      icon:      p.emoji || '✨',
      bg:        p.bg_color || '#ede4d8',
      desc:      p.description || '',
      oldPrice:  p.old_price || null,
      image_url: p.image_url || null,
    }));
  } catch(e) {
    console.warn('Usando productos locales:', e?.message);
    products = FALLBACK_PRODUCTS;
  }
  renderProducts();
  return products; // retorna para que .then() funcione
}

function cargarProductos() { loadProducts(); }

// ============================================================
// CATEGORÍAS — carga desde Supabase y renderiza las cards
// ============================================================
const CAT_ICONS = {
  sahumerios: `<svg width="36" height="36" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21V10"/><path d="M8 10h8"/><path d="M10 10V7a2 2 0 0 1 4 0v3"/><path d="M9 3c0 0 .5 1.5 0 3"/><path d="M12 3c0 0 .5 1.5 0 3"/><path d="M15 3c0 0 .5 1.5 0 3"/><path d="M6 21h12"/></svg>`,
  velas:      `<svg width="36" height="36" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="9" width="8" height="13" rx="1"/><path d="M12 9V6"/><path d="M10.5 4c0-1 1.5-2.5 1.5-2.5S13.5 3 13.5 4a1.5 1.5 0 0 1-3 0z"/><line x1="8" y1="22" x2="16" y2="22"/></svg>`,
  cristales:  `<svg width="36" height="36" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><polygon points="12,2 20,9 12,22 4,9"/><line x1="12" y1="2" x2="12" y2="22"/><line x1="4" y1="9" x2="20" y2="9"/></svg>`,
  bombitas:   `<svg width="36" height="36" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C8 2 5 6 5 10c0 3 1.5 5 3 6.5V19a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.5C17.5 15 19 13 19 10c0-4-3-8-7-8z"/><path d="M9 20.5c0 .8.9 1.5 2 1.5s2-.7 2-1.5"/><path d="M9 17h6"/></svg>`,
  difusores:  `<svg width="36" height="36" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22V12"/><path d="M8 18c-3-1-5-4-5-7a9 9 0 0 1 18 0c0 3-2 6-5 7"/><path d="M9 5c0 0 .5 2 0 4"/><path d="M12 4c0 0 .5 2 0 4"/><path d="M15 5c0 0 .5 2 0 4"/></svg>`,
  kits:       `<svg width="36" height="36" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 7H4a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1z"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>`,
  todos:      `<svg width="36" height="36" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12c0-2.2 1.8-4 4-4s4 1.8 4 4-1.8 4-4 4"/><circle cx="12" cy="12" r="1" fill="currentColor"/></svg>`,
};

// Helper: devuelve el SVG del icono de una categoría
function catIcon(slug, size=36) {
  const s = CAT_ICONS[slug] || CAT_ICONS['todos'];
  return s.replace(/width="\d+"/, `width="${size}"`).replace(/height="\d+"/, `height="${size}"`);
}

const FALLBACK_CATEGORIES = [
  { id:1, name:'Sahumerios', slug:'sahumerios' },
  { id:2, name:'Velas',      slug:'velas'      },
  { id:3, name:'Cristales',  slug:'cristales'  },
  { id:4, name:'Bombitas',   slug:'bombitas'   },
  { id:5, name:'Difusores',  slug:'difusores'  },
  { id:6, name:'Kits',       slug:'kits'       },
];

async function loadCategories() {
  let cats = [];
  try {
    const { data, error } = await db
      .from('categories')
      .select('*')
      .order('id');
    if (error || !data || !data.length) throw error || new Error('empty');
    cats = data;
  } catch(e) {
    console.warn('Usando categorías locales:', e?.message);
    cats = FALLBACK_CATEGORIES;
  }
  renderCategoryCards(cats);
}

function renderCategoryCards(cats) {
  const grid  = document.getElementById('categoriesGrid');
  const label = document.getElementById('catCountLabel');
  if (label) label.textContent = `${cats.length} colecciones disponibles`;

  // Card "Todos" + una por cada categoría
  grid.innerHTML = `
    <div class="cat-card active" id="cat-todos" onclick="selectCategory('todos', this, 'Todos')">
      <div class="cat-card-inner">
        <span class="cat-icon">${catIcon('todos')}</span>
        <span class="cat-card-name">Todos</span>
        <span class="cat-card-count">ver todo</span>
      </div>
    </div>
    ${cats.map(c => `
    <div class="cat-card" id="cat-${c.slug}" onclick="selectCategory('${c.slug}', this, '${c.name}')">
      <div class="cat-card-inner">
        <span class="cat-icon">${catIcon(c.slug)}</span>
        <span class="cat-card-name">${c.name}</span>
        <span class="cat-card-count" id="count-${c.slug}">—</span>
      </div>
    </div>`).join('')}
  `;

  // Contar productos por categoría una vez cargados
  updateCategoryCounts();
}

function updateCategoryCounts() {
  // Espera a que products esté cargado
  if (!products.length) {
    setTimeout(updateCategoryCounts, 300);
    return;
  }
  FALLBACK_CATEGORIES.forEach(c => {
    const el = document.getElementById('count-' + c.slug);
    if (!el) return;
    const count = products.filter(p => p.cat === c.slug).length;
    el.textContent = count === 1 ? '1 producto' : `${count} productos`;
  });
  // También para categorías de Supabase por si tienen slug diferente
  document.querySelectorAll('[id^="count-"]').forEach(el => {
    const slug = el.id.replace('count-', '');
    const count = products.filter(p => p.cat === slug).length;
    if (count > 0) el.textContent = count === 1 ? '1 producto' : `${count} productos`;
  });
}

// Seleccionar una categoría: muestra el panel inline si no es "todos",
// o lo cierra si es "todos"
let activeCatSlug = 'todos';

function selectCategory(slug, cardEl, name) {
  // Actualizar estado activo de las cards
  document.querySelectorAll('.cat-card').forEach(c => c.classList.remove('active'));
  cardEl.classList.add('active');
  activeCatSlug = slug;

  if (slug === 'todos') {
    closeCatPanel();
    return;
  }

  // Filtrar productos de esta categoría
  const filtered = products.filter(p => p.cat === slug);

  // Actualizar header del panel
  document.getElementById('catPanelIcon').innerHTML = catIcon(slug, 28);
  document.getElementById('catPanelTitle').textContent = name;
  document.getElementById('catPanelCount').textContent =
    filtered.length === 1 ? '1 producto' : `${filtered.length} productos`;

  // Renderizar productos en el panel
  const grid = document.getElementById('catProductsGrid');
  if (!filtered.length) {
    grid.innerHTML = `<div class="cat-panel-empty">No hay productos en esta categoría todavía.</div>`;
  } else {
    grid.innerHTML = filtered.map(p => `
      <div class="product-card" id="cprod-${p.id}">
        <div class="product-img" style="background:${p.bg || '#ede4d8'}">
          ${p.badge ? `<div class="product-badge badge-${p.badge}">${p.badge === 'promo' ? 'Promo' : 'Nuevo'}</div>` : ''}
          ${p.image_url
            ? `<img src="${p.image_url}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0;">`
            : `<span class="product-emoji">${catIcon(p.cat, 40)}</span>`
          }
          <div class="product-quick">
            <button class="quick-add ${cart.find(c=>c.id===p.id)?'added':''}" onclick="addToCart(${p.id}, event)">
              ${cart.find(c=>c.id===p.id) ? '✓ Agregado' : '+ Agregar al carrito'}
            </button>
          </div>
        </div>
        <div class="product-info">
          <div class="product-cat">${p.cat}</div>
          <div class="product-name">${p.name}</div>
          <div class="product-desc">${p.desc}</div>
          <div class="product-footer">
            <div class="product-price">
              $${Number(p.price).toLocaleString('es-AR')}
              ${p.oldPrice ? `<span class="price-old">$${Number(p.oldPrice).toLocaleString('es-AR')}</span>` : ''}
            </div>
            <button class="add-cart-btn ${cart.find(c=>c.id===p.id)?'in-cart':''}" onclick="addToCart(${p.id}, event)">
              ${cart.find(c=>c.id===p.id) ? '✓' : '+'}
            </button>
          </div>
        </div>
      </div>`).join('');
  }

  // Mostrar panel
  const panel = document.getElementById('catProductsPanel');
  panel.style.display = 'block';

  // Scroll suave al panel
  setTimeout(() => {
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 50);
}

function closeCatPanel() {
  const panel = document.getElementById('catProductsPanel');
  panel.style.display = 'none';
  // Resetear card activa a "Todos"
  document.querySelectorAll('.cat-card').forEach(c => c.classList.remove('active'));
  const todosCard = document.getElementById('cat-todos');
  if (todosCard) todosCard.classList.add('active');
  activeCatSlug = 'todos';
}

function showProductsSkeleton() {
  const grid = document.getElementById('productsGrid');
  grid.innerHTML = Array(6).fill(0).map(() => `
    <div class="product-card" style="opacity:0.5;pointer-events:none;">
      <div class="product-img" style="background:#ede4d8;">
        <span class="product-emoji" style="opacity:0.3"><svg width="40" height="40" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21V10"/><path d="M8 10h8"/><path d="M10 10V7a2 2 0 0 1 4 0v3"/><path d="M9 3c0 0 .5 1.5 0 3"/><path d="M12 3c0 0 .5 1.5 0 3"/><path d="M15 3c0 0 .5 1.5 0 3"/><path d="M6 21h12"/></svg></span>
      </div>
      <div class="product-info">
        <div style="height:10px;background:#d9c9b3;margin-bottom:8px;width:40%;border-radius:2px;"></div>
        <div style="height:16px;background:#d9c9b3;margin-bottom:8px;width:80%;border-radius:2px;"></div>
        <div style="height:12px;background:#e8ddd0;width:60%;border-radius:2px;"></div>
      </div>
    </div>`).join('');
}

// ============================================================
// RENDER PRODUCTS
// ============================================================
function renderProducts(filter = 'todos') {
  const grid = document.getElementById('productsGrid');
  const filtered = filter === 'todos' ? products : products.filter(p => p.cat === filter);

  if (!filtered.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:48px;color:#9a8a7d;font-size:14px;">No hay productos en esta categoría.</div>`;
    return;
  }

  grid.innerHTML = filtered.map((p, i) => `
    <div class="product-card reveal" style="animation-delay:${i * 0.06}s" id="prod-${p.id}">
      <div class="product-img" style="background:${p.bg || '#ede4d8'}">
        ${p.badge ? `<div class="product-badge badge-${p.badge}">${p.badge === 'promo' ? 'Promo' : 'Nuevo'}</div>` : ''}
        ${p.image_url
          ? `<img src="${p.image_url}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0;">`
          : `<span class="product-emoji">${catIcon(p.cat, 40)}</span>`
        }
        <div class="product-quick">
          <button class="quick-add ${cart.find(c=>c.id===p.id)?'added':''}" onclick="addToCart(${p.id}, event)">
            ${cart.find(c=>c.id===p.id) ? '✓ Agregado' : '+ Agregar al carrito'}
          </button>
        </div>
      </div>
      <div class="product-info">
        <div class="product-cat">${p.cat}</div>
        <div class="product-name">${p.name}</div>
        <div class="product-desc">${p.desc}</div>
        <div class="product-footer">
          <div class="product-price">
            $${Number(p.price).toLocaleString('es-AR')}
            ${p.oldPrice ? `<span class="price-old">$${Number(p.oldPrice).toLocaleString('es-AR')}</span>` : ''}
          </div>
          <button class="add-cart-btn ${cart.find(c=>c.id===p.id)?'in-cart':''}" onclick="addToCart(${p.id}, event)">
            ${cart.find(c=>c.id===p.id) ? '✓' : '+'}
          </button>
        </div>
      </div>
    </div>`).join('');

  setTimeout(() => {
    grid.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
  }, 50);
}

// ============================================================
// FILTER
// ============================================================
function filterProducts(cat, catCard, pillBtn) {
  if (catCard) {
    document.querySelectorAll('.cat-card').forEach(c => c.classList.remove('active'));
    catCard.classList.add('active');
  }
  if (pillBtn) {
    document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
    pillBtn.classList.add('active');
  }
  renderProducts(cat);
}

// ============================================================
// CART — protegido con requireLogin
// ============================================================

// PARTE 1: addToCart requiere sesión activa
async function addToCart(id, e) {
  if (e) e.stopPropagation();

  // Verificar sesión real contra Supabase
  const user = await requireLogin({ type: 'addToCart', payload: id });
  if (!user) return; // sin sesión → modal abierto con intent guardado

  const p = products.find(p => p.id === id);
  if (!p) return;

  const existing = cart.find(c => c.id === id);
  if (existing) existing.qty++;
  else cart.push({ ...p, qty: 1 });

  saveCartLocal();
  updateCartUI();
  renderCartBody();
  renderProducts(getActiveFilter());
  showToast(`${p.icon || '✨'} ${p.name} agregado`, '✨');
}

function removeFromCart(id) {
  cart = cart.filter(c => c.id !== id);
  saveCartLocal();
  updateCartUI();
  renderCartBody();
  renderProducts(getActiveFilter());
}

function changeQty(id, delta) {
  const item = cart.find(c => c.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) { removeFromCart(id); return; }
  saveCartLocal();
  updateCartUI();
  renderCartBody();
}

// ============================================================
// CART PERSISTENCE — Supabase si hay sesión, localStorage si no
// ============================================================
async function saveCart() {
  if (currentUser) {
    try {
      await db.from('carts').upsert({
        user_id: currentUser.id,
        items: JSON.stringify(cart),
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });
    } catch(e) { console.warn('Error guardando carrito:', e.message); }
  }
  try { localStorage.setItem('auralia_cart_' + (currentUser?.id || 'anon'), JSON.stringify(cart)); } catch(_) {}
}

async function loadUserCart(userId) {
  try {
    const { data } = await db.from('carts').select('items').eq('user_id', userId).single();
    if (data?.items) {
      cart = JSON.parse(data.items);
      updateCartUI();
      renderCartBody();
      renderProducts(getActiveFilter());
    }
  } catch(e) {
    try {
      const saved = localStorage.getItem('auralia_cart_' + userId);
      if (saved) { cart = JSON.parse(saved); updateCartUI(); renderCartBody(); }
    } catch(_) {}
  }
}

function clearCartUI() {
  cart = [];
  updateCartUI();
  renderCartBody();
  renderProducts(getActiveFilter());
}

function saveCartLocal() { saveCart(); }

function loadCartLocal() {
  // Solo carga el cart anónimo si no hay usuario activo
  if (currentUser) return;
  try {
    const saved = localStorage.getItem('auralia_cart_anon');
    if (saved) cart = JSON.parse(saved);
  } catch(_) {}
}

function getActiveFilter() {
  const active = document.querySelector('.filter-pill.active');
  if (!active) return 'todos';
  const t = active.textContent.trim().toLowerCase();
  return t === 'todos' ? 'todos' : t;
}

function updateCartUI() {
  const total = cart.reduce((s, c) => s + c.qty, 0);
  document.getElementById('cartCount').textContent = total;
  const subtotal = cart.reduce((s, c) => s + Number(c.price) * c.qty, 0);
  document.getElementById('cartSubtotal').textContent = '$' + subtotal.toLocaleString('es-AR');
}

function renderCartBody() {
  const body = document.getElementById('cartBody');
  if (!cart.length) {
    body.innerHTML = `<div class="cart-empty"><div class="cart-empty-icon">🛒</div><div class="cart-empty-text">Tu carrito está vacío</div></div>`;
    return;
  }
  body.innerHTML = cart.map(c => `
    <div class="cart-item">
      <div class="cart-item-thumb">
        ${c.image_url
          ? `<img src="${c.image_url}" alt="${c.name}" style="width:100%;height:100%;object-fit:cover;">`
          : (c.icon || '✨')
        }
      </div>
      <div class="cart-item-info">
        <div class="cart-item-cat">${c.cat}</div>
        <div class="cart-item-name">${c.name}</div>
        <div class="cart-item-qty">
          <button class="qty-btn" onclick="changeQty(${c.id}, -1)">−</button>
          <span class="qty-num">${c.qty}</span>
          <button class="qty-btn" onclick="changeQty(${c.id}, 1)">+</button>
        </div>
        <button class="remove-btn" onclick="removeFromCart(${c.id})">Eliminar</button>
      </div>
      <div class="cart-item-price">$${(Number(c.price) * c.qty).toLocaleString('es-AR')}</div>
    </div>`).join('');
}

// PARTE 1: openCart requiere sesión activa
async function openCart() {
  const user = await requireLogin({ type: 'openCart' });
  if (!user) return;
  document.getElementById('cartDrawer').classList.add('open');
  document.getElementById('overlay').classList.add('open');
}

function closeCart() {
  document.getElementById('cartDrawer').classList.remove('open');
  document.getElementById('overlay').classList.remove('open');
}

// PARTE 1: checkout requiere sesión activa
async function checkout() {
  if (!cart.length) { showToast('Tu carrito está vacío', '⚠️'); return; }

  const user = await requireLogin({ type: 'checkout' });
  if (!user) return;

  showToast('Redirigiendo a MercadoPago...', '🛒');
  closeCart();
}

// ============================================================
// AUTH — Supabase real
// ============================================================

// PARTE 2: openLogin acepta un parámetro de intención para
// mostrar contexto al usuario ("¿Por qué te pedimos que inicies sesión?")
function openLogin(tab = 'login', context = null) {
  document.getElementById('loginModal').classList.add('open');
  document.getElementById('overlay').classList.add('open');
  const err = document.getElementById('authError');
  if (err) err.style.display = 'none';

  // Mostrar contexto si viene de una acción protegida
  const sub = document.getElementById('modalSubtitle');
  if (sub) {
    sub.textContent = context
      ? context
      : 'Accedé para ver tus pedidos, guardar tu carrito y más.';
  }

  switchTab(tab);
}

function closeLogin() {
  document.getElementById('loginModal').classList.remove('open');
  document.getElementById('overlay').classList.remove('open');
  ['loginEmail','loginPass','loginPassConfirm','registerName'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  const err = document.getElementById('authError');
  if (err) err.style.display = 'none';
}

function closeAll() { closeCart(); closeLogin(); }

function switchTab(tab) {
  const isLogin = tab === 'login';
  document.getElementById('tabLogin').classList.toggle('active', isLogin);
  document.getElementById('tabRegister').classList.toggle('active', !isLogin);
  document.getElementById('fieldName').style.display        = isLogin ? 'none' : '';
  document.getElementById('fieldPassConfirm').style.display = isLogin ? 'none' : '';
  document.getElementById('authMainBtn').textContent        = isLogin ? 'Ingresar' : 'Crear cuenta';
  document.getElementById('authMainBtn').onclick            = isLogin ? doLogin : doRegister;
  document.getElementById('authFooter').innerHTML           = isLogin
    ? '¿No tenés cuenta? <a href="#" onclick="switchTab(\'register\')">Registrarte gratis</a>'
    : '¿Ya tenés cuenta? <a href="#" onclick="switchTab(\'login\')">Ingresar</a>';
  const err = document.getElementById('authError');
  if (err) err.style.display = 'none';
}

async function googleLogin() {
  const btn = document.querySelector('.google-btn');
  if (btn) { btn.textContent = 'Redirigiendo a Google...'; btn.disabled = true; }
  try {
    const { error } = await db.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + window.location.pathname }
    });
    if (error) throw error;
  } catch (err) {
    showAuthError(err.message || 'Error al conectar con Google. Verificá la configuración.');
    if (btn) {
      btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24"><path fill="#EA4335" d="M5.26 9.77a7.07 7.07 0 0 1 6.74-4.83c1.7 0 3.23.6 4.43 1.6l3.3-3.3A11.94 11.94 0 0 0 12 0C7.08 0 2.87 2.87.96 7.07l4.3 2.7z"/><path fill="#34A853" d="M16.16 17.6A7.07 7.07 0 0 1 12 19.06c-2.87 0-5.32-1.71-6.54-4.2L1.09 17.6C3.09 21.44 7.2 24 12 24c2.96 0 5.72-1.04 7.81-2.76l-3.65-3.64z"/><path fill="#4A90D9" d="M19.81 21.24A11.94 11.94 0 0 0 24 12c0-.7-.07-1.38-.19-2.04H12v4.56h6.72a5.73 5.73 0 0 1-2.56 3.72l3.65 3.64-.14-.04z"/><path fill="#FBBC05" d="M5.46 14.86A7.1 7.1 0 0 1 4.94 12c0-.99.18-1.95.52-2.83L1.09 6.39A11.94 11.94 0 0 0 0 12c0 1.92.45 3.74 1.26 5.36l4.2-2.5z"/></svg> Continuar con Google`;
      btn.disabled = false;
    }
  }
}

async function doLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const pass  = document.getElementById('loginPass').value;
  const btn   = document.getElementById('authMainBtn');
  if (!email || !pass) { showAuthError('Completá email y contraseña'); return; }
  btn.textContent = 'Ingresando...'; btn.disabled = true;
  try {
    const { data, error } = await db.auth.signInWithPassword({ email, password: pass });
    if (error) throw error;
    setLoggedIn(data.user);
    closeLogin();
    showToast('Bienvenida de vuelta 🌸', '✨');
    // PARTE 2: ejecutar acción pendiente post-login
    runPendingIntent();
  } catch (err) {
    showAuthError(err.message.includes('Invalid login') ? 'Email o contraseña incorrectos' : err.message);
  } finally {
    btn.textContent = 'Ingresar'; btn.disabled = false;
  }
}

async function doRegister() {
  const name    = (document.getElementById('registerName')?.value || '').trim();
  const email   = document.getElementById('loginEmail').value.trim();
  const pass    = document.getElementById('loginPass').value;
  const confirm = document.getElementById('loginPassConfirm')?.value;
  const btn     = document.getElementById('authMainBtn');

  if (!email || !pass)             { showAuthError('Completá email y contraseña'); return; }
  if (pass.length < 6)             { showAuthError('La contraseña debe tener al menos 6 caracteres'); return; }
  if (confirm && pass !== confirm) { showAuthError('Las contraseñas no coinciden'); return; }

  btn.textContent = 'Creando cuenta...'; btn.disabled = true;
  try {
    const { data, error } = await db.auth.signUp({
      email,
      password: pass,
      options: { data: { full_name: name || email.split('@')[0] } }
    });
    if (error) throw error;
    if (data.user && !data.session) {
      closeLogin();
      showToast('Revisá tu email para confirmar tu cuenta 📧', '💛');
    } else {
      setLoggedIn(data.user);
      closeLogin();
      showToast(`Bienvenida${name ? ', ' + name : ''} 🌸`, '✨');
      // PARTE 2: ejecutar acción pendiente post-registro
      runPendingIntent();
    }
  } catch (err) {
    const msg = err.message.includes('already registered')
      ? 'Este email ya tiene una cuenta. Iniciá sesión.'
      : err.message;
    showAuthError(msg);
  } finally {
    btn.textContent = 'Crear cuenta'; btn.disabled = false;
  }
}

async function doLogout() {
  await db.auth.signOut();
  currentUser = null;
  pendingIntent = null;
  setLoggedOut();
  showToast('Sesión cerrada', '👋');
}

function toggleUserMenu() {
  document.getElementById('userChip').classList.toggle('menu-open');
}

document.addEventListener('click', (e) => {
  const chip = document.getElementById('userChip');
  if (chip && !chip.contains(e.target)) chip.classList.remove('menu-open');
});

function handleLogout(e) {
  e.stopPropagation();
  document.getElementById('userChip').classList.remove('menu-open');
  doLogout();
}

function setLoggedIn(user) {
  currentUser = user;
  const name  = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuaria';
  const email = user.email || '';

  document.getElementById('loginNavBtn').style.display = 'none';
  const chip = document.getElementById('userChip');
  chip.classList.add('visible');
  chip.classList.remove('menu-open');
  chip.onclick = toggleUserMenu;

  document.getElementById('userAvatar').textContent    = name[0].toUpperCase();
  document.getElementById('userNameNav').textContent   = name;
  document.getElementById('dropdownName').textContent  = name;
  document.getElementById('dropdownEmail').textContent = email;

  loadUserCart(user.id);
}

function setLoggedOut() {
  document.getElementById('loginNavBtn').style.display = '';
  const chip = document.getElementById('userChip');
  chip.classList.remove('visible');
  chip.classList.remove('menu-open');
  chip.onclick = null;
  clearCartUI();
}

function showAuthError(msg) {
  let err = document.getElementById('authError');
  if (!err) {
    err = document.createElement('div');
    err.id = 'authError';
    err.style.cssText = 'font-size:12px;color:#8c4040;background:#f9eaea;padding:10px 14px;margin-bottom:14px;border-left:3px solid #b07a6a;font-family:var(--sans,sans-serif);';
    document.getElementById('authMainBtn').before(err);
  }
  err.textContent = msg;
  err.style.display = 'block';
}

// PARTE 2: onAuthStateChange también ejecuta el intent pendiente
// (captura el redirect de Google OAuth)
db.auth.onAuthStateChange((event, session) => {
  if (session?.user) {
    setLoggedIn(session.user);
    if (event === 'SIGNED_IN') {
      closeLogin();
      // Ejecutar acción pendiente si la hay (caso Google OAuth)
      runPendingIntent();
    }
  } else {
    currentUser = null;
    pendingIntent = null;
    setLoggedOut();
  }
});

// ============================================================
// NEWSLETTER
// ============================================================
function subscribeNewsletter() {
  const email = document.getElementById('nlEmail').value.trim();
  if (!email) { showToast('Ingresá tu email primero', '⚠️'); return; }
  document.getElementById('nlEmail').value = '';
  showToast('Suscripta exitosamente 🌿', '💛');
}

// ============================================================
// TOAST
// ============================================================
function showToast(msg, icon = '') {
  const t = document.getElementById('toast');
  document.getElementById('toastMsg').textContent = msg;
  document.getElementById('toastIcon').textContent = icon;
  t.classList.add('show');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
}

// ============================================================
// MOBILE MENU
// ============================================================
let mobileMenuOpen = false;
function toggleMobileMenu() {
  mobileMenuOpen = !mobileMenuOpen;
  document.getElementById('mobileMenu').classList.toggle('open', mobileMenuOpen);
  document.getElementById('hamburger').classList.toggle('open', mobileMenuOpen);
}
function closeMobileMenu() {
  mobileMenuOpen = false;
  document.getElementById('mobileMenu').classList.remove('open');
  document.getElementById('hamburger').classList.remove('open');
}

// ============================================================
// SCROLL REVEAL
// ============================================================
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(el => { if (el.isIntersecting) el.target.classList.add('visible'); });
}, { threshold: 0.1 });
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// ============================================================
// RITUALES
// ============================================================
function toggleSteps(id, btn) {
  const steps = document.getElementById('steps-' + id);
  const isOpen = steps.style.display !== 'none';
  steps.style.display = isOpen ? 'none' : 'block';
  btn.querySelector('svg').style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
  if (isOpen) btn.innerHTML = btn.innerHTML.replace(/Ocultar/g, 'Ver los').replace('Ver los tips', 'Ver los tips');
  else btn.innerHTML = btn.innerHTML.replace('Ver los', 'Ocultar').replace('Ver la', 'Ocultar');
}

function filterArticles(cat, pillBtn) {
  document.querySelectorAll('.rtab').forEach(b => b.classList.remove('active'));
  pillBtn.classList.add('active');
  document.querySelectorAll('.ritual-card').forEach(card => {
    const show = cat === 'todos' || card.dataset.cat === cat;
    card.style.display = show ? '' : 'none';
    if (show) setTimeout(() => card.classList.add('visible'), 30);
  });
}

// ============================================================
// INIT
// ============================================================
updateCartUI();
loadCategories();
loadProducts().then(() => updateCategoryCounts());