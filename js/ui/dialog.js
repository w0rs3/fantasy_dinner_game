export class AppDialog {
  constructor(element) {
    this.element = element;
    this.kicker = element.querySelector('#dialog-kicker');
    this.title = element.querySelector('#dialog-title');
    this.content = element.querySelector('#dialog-content');
    this.actions = element.querySelector('#dialog-actions');
  }

  show({ kicker = '', title = '', content = '', actions = '' }) {
    this.kicker.textContent = kicker;
    this.title.textContent = title;
    this.content.innerHTML = content;
    this.actions.innerHTML = actions;
    if (!this.element.open) this.element.showModal();
  }

  close() {
    if (this.element.open) this.element.close();
  }
}
