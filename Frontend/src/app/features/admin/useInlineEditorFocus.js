import {useLayoutEffect, useRef} from 'react';

// Inline editors sit above the inventory, potentially several screens away
// from their trigger. Focus reveals the form without trapping keyboard users.
export function useInlineEditorFocus() {
  const formRef = useRef(null);
  useLayoutEffect(() => {
    const form = formRef.current;
    const trigger = document.activeElement;
    form?.querySelector('h2')?.focus();
    return () => {
      // Leaving via a filter or navigation must keep that user's new focus.
      if (form?.contains(document.activeElement) && trigger?.isConnected) {
        trigger.focus();
      }
    };
  }, []);
  return formRef;
}
