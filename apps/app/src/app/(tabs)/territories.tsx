import { names } from '@pn/core';

import { DraftPage } from '@/components/draft-page';

export default function TerritoriesScreen() {
  return (
    <DraftPage
      eyebrow={names.territories.toUpperCase()}
      title="Every corner of your life."
      lead={`${names.customs} at the top, then School, Work, Home and your own. Being drafted.`}
    />
  );
}
