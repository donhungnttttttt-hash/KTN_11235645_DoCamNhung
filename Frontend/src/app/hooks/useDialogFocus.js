import { useContext, useEffect, useRef } from 'react';
import { DialogVisibilityContext } from '../features/auth/DialogVisibilityContext';

const openDialogs = [];
let previousOverflow;

/** Keep keyboard navigation in an open modal and return focus to its trigger. */
export function useDialogFocus(onClose, busy = false, ready = true, returnFocusRef = null) {
  const scopeVisible = useContext(DialogVisibilityContext);
  const active = ready && scopeVisible;
  const ref = useRef(null);
  const latest = useRef({ onClose, busy });
  latest.current = { onClose, busy };
  useEffect(() => {
    const dialog = ref.current;
    if (!active || !dialog) return;
    // A nested caller may capture focus before making its parent inert, which
    // otherwise blurs the original control before this effect can read it.
    const entry = { dialog, previous: returnFocusRef?.current || document.activeElement };
    if (!openDialogs.length) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    openDialogs.push(entry);
    const available = element => {
      if(element.matches(':disabled, input[type="hidden"]') || element.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
      for(let ancestor=element;ancestor && ancestor!==dialog.parentElement;ancestor=ancestor.parentElement) {
        const style=getComputedStyle(ancestor);
        if(style.display==='none' || style.visibility==='hidden' || style.visibility==='collapse') return false;
        if(ancestor.tagName==='DETAILS' && !ancestor.open) {
          const summary=[...ancestor.children].find(child=>child.tagName==='SUMMARY');
          if(!summary?.contains(element)) return false;
        }
      }
      return true;
    };
    const controls = () => [...dialog.querySelectorAll('button, input, select, textarea, a[href], summary, [tabindex]')]
      .filter(element => element.tabIndex >= 0 && available(element));
    const initial=dialog.querySelector('[data-dialog-initial-focus]'),items=controls();
    (initial && available(initial)?initial:items[0] || dialog).focus();
    function keydown(event) {
      if (dialog.closest('[hidden], [inert]')) return;
      // Opening order determines the active dialog; Header dialogs can appear
      // earlier in the DOM than an already-open mobile navigation drawer.
      const topmost = openDialogs.findLast(item => item.dialog.isConnected
        && !item.dialog.closest('[hidden], [inert]'));
      if (topmost !== entry) return;
      // An embedded search picker owns Escape without registering a modal trap.
      // Let it close first so its parent editor and draft remain mounted.
      const localDialog = event.target?.closest?.('[role="dialog"]');
      if (event.key === 'Escape' && localDialog && localDialog !== dialog
        && dialog.contains(localDialog) && !openDialogs.some(item => item.dialog === localDialog)) return;
      if (event.key === 'Escape') {
        event.preventDefault(); event.stopPropagation();
        if (!latest.current.busy) latest.current.onClose();
      } else if (event.key === 'Tab') {
        const items = controls();
        const first = items[0], last = items.at(-1);
        const active = document.activeElement;
        const outside = !dialog.contains(active);
        // Headings and feedback may receive programmatic focus without being tab stops.
        const beforeFirst = first && Boolean(first.compareDocumentPosition(active) & Node.DOCUMENT_POSITION_PRECEDING);
        const afterLast = last && Boolean(last.compareDocumentPosition(active) & Node.DOCUMENT_POSITION_FOLLOWING);
        if (!first) { event.preventDefault(); dialog.focus(); }
        else if (event.shiftKey && (active === first || outside || beforeFirst)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && (active === last || outside || afterLast)) { event.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener('keydown', keydown, true);
    return () => {
      document.removeEventListener('keydown', keydown, true);
      const wasTopmost = openDialogs.at(-1) === entry;
      const index = openDialogs.indexOf(entry);
      // A parent and its confirmation can unmount together. Preserve the
      // opener chain before removing the parent, whose controls will disappear.
      for (const child of openDialogs.slice(index + 1)) {
        if (dialog.contains(child.previous)) child.previous = entry.previous;
      }
      if (index !== -1) openDialogs.splice(index, 1);
      if (!openDialogs.length) document.body.style.overflow = previousOverflow;
      const previous = entry.previous;
      if (wasTopmost && previous?.isConnected && !previous.closest('[hidden], [inert], [aria-hidden="true"]')) previous.focus();
    };
  }, [active]);
  return ref;
}
