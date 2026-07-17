/* ══════════════════════════════════════════════════════
   CONFIGURACIÓN SUPABASE
   ══════════════════════════════════════════════════════ */
const SUPABASE_URL   = 'https://qzzhworyzlehdjopyqly.supabase.co';
const SUPABASE_ANON  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6emh3b3J5emxlaGRqb3B5cWx5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwNTk2NTAsImV4cCI6MjA5MjYzNTY1MH0.g4OBkUnIAP22_ki-5ynj13aom6zCk1AWNUH0VefWAgQ';
const STORAGE_BUCKET = 'assets';
const STORAGE_BASE   = `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}`;

/* ── Headers comunes Supabase ────────────────────────── */
const sbHeaders = {
  'Content-Type':  'application/json',
  'apikey':        SUPABASE_ANON,
  'Authorization': 'Bearer ' + SUPABASE_ANON
};

/* ════════════════════════════════════════════════════════
   INICIALIZACIÓN: imágenes + estado regalos desde Supabase
   ════════════════════════════════════════════════════════ */
async function initGifts() {
  // 1. Cargar imágenes desde Supabase Storage
  document.querySelectorAll('.gift-card').forEach(card => {
    const slug = card.dataset.imgSlug;
    const img  = card.querySelector('.gift-img-wrap img');
    if (slug && img) {
      img.src = `${STORAGE_BASE}/${slug}.jpg`;
      img.onload  = () => img.classList.add('loaded');
      img.onerror = () => { img.style.display = 'none'; };
    }
  });

  // 2. Leer confirmaciones desde Supabase para marcar regalos tomados
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/confirmaciones?select=regalo_id`,
      { headers: { ...sbHeaders, 'Accept': 'application/json' } }
    );

    if (res.ok) {
      const data = await res.json();
      const counts = {};
      data.forEach(r => { counts[r.regalo_id] = (counts[r.regalo_id] || 0) + 1; });

      document.querySelectorAll('.gift-card').forEach(card => {
        const id         = card.dataset.id;
        const alwaysOpen = card.dataset.alwaysOpen === 'true';
        if (!alwaysOpen && counts[id] > 0) {
          card.classList.add('is-gifted');
        }
      });
    }
  } catch (e) {
    console.warn('No se pudo leer el estado de regalos:', e);
  }

  // 3. Inicializar botones "Regalar"
  document.querySelectorAll('.gift-card').forEach(card => {
    const name  = card.dataset.name  || '';
    const price = parseInt(card.dataset.price) || 0;
    const id    = card.dataset.id    || '';
    const priceRow = card.querySelector('.gift-price-row');

    const btn = document.createElement('button');
    btn.className   = 'btn-regalar';
    btn.textContent = 'Regalar 💜';
    btn.addEventListener('click', () => {
      if (!card.classList.contains('is-gifted')) {
        openModal(id, name, price);
      }
    });
    priceRow.appendChild(btn);
  });

  // Ocultar banner de carga
  document.getElementById('loadingBanner').style.display = 'none';
}

initGifts();

/* ══════════════════════════════════════════════════════
   ESTADO DEL MODAL
   ══════════════════════════════════════════════════════ */
let currentGiftId    = '';
let currentGiftName  = '';
let currentGiftPrice = 0;

/* ══════════════════════════════════════════════════════
   MODAL
   ══════════════════════════════════════════════════════ */
const overlay = document.getElementById('modalOverlay');

function openModal(id, name, price) {
  currentGiftId    = id;
  currentGiftName  = name;
  currentGiftPrice = price;

  document.getElementById('giftChip1').textContent = name;
  document.getElementById('giftChip2').textContent = name;

  const priceLabel = price > 0
    ? '$' + price.toLocaleString('es-CL') + ' CLP'
    : 'Lo que quieras 💜';
  document.getElementById('amountDisplay').textContent = priceLabel;
  document.getElementById('transferComment').textContent = 'Regalo – ' + name;

  showStep(1);
  overlay.classList.add('is-open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  overlay.classList.remove('is-open');
  document.body.style.overflow = '';
  setTimeout(() => {
    document.getElementById('guestName').value  = '';
    document.getElementById('guestEmail').value = '';
    document.getElementById('guestMsg').value   = '';
    document.getElementById('submitStatus').textContent = '';
    document.getElementById('submitStatus').className  = 'submit-status';
    document.getElementById('btnConfirm').disabled = false;
    // Resetear botón copiar todo
    const btnAll = document.getElementById('btnCopyAll');
    if (btnAll) {
      btnAll.textContent = '📋 Copiar todos los datos bancarios';
      btnAll.classList.remove('copied');
    }
    clearErrors();
    showStep(1);
  }, 300);
}

function showStep(n) {
  [1,2,3].forEach(i =>
    document.getElementById('step'+i).classList.toggle('active', i === n)
  );
}

function clearErrors() {
  document.getElementById('errorName').classList.remove('show');
  document.getElementById('errorEmail').classList.remove('show');
}

function goToStep1() { showStep(1); }

function goToStep2() {
  clearErrors();
  const name    = document.getElementById('guestName').value.trim();
  const email   = document.getElementById('guestEmail').value.trim();
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  let ok = true;
  if (!name)    { document.getElementById('errorName').classList.add('show');  ok = false; }
  if (!emailOk) { document.getElementById('errorEmail').classList.add('show'); ok = false; }
  if (!ok) return;

  const comment = name + ' – ' + currentGiftName;
  document.getElementById('transferComment').textContent = comment;
  showStep(2);
}

/* ── Guardar confirmación en Supabase y pasar a paso 3 ─ */
async function goToStep3() {
  const btn    = document.getElementById('btnConfirm');
  const status = document.getElementById('submitStatus');
  const name   = document.getElementById('guestName').value.trim();
  const email  = document.getElementById('guestEmail').value.trim();
  const msg    = document.getElementById('guestMsg').value.trim();

  btn.disabled = true;
  status.textContent = 'Guardando…';
  status.className   = 'submit-status';

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/confirmaciones`, {
      method:  'POST',
      headers: { ...sbHeaders, 'Prefer': 'return=minimal' },
      body: JSON.stringify({
        regalo_id:       currentGiftId,
        regalo_nombre:   currentGiftName,
        monto:           currentGiftPrice,
        nombre_invitado: name,
        email_invitado:  email,
        mensaje:         msg || null
      })
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(err);
    }

    // Marcar tarjeta como regalada (excepto Libre Elección)
    const card = document.querySelector(`.gift-card[data-id="${currentGiftId}"]`);
    if (card && card.dataset.alwaysOpen !== 'true') {
      card.classList.add('is-gifted');
    }

    document.getElementById('thanksGuestName').textContent = name;
    showStep(3);

  } catch (e) {
    console.error('Supabase error:', e);
    status.textContent = 'Hubo un problema al guardar. Puedes continuar igual, ¡gracias!';
    status.className   = 'submit-status error';
    btn.disabled = false;

    // Avanzar de todas formas después de 2 s
    setTimeout(() => {
      document.getElementById('thanksGuestName').textContent = name;
      showStep(3);
    }, 2000);
  }
}

