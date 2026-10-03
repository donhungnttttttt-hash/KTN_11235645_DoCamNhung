import { useEffect, useRef } from 'react';

const openDialogs = [];

/** Keep keyboard navigation in an open modal and return focus to its trigger. */
export function useDialogFocus(onClose, busy = false, ready = true) {
  const ref = useRef(null);
  const latest = useRef({ onClose, busy });
  latest.current = { onClose, busy };
  useEffect(() => {
    const dialog = ref.current;
    if (!ready || !dialog) return;
    const previous = document.activeElement;
    openDialogs.push(dialog);
    const controls = () => [...dialog.querySelectorAll('button, input, select, textarea, a[href], [tabindex]')]
      .filter(element => element.tabIndex >= 0 && !element.matches(':disabled') && !element.closest('[hidden]'));
    (controls()[0] || dialog).focus();
    function keydown(event) {
      if (dialog.closest('[hidden], [inert]')) return;
      // A nested work-item dialog may appear above the execution dialog.
      const visibleDialogs = [...document.querySelectorAll('[role="dialog"]')]
        .filter(element => !element.closest('[hidden], [inert]'));
      if (visibleDialogs.at(-1) !== dialog) return;
      if (event.key === 'Escape') {
        event.preventDefault(); event.stopPropagation();
        if (!latest.current.busy) latest.current.onClose();
      } else if (event.key === 'Tab') {
        const items = controls();
        const first = items[0], last = items.at(-1);
        if (!first) { event.preventDefault(); dialog.focus(); }
        else if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener('keydown', keydown, true);
    return () => {
      document.removeEventListener('keydown', keydown, true);
      const wasTopmost = openDialogs.at(-1) === dialog;
      openDialogs.splice(openDialogs.indexOf(dialog), 1);
      if (wasTopmost && previous?.isConnected) previous.focus();
    };
  }, [ready]);
  return ref;
}
