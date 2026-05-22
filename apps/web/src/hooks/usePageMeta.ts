import { useEffect } from 'react';

const SITE = 'Feria de Promociones 2026';

export function usePageMeta(title: string, description?: string) {
  useEffect(() => {
    document.title = title === SITE ? title : `${title} · ${SITE}`;

    if (description) {
      let tag = document.querySelector<HTMLMetaElement>('meta[name="description"]');
      if (!tag) {
        tag = document.createElement('meta');
        tag.name = 'description';
        document.head.appendChild(tag);
      }
      tag.content = description;
    }
  }, [title, description]);
}
