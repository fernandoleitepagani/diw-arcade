import { useEffect } from 'react';

const PREFIX = 'DIW Arcade';

export function usePageTitle(page?: string) {
  useEffect(() => {
    document.title = page ? `${PREFIX} — ${page}` : PREFIX;
  }, [page]);
}
