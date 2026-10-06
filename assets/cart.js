import { DialogElement } from './dialog-element.js'

// Just a <dialog>, same pattern as the header drawer / search modal / filters
// drawer (see assets/dialog-element.js) — no custom open/close logic needed.
class CartDrawer extends DialogElement {}

customElements.define('cart-drawer', CartDrawer)

// Replaced outright (not just innerHTML) so the fresh server render's own
// attributes/classes win too — e.g. data-cart-count's `hidden` class when the
// cart becomes empty. None of these wrap the <dialog> itself, so its open
// state is unaffected either way (see collection.js for why that distinction
// matters elsewhere).
const SYNC_ATTRIBUTES = ['data-cart-drawer-content', 'data-cart-count', 'data-cart-count-status']

function syncFromHeaderHtml(headerHtml) {
  const doc = new DOMParser().parseFromString(headerHtml, 'text/html')
  SYNC_ATTRIBUTES.forEach((attribute) => {
    const current = document.querySelector(`[${attribute}]`)
    const updated = doc.querySelector(`[${attribute}]`)
    if (current && updated) current.replaceWith(updated)
  })
}

function openDrawer() {
  document.querySelector('cart-drawer dialog')?.showModal()
}

async function postCart(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`Cart request failed: ${response.status}`)
  return response.json()
}

async function handleCartUpdate(url, body, { shouldOpenDrawer = false } = {}) {
  try {
    const data = await postCart(url, { ...body, sections: 'header' })
    syncFromHeaderHtml(data.sections.header)
    if (shouldOpenDrawer) openDrawer()
    document.dispatchEvent(new CustomEvent('cart:updated', { detail: { cart: data } }))
  } catch (error) {
    console.error(error)
  }
}

document.addEventListener('submit', (event) => {
  const form = event.target
  if (!form.action?.includes('/cart/add')) return

  event.preventDefault()
  // /cart/add.js takes { items: [{ id, quantity, ... }] }, unlike /cart/change.js
  // below, which takes a flat { id, quantity } identified by line item key.
  const item = Object.fromEntries(new FormData(form))
  handleCartUpdate(`${form.action.split('?')[0]}.js`, { items: [item] }, { shouldOpenDrawer: true })
})

// The /cart page's quantity inputs (sections/cart.liquid) submit on change
// rather than requiring the "Update" button — that button stays in the markup
// as the no-JS fallback, since requestSubmit() needs JavaScript to fire at all.
document.addEventListener('change', (event) => {
  if (event.target.matches('input[name="updates[]"]')) event.target.form?.requestSubmit()
})

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-line-key]')
  if (!button) return

  const lineKey = button.dataset.lineKey
  const quantityEl = button.closest('li')?.querySelector('[data-cart-quantity]')
  const currentQuantity = Number(quantityEl?.textContent.trim() || 1)

  if (event.target.closest('[data-cart-quantity-increase]')) {
    handleCartUpdate('/cart/change.js', { id: lineKey, quantity: currentQuantity + 1 })
  } else if (event.target.closest('[data-cart-quantity-decrease]')) {
    handleCartUpdate('/cart/change.js', { id: lineKey, quantity: Math.max(0, currentQuantity - 1) })
  } else if (event.target.closest('[data-cart-remove]')) {
    handleCartUpdate('/cart/change.js', { id: lineKey, quantity: 0 })
  }
})
