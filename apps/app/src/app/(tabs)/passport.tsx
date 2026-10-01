import { voice } from '@pn/core';

import { DraftPage } from '@/components/draft-page';

export default function PassportScreen() {
  return <DraftPage eyebrow="PASSPORT · PASSEPORT" title={voice.passportLead} lead="Your citizen page, stamps and residency. Being drafted." />;
}
