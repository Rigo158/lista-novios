/* ══════════════════════════════════════════════════════
   CONFIGURACIÓN SUPABASE
   ══════════════════════════════════════════════════════ */
const SUPABASE_URL   = 'https://qzzhworyzlehdjopyqly.supabase.co';
const SUPABASE_ANON  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6emh3b3J5emxlaGRqb3B5cWx5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwNTk2NTAsImV4cCI6MjA5MjYzNTY1MH0.g4OBkUnIAP22_ki-5ynj13aom6zCk1AWNUH0VefWAgQ';
const STORAGE_BUCKET = 'assets';
const STORAGE_BASE   = `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}`;

const sbHeaders = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_ANON,
  'Authorization': 'Bearer ' + SUPABASE_ANON
};

/* ══════════════════════════════════════════════════════
   ESTADO GLOBAL
   ══════════════════════════════════════════════════════ */
let currentGiftId = '';
let currentGiftName = '';
let currentGiftPrice = 0;

const overlay = document.getElementById('modalOverlay');

/* ══════════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════════ */
function getEl(id) {
  return document.getElementById(id);
}

function clearErrors() {
  getEl('errorName')?.classList.remove('show');
  getEl('errorEmail')?.classList.remove('show');
}

function showStep(n) {
  [1, 2, 3].forEach(i => {
    getEl('step' + i)?.classList.toggle('active', i === n);
  });
}

function resetModalForm() {
  if (getEl('guestName')) getEl('guestName').value = '';
  if (getEl('guestEmail')) getEl('guestEmail').value = '';
  if (getEl('guestMsg')) getEl('guestMsg').value = '';
  if (getEl('submitStatus')) {
    getEl('submitStatus').textContent = '';
    getEl('submitStatus').className = 'submit-status';
  }
  if (getEl('btnConfirm')) getEl('btnConfirm').disabled = false;

  const btnAll = getEl('btnCopyAll');
  if (btnAll) {
    btnAll.textContent = '📋 Copiar todos los datos bancarios';
    btnAll.classList.remove('copied');
  }

  clearErrors();
  showStep(1);
}

function setGiftTakenState(card, isTaken) {
  if (!card) return;
  card.classList.toggle('is-gifted', !!isTaken);
}

/* ══════════════════════════════════════════════════════
   MODAL
   ══════════════════════════════════════════════════════ */
