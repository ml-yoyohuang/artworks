import './dialog.css';

interface DialogOptions { title: string; message: string; accept?: string; cancel?: string; notice?: boolean }
let queue = Promise.resolve();

/** In-page modal with native dialog semantics, custom visuals, safe default focus and serialized requests. */
export function confirmAction(options: DialogOptions): Promise<boolean> {
  const result = queue.then(() => new Promise<boolean>(resolve => {
    const returnFocus = document.activeElement as HTMLElement | null;
    const dialog = document.createElement('dialog'); dialog.className = 'app-dialog';
    const title = document.createElement('h2'); title.id = 'app-dialog-title'; title.textContent = options.title;
    const text = document.createElement('p'); text.id = 'app-dialog-message'; text.textContent = options.message;
    dialog.setAttribute('aria-labelledby', title.id); dialog.setAttribute('aria-describedby', text.id);
    const actions = document.createElement('div'); actions.className = 'dialog-actions';
    const accept = document.createElement('button'); accept.className = 'dialog-accept'; accept.textContent = options.accept ?? '確認';
    const cancel = document.createElement('button'); cancel.textContent = options.cancel ?? '取消';
    let settled = false;
    const finish = (value: boolean) => {
      if (settled) return; settled = true;
      dialog.close(); dialog.remove();
      document.dispatchEvent(new CustomEvent('app-dialog-toggle', { detail: { open: false } }));
      if (returnFocus?.isConnected) returnFocus.focus(); resolve(value);
    };
    accept.onclick = () => finish(true); cancel.onclick = () => finish(false);
    dialog.addEventListener('cancel', e => { e.preventDefault(); finish(false); });
    dialog.addEventListener('close', () => finish(false));
    if (!options.notice) actions.append(cancel); actions.append(accept);
    dialog.append(title, text, actions); document.body.append(dialog);
    document.dispatchEvent(new CustomEvent('app-dialog-toggle', { detail: { open: true } }));
    dialog.showModal(); (options.notice ? accept : cancel).focus();
  }));
  queue = result.then(() => {}); return result;
}

export async function showNotice(title: string, message: string): Promise<void> {
  await confirmAction({ title, message, accept: '知道了', notice: true });
}
