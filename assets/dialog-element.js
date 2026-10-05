// Base class for anything built on native <dialog> (header drawer, search modal,
// filters drawer). Extend it (`class X extends DialogElement { onOpen() {...} }`)
// rather than duplicating open/close/backdrop-click/Escape wiring.
export class DialogElement extends HTMLElement {
  connectedCallback() {
    this.dialog = this.querySelector('dialog')
    this.openButton = this.querySelector('[data-dialog-open]')
    if (!this.dialog || !this.openButton) return

    this.openButton.addEventListener('click', () => {
      this.dialog.showModal()
      this.openButton.setAttribute('aria-expanded', 'true')
      this.onOpen?.()
    })
    // Delegated, not bound per-button — survives content being replaced via innerHTML.
    this.addEventListener('click', (event) => {
      if (event.target.closest('[data-dialog-close]')) this.dialog.close()
    })
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