/* ── Copiar al portapapeles (campo individual) ──────── */
function copyField(id, btn) {
  const text = document.getElementById(id).textContent.trim();
  navigator.clipboard.writeText(text).then(() => {
    btn.textContent = '✓ Copiado';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = 'Copiar';
      btn.classList.remove('copied');
    }, 2000);
  });
}

/* ── Copiar todos los datos bancarios de una vez ─────── */
function copyAllBank(btn) {
  const nombre = document.getElementById('bNombre').textContent.trim();
  const rut    = document.getElementById('bRut').textContent.trim();
  const banco  = document.getElementById('bBanco').textContent.trim();
  const tipo   = document.getElementById('bTipo').textContent.trim();
  const cuenta = document.getElementById('bCuenta').textContent.trim();
  const email  = document.getElementById('bEmail').textContent.trim();

  const text = [
    `Titular: ${nombre}`,
    `RUT: ${rut}`,
    `Banco: ${banco}`,
    `Tipo de cuenta: ${tipo}`,
    `N° de cuenta: ${cuenta}`,
    `Email: ${email}`
  ].join('\n');

  navigator.clipboard.writeText(text).then(() => {
    btn.textContent = '✓ ¡Datos copiados!';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = '📋 Copiar todos los datos bancarios';
      btn.classList.remove('copied');
    }, 3000);
  });
}

/* ── Cerrar modal al hacer clic fuera ───────────────── */
document.getElementById('modalClose').addEventListener('click', closeModal);
overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
