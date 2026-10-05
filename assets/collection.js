import { DialogElement } from './dialog-element.js'

// Just a <dialog>, same pattern as HeaderDrawer/SearchModal (assets/header.js).
class FiltersDrawer extends DialogElement {}

// Synced by innerHTML (not full-node replacement) so the filters <dialog> inside
// data-filter-fields keeps its open/closed state across updates.
const SYNC_ATTRIBUTES = ['data-collection-results', 'data-filter-fields', 'data-filter-trigger-content', 'data-sort-control']

// Same Section Rendering API fetch + innerHTML-swap pattern as PredictiveSearch
// (assets/header.js), not Horizon's morph() version — see CLAUDE.md's JavaScript
// section. The <form>/<a> underneath are real GET requests, so this still works
// with JS disabled; we just intercept them to skip the full-page reload.
const MOBILE_SORT_BREAKPOINT = '(min-width: 768px)'

class CollectionFilters extends HTMLElement {
  connectedCallback() {
    this.sectionId = this.dataset.sectionId
    this.results = this.querySelector('[data-collection-results]')
    this.form = this.querySelector('form')
    if (!this.sectionId || !this.results || !this.form) return

    this.desktopQuery = window.matchMedia(MOBILE_SORT_BREAKPOINT)
    this.relocateSortField()
    this.desktopQuery.addEventListener('change', () => this.relocateSortField())

    // Sort applies instantly; filter checkboxes don't — those wait for "Apply".
    this.addEventListener('change', (event) => {
      if (event.target.closest('[data-sort-field]')) this.update(this.formUrl())
    })

    this.addEventListener('click', (event) => {
      const applyButton = event.target.closest('[data-apply-filters]')
      if (applyButton) {
        this.update(this.formUrl())
        applyButton.closest('dialog')?.close()
        return
      }

      // Not product links — those must navigate normally, not re-render this
      // section against a product page where `collection` is blank.
      const link = event.target.closest('[data-pagination] a, [data-clear-filters], [data-remove-filter]')
      if (!link) return
      event.preventDefault()
      this.update(link.href)
    })

    window.addEventListener('popstate', () => this.update(window.location.href, false))
  }

  formUrl() {
    const params = new URLSearchParams(new FormData(this.form))
    return `${this.form.action}?${params}`
  }

  // Moves the one real sort <select> between slots by viewport width, rather
  // than rendering it twice (two would both land in FormData and double-submit).
  relocateSortField() {
    const field = this.querySelector('[data-sort-field]')
    const slot = this.querySelector(this.desktopQuery.matches ? '[data-sort-slot-desktop]' : '[data-sort-slot-mobile]')
    if (!field || !slot || slot.contains(field)) return

    slot.appendChild(field)
  }

  update(url, pushState = true) {
    // Abort any in-flight request so a slow, stale response can't land after
    // a newer one and overwrite it.
    this.abortController?.abort()
    this.abortController = new AbortController()

    const fetchUrl = new URL(url, window.location.origin)
    fetchUrl.searchParams.set('section_id', this.sectionId)

    fetch(fetchUrl, { signal: this.abortController.signal })
      .then((response) => (response.ok ? response.text() : Promise.reject(response.status)))
      .then((markup) => {
        const doc = new DOMParser().parseFromString(markup, 'text/html')
        const section = doc.querySelector(`#shopify-section-${this.sectionId}`)
        if (!section) return

        SYNC_ATTRIBUTES.forEach((attribute) => {
          const current = this.querySelector(`[${attribute}]`)
          const updated = section.querySelector(`[${attribute}]`)
          if (current && updated) current.innerHTML = updated.innerHTML
        })

        // Sync resets the sort field to its default position — relocate again.
        this.relocateSortField()

        if (pushState) {
          fetchUrl.searchParams.delete('section_id')
          window.history.pushState({}, '', fetchUrl)
        }

        // Don't scroll while the drawer's open — it's hidden behind the modal.
        if (!this.querySelector('dialog[open]')) {
          this.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      })
      .catch((error) => {
        if (error.name !== 'AbortError') throw error
      })
  }
}

customElements.define('filters-drawer', FiltersDrawer)
customElements.define('collection-filters', CollectionFilters)
