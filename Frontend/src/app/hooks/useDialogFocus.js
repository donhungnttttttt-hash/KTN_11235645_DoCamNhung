import { useEffect, useRef } from 'react';

const openDialogs = [];
let previousOverflow;

/** Keep keyboard navigation in an open modal and return focus to its trigger. */
export function useDialogFocus(onClose, busy = false, ready = true) {
  const ref = useRef(null);
  const latest = useRef({ onClose, busy });
  latest.current = { onClose, busy };
  useEffect(() => {
    const dialog = ref.current;
    if (!ready || !dialog) return;
    const previous = document.activeElement;
    if (!openDialogs.length) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    openDialogs.push(dialog);
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
      // A nested work-item dialog may appear above the execution dialog.
      const visibleDialogs = [...document.querySelectorAll('[role="dialog"]')]
        .filter(element => element.getAttribute('aria-modal') !== 'false' && !element.closest('[hidden], [inert]'));
      if (visibleDialogs.at(-1) !== dialog) return;
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
      const wasTopmost = openDialogs.at(-1) === dialog;
      openDialogs.splice(openDialogs.indexOf(dialog), 1);
      if (!openDialogs.length) document.body.style.overflow = previousOverflow;
      if (wasTopmost && previous?.isConnected) previous.focus();
    };
  }, [ready]);
  return ref;
}
