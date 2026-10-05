class ProductGallery extends HTMLElement {
  connectedCallback() {
    this.main = this.querySelector('[data-gallery-main]')
    if (!this.main) return

    this.addEventListener('click', (event) => {
      const thumb = event.target.closest('[data-gallery-thumb]')
      if (!thumb) return

      this.show(thumb.dataset.fullSrc, thumb.dataset.alt)
      this.querySelectorAll('[data-gallery-thumb]').forEach((button) => {
        button.setAttribute('aria-current', String(button === thumb))
      })
    })
  }

  show(src, alt) {
    this.main.src = src
    this.main.alt = alt
  }
}

class ProductForm extends HTMLElement {
  connectedCallback() {
    this.variants = JSON.parse(this.querySelector('[data-product-variants]')?.textContent ?? '[]')
    this.select = this.querySelector('[data-variant-select]')
    this.price = this.querySelector('[data-product-price]')
    this.addToCart = this.querySelector('[data-add-to-cart]')
    this.addToCartText = this.querySelector('[data-add-to-cart-text]')
    this.gallery = document.querySelector('product-gallery')
    if (!this.select || !this.variants.length) return

    this.addEventListener('click', (event) => {
      const option = event.target.closest('[data-option-value]')
      if (option) {
        this.selectOption(option)
        return
      }
      if (event.target.closest('[data-quantity-increase]')) this.stepQuantity(1)
      if (event.target.closest('[data-quantity-decrease]')) this.stepQuantity(-1)
    })

    this.markSoldOutOptions()
  }

  selectedValues() {
    return [...this.querySelectorAll('[data-option-value][aria-pressed="true"]')]
      .sort((a, b) => a.dataset.optionPosition - b.dataset.optionPosition)
      .map((el) => el.dataset.value)
  }

  selectOption(button) {
    this.querySelectorAll(`[data-option-position="${button.dataset.optionPosition}"]`).forEach((sibling) => {
      sibling.setAttribute('aria-pressed', String(sibling === button))
    })

    const variant = this.variants.find((candidate) => candidate.options.every((value, index) => value === this.selectedValues()[index]))
    if (variant) this.selectVariant(variant)
    this.markSoldOutOptions()
  }

  // Marks each option button sold out if swapping it in (keeping the other
  // positions as currently selected) would land on an unavailable variant —
  // not just whether the overall selected variant itself is unavailable.
  markSoldOutOptions() {
    const selected = this.selectedValues()
    this.querySelectorAll('[data-option-value]').forEach((button) => {
      const hypothetical = [...selected]
      hypothetical[button.dataset.optionPosition - 1] = button.dataset.value
      const variant = this.variants.find((candidate) => candidate.options.every((value, index) => value === hypothetical[index]))
      button.toggleAttribute('data-sold-out', !variant || !variant.available)
    })
  }

  selectVariant(variant) {
    this.select.value = variant.id

    if (this.price) {
      const compareAt = variant.compare_at_price > variant.price
        ? `<span class="text-foreground/60 line-through">${this.formatMoney(variant.compare_at_price)}</span> `
        : ''
      this.price.innerHTML = `${compareAt}${this.formatMoney(variant.price)}`
    }

    if (this.addToCart) {
      this.addToCart.disabled = !variant.available
      if (this.addToCartText) this.addToCartText.textContent = variant.available ? this.addToCart.dataset.inStockText : this.addToCart.dataset.soldOutText
    }

    if (variant.featured_image && this.gallery) {
      this.gallery.show(variant.featured_image.src, variant.featured_image.alt ?? '')
    }

    const url = new URL(window.location.href)
    url.searchParams.set('variant', variant.id)
    window.history.replaceState({}, '', url)
  }

  formatMoney(cents) {
    return (cents / 100).toLocaleString(document.documentElement.lang || 'en', { style: 'currency', currency: window.Shopify?.currency?.active ?? 'USD' })
  }

  stepQuantity(delta) {
    const input = this.querySelector('input[name="quantity"]')
    if (!input) return
    input.value = Math.max(Number(input.min) || 1, Number(input.value) + delta)
  }
}

customElements.define('product-gallery', ProductGallery)
customElements.define('product-form', ProductForm)
