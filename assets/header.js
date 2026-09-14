class NavDropdown extends HTMLElement {
  connectedCallback() {
    this.trigger = this.querySelector('[data-dropdown-trigger]')
    this.panel = this.querySelector('[data-dropdown-panel]')
    if (!this.trigger || !this.panel) return

    this.trigger.addEventListener('click', () => this.toggle())
    this.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.isOpen) {
        event.stopPropagation()
        this.close()
        this.trigger.focus()
      }
    })
    document.addEventListener('click', (event) => {
      if (this.isOpen && !this.contains(event.target)) this.close()
    })
  }

  get isOpen() {
    return this.trigger.getAttribute('aria-expanded') === 'true'
  }

  toggle() {
    this.isOpen ? this.close() : this.open()
  }

  open() {
    this.trigger.setAttribute('aria-expanded', 'true')
    this.panel.hidden = false
  }

  close() {
    this.trigger.setAttribute('aria-expanded', 'false')
    this.panel.hidden = true
  }
}

class LocalizationForm extends NavDropdown {
  connectedCallback() {
    super.connectedCallback()
    this.input = this.querySelector('input[type="hidden"]')
    this.form = this.querySelector('form')
    if (!this.input || !this.form) return

    this.querySelectorAll('a[data-value]').forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault()
        this.input.value = link.dataset.value
        this.form.submit()
      })
    })
  }
}

class DialogElement extends HTMLElement {
  connectedCallback() {
    this.dialog = this.querySelector('dialog')
    this.openButton = this.querySelector('[data-dialog-open]')
    this.closeButton = this.querySelector('[data-dialog-close]')
    if (!this.dialog || !this.openButton) return

    this.openButton.addEventListener('click', () => {
      this.dialog.showModal()
      this.openButton.setAttribute('aria-expanded', 'true')
      this.onOpen?.()
    })
    this.closeButton?.addEventListener('click', () => this.dialog.close())
    this.dialog.addEventListener('click', (event) => {
      if (event.target === this.dialog) this.dialog.close()
    })
    this.dialog.addEventListener('close', () => {
      this.openButton.setAttribute('aria-expanded', 'false')
      this.openButton.focus()
      this.onClose?.()
    })
  }
}

class HeaderDrawer extends DialogElement {}

class SearchModal extends DialogElement {
  onOpen() {
    this.querySelector('input[type="search"]')?.focus()
  }

  onClose() {
    this.querySelector('predictive-search')?.reset()
  }
}

class PredictiveSearch extends HTMLElement {
  connectedCallback() {
    this.input = this.querySelector('input[type="search"]')
    this.results = this.querySelector('[data-predictive-search-results]')
    if (!this.input || !this.results) return

    this.input.addEventListener(
      'input',
      this.debounce((event) => this.search(event.target.value.trim()), 300)
    )
  }

  search(term) {
    if (!term) {
      this.reset()
      return
    }

    fetch(`/search/suggest?q=${encodeURIComponent(term)}&section_id=predictive-search`)
      .then((response) => (response.ok ? response.text() : Promise.reject(response.status)))
      .then((markup) => {
        const doc = new DOMParser().parseFromString(markup, 'text/html')
        this.results.innerHTML = doc.querySelector('#shopify-section-predictive-search')?.innerHTML ?? ''
        this.input.setAttribute('aria-expanded', String(this.results.childElementCount > 0))
      })
      .catch(() => this.reset())
  }

  reset() {
    this.results.innerHTML = ''
    this.input.setAttribute('aria-expanded', 'false')
  }

  debounce(fn, wait) {
    let timeout
    return (...args) => {
      clearTimeout(timeout)
      timeout = setTimeout(() => fn(...args), wait)
    }
  }
}

customElements.define('nav-dropdown', NavDropdown)
customElements.define('localization-form', LocalizationForm)
customElements.define('header-drawer', HeaderDrawer)
customElements.define('search-modal', SearchModal)
customElements.define('predictive-search', PredictiveSearch)