function openModal(id, name, price) {
  if (!overlay) return;

  currentGiftId = id;
  currentGiftName = name;
  currentGiftPrice = price;

  if (getEl('giftChip1')) getEl('giftChip1').textContent = name;
  if (getEl('giftChip2')) getEl('giftChip2').textContent = name;

  const priceLabel = price > 0
    ? '$' + price.toLocaleString('es-CL') + ' CLP'
    : 'Lo que quieras 💜';

  if (getEl('amountDisplay')) {
    getEl('amountDisplay').textContent = priceLabel;
  }

  if (getEl('transferComment')) {
    getEl('transferComment').textContent = 'Regalo – ' + name;
  }

  showStep(1);
  overlay.classList.add('is-open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  if (!overlay) return;

  overlay.classList.remove('is-open');
  document.body.style.overflow = '';

  setTimeout(() => {
    resetModalForm();
  }, 300);
}

function goToStep1() {
  showStep(1);
}

function goToStep2() {
  clearErrors();

  const name = getEl('guestName')?.value.trim() || '';
  const email = getEl('guestEmail')?.value.trim() || '';
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  let ok = true;

  if (!name) {
    getEl('errorName')?.classList.add('show');
    ok = false;
  }

  if (!emailOk) {
    getEl('errorEmail')?.classList.add('show');
    ok = false;
  }

  if (!ok) return;

  const comment = name + ' – ' + currentGiftName;
  if (getEl('transferComment')) {
    getEl('transferComment').textContent = comment;
  }

  showStep(2);
}

async function goToStep3() {
  const btn = getEl('btnConfirm');
  const status = getEl('submitStatus');
  const name = getEl('guestName')?.value.trim() || '';
  const email = getEl('guestEmail')?.value.trim() || '';
  const msg = getEl('guestMsg')?.value.trim() || '';

  if (btn) btn.disabled = true;
  if (status) {
    status.textContent = 'Guardando…';
    status.className = 'submit-status';
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/confirmaciones`, {
      method: 'POST',
      headers: { ...sbHeaders, 'Prefer': 'return=minimal' },
      body: JSON.stringify({
        regalo_id: currentGiftId,
        regalo_nombre: currentGiftName,
        monto: currentGiftPrice,
        nombre_invitado: name,
        email_invitado: email,
        mensaje: msg || null
      })
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(err);
    }

    const card = document.querySelector(`.gift-card[data-id="${currentGiftId}"]`);
    if (card && card.dataset.alwaysOpen !== 'true') {
      setGiftTakenState(card, true);
    }

    if (getEl('thanksGuestName')) {
      getEl('thanksGuestName').textContent = name;
    }

    showStep(3);
  } catch (e) {
    console.error('Supabase error:', e);

    if (status) {
      status.textContent = 'Hubo un problema al guardar. Puedes continuar igual, ¡gracias!';
      status.className = 'submit-status error';
    }

    if (btn) btn.disabled = false;

    setTimeout(() => {
      if (getEl('thanksGuestName')) {
        getEl('thanksGuestName').textContent = name;
      }
      showStep(3);
    }, 2000);
  }
}

/* ══════════════════════════════════════════════════════
   COPIAR DATOS
   ══════════════════════════════════════════════════════ */
function copyField(id, btn) {
  const el = getEl(id);
  if (!el || !navigator.clipboard) return;

  const text = el.textContent.trim();
  navigator.clipboard.writeText(text).then(() => {
    btn.textContent = '✓ Copiado';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = 'Copiar';
      btn.classList.remove('copied');
    }, 2000);
  });
}

function copyAllBank(btn) {
  if (!navigator.clipboard) return;

  const nombre = getEl('bNombre')?.textContent.trim() || '';
  const rut = getEl('bRut')?.textContent.trim() || '';
  const banco = getEl('bBanco')?.textContent.trim() || '';
  const tipo = getEl('bTipo')?.textContent.trim() || '';
  const cuenta = getEl('bCuenta')?.textContent.trim() || '';
  const email = getEl('bEmail')?.textContent.trim() || '';

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

/* ══════════════════════════════════════════════════════
   INICIALIZACIÓN REGALOS
   ══════════════════════════════════════════════════════ */
function initGiftButtons() {
  document.querySelectorAll('.gift-card').forEach(card => {
    const name = card.dataset.name || '';
    const price = parseInt(card.dataset.price, 10) || 0;
    const id = card.dataset.id || '';
    const priceRow = card.querySelector('.gift-price-row');

    if (!priceRow) return;

    const oldBtn = priceRow.querySelector('.btn-regalar');
    if (oldBtn) oldBtn.remove();

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-regalar';
    btn.textContent = 'Regalar 💜';

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openModal(id, name, price);
    });

    priceRow.appendChild(btn);
  });
}

function initGiftImages() {
  document.querySelectorAll('.gift-card').forEach(card => {
    const slug = card.dataset.imgSlug;
    const img = card.querySelector('.gift-img-wrap img');

    if (slug && img) {
      img.src = `${STORAGE_BASE}/${slug}.jpg`;
      img.onload = () => img.classList.add('loaded');
      img.onerror = () => { img.style.display = 'none'; };
    }
  });
}

async function syncGiftStateFromSupabase() {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/confirmaciones?select=regalo_id`,
      { headers: { ...sbHeaders, 'Accept': 'application/json' } }
    );

    if (!res.ok) return;

    const data = await res.json();
    const counts = {};

    data.forEach(r => {
      counts[r.regalo_id] = (counts[r.regalo_id] || 0) + 1;
    });

    document.querySelectorAll('.gift-card').forEach(card => {
      const id = card.dataset.id;
      const alwaysOpen = card.dataset.alwaysOpen === 'true';
      setGiftTakenState(card, !alwaysOpen && counts[id] > 0);
    });
  } catch (e) {
    console.warn('No se pudo leer el estado de regalos:', e);
  }
}

async function initGifts() {
  initGiftImages();
  initGiftButtons();
  await syncGiftStateFromSupabase();

  const loadingBanner = getEl('loadingBanner');
  if (loadingBanner) loadingBanner.style.display = 'none';
}

/* ══════════════════════════════════════════════════════
   EVENTOS GLOBALES
   ══════════════════════════════════════════════════════ */
getEl('modalClose')?.addEventListener('click', closeModal);

overlay?.addEventListener('click', (e) => {
  if (e.target === overlay) closeModal();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && overlay?.classList.contains('is-open')) {
    closeModal();
  }
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGifts);
} else {
  initGifts();
}
