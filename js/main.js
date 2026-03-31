NEXT_PUBLIC_SUPABASE_URL = 'https://vytflddvmznwvrlyjdvk.supabase.co';
NEXT_PUBLIC_SUPABASE_KEY = 'sb_publishable_6YBT-P5V8dJMEBaiaVDkBA_SUxTrAFS';

// ---- FILTER ----
function filterProducts(cat, catCard, pillBtn) {
  // Update category cards
  if (catCard) {
    document.querySelectorAll('.cat-card').forEach(c => c.classList.remove('active'));
    catCard.classList.add('active');
  }
  // Update pills
  if (pillBtn) {
    document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
    pillBtn.classList.add('active');
  }
  renderProducts(cat);
}

// ---- CART ----
function addToCart(id, e) {
  if (e) e.stopPropagation();
  const p = products.find(p => p.id === id);
  const existing = cart.find(c => c.id === id);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ ...p, qty: 1 });
  }
  updateCartUI();
  renderCartBody();
  renderProducts(getActiveFilter());
  showToast(`${p.icon} ${p.name} agregado`, '✨');
}

function removeFromCart(id) {
  cart = cart.filter(c => c.id !== id);
  updateCartUI();
  renderCartBody();
  renderProducts(getActiveFilter());
}

function changeQty(id, delta) {
  const item = cart.find(c => c.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) { removeFromCart(id); return; }
  updateCartUI();
  renderCartBody();
}

function getActiveFilter() {
  const active = document.querySelector('.filter-pill.active');
  if (!active) return 'todos';
  return active.textContent.trim().toLowerCase() === 'todos' ? 'todos' 
    : active.textContent.trim().toLowerCase();
}

function updateCartUI() {
  const total = cart.reduce((s, c) => s + c.qty, 0);
  document.getElementById('cartCount').textContent = total;
  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
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
      <div class="cart-item-thumb">${c.icon}</div>
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
      <div class="cart-item-price">$${(c.price * c.qty).toLocaleString('es-AR')}</div>
    </div>
  `).join('');
}

function openCart()  { document.getElementById('cartDrawer').classList.add('open'); document.getElementById('overlay').classList.add('open'); }
function closeCart() { document.getElementById('cartDrawer').classList.remove('open'); document.getElementById('overlay').classList.remove('open'); }

function checkout() {
  if (!cart.length) { showToast('Tu carrito está vacío', '⚠️'); return; }
  showToast('Redirigiendo a MercadoPago...', '🛒');
  closeCart();
}

// ---- AUTH ----
function openLogin()  { document.getElementById('loginModal').classList.add('open'); document.getElementById('overlay').classList.add('open'); }
function closeLogin() { document.getElementById('loginModal').classList.remove('open'); document.getElementById('overlay').classList.remove('open'); }
function closeAll()   { closeCart(); closeLogin(); }

async function mostrarUsuario() {
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    console.log(user);

    // Nombre desde Google
    const nombre = user.user_metadata?.full_name || user.email;

    const userElement = document.getElementById("user-name");

    if (userElement) {
      userElement.textContent = nombre;
    }
  }
}

mostrarUsuario();
// ---- NEWSLETTER ----
function subscribeNewsletter() {
  const email = document.getElementById('nlEmail').value;
  if (!email) { showToast('Ingresá tu email primero', '⚠️'); return; }
  document.getElementById('nlEmail').value = '';
  showToast('Suscripta exitosamente 🌿', '💛');
}

// ---- TOAST ----
function showToast(msg, icon = '✨') {
  const t = document.getElementById('toast');
  document.getElementById('toastMsg').textContent = msg;
  document.getElementById('toastIcon').textContent = icon;
  t.classList.add('show');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
}

// ---- MOBILE MENU ----
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

// ---- SCROLL REVEAL ----
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(el => {
    if (el.isIntersecting) el.target.classList.add('visible');
  });
}, { threshold: 0.1 });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// ---- RITUALES ----
function toggleSteps(id, btn) {
  const steps = document.getElementById('steps-' + id);
  const isOpen = steps.style.display !== 'none';
  steps.style.display = isOpen ? 'none' : 'block';
  const svg = btn.querySelector('svg');
  svg.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
  const currentText = btn.textContent.trim();
  if (isOpen) {
    btn.innerHTML = btn.innerHTML.replace('Ocultar', 'Ver los');
  } else {
    btn.innerHTML = btn.innerHTML.replace('Ver los', 'Ocultar').replace('Ver la', 'Ocultar').replace('Ver los tips', 'Ocultar tips');
  }
}

function filterArticles(cat, pillBtn) {
  document.querySelectorAll('.rtab').forEach(b => b.classList.remove('active'));
  pillBtn.classList.add('active');
  document.querySelectorAll('.ritual-card').forEach(card => {
    if (cat === 'todos' || card.dataset.cat === cat) {
      card.style.display = '';
      setTimeout(() => card.classList.add('visible'), 30);
    } else {
      card.style.display = 'none';
    }
  });
}
supabase.auth.onAuthStateChange((event, session) => {
  console.log("Evento auth:", event);

  if (session?.user) {
    const user = session.user;

    const nombre = user.user_metadata?.full_name || user.email;

    const userElement = document.getElementById("user-name");

    if (userElement) {
      userElement.textContent = nombre;
    }
  }
});


// ---- INIT ----
loadProducts();