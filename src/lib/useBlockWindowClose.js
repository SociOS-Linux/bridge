import { useEffect } from 'react';

function onBeforeUnload(e) {
  e.preventDefault();

  e.returnValue = '';
}

export default function useBlockWindowClose() {
  return useEffect(() => {
    window.addEventListener('beforeunload', onBeforeUnload);

    return function cleanup() {
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  });
}

export function useConditionalBlockWindowClose(condition) {
  return useEffect(() => {
    if (condition) {
      window.addEventListener('beforeunload', onBeforeUnload);
    } else {
      window.removeEventListener('beforeunload', onBeforeUnload);
    }

    return function cleanup() {
      if (condition) {
        window.removeEventListener('beforeunload', onBeforeUnload);
      }
    };
  });
}
