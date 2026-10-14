import { voice } from '@pn/core';
import { useState } from 'react';

import { ApplicationForm } from '@/components/application/application-form';
import { Button } from '@/components/button';
import { NameFields, type NameParts } from '@/components/name-fields';

const copy = voice.application;

type Props = {
  initial: NameParts;
  busy: boolean;
  error: string | null;
  /** Saves the name, then turns the page. */
  onContinue: (name: NameParts) => void;
  back: () => void;
};

/** "What should we call you?": a first name is needed to go on (Alex, 2026-10-14); the last name is optional. */
export function NamePage({ initial, busy, error, onContinue, back }: Props) {
  const [name, setName] = useState(initial);
  const ready = name.first.trim().length > 0;
  const submit = () => {
    if (ready && !busy) onContinue(name);
  };

  return (
    <ApplicationForm
      page="name"
      title={copy.nameTitle}
      lead={copy.nameLead}
      error={error}
      footer={
        <>
          <Button variant="quiet" label={copy.back} onPress={back} disabled={busy} />
          <Button label={copy.next} onPress={submit} disabled={busy || !ready} />
        </>
      }>
      <NameFields first={name.first} last={name.last} onChange={setName} onSubmit={submit} editable={!busy} autoFocus />
    </ApplicationForm>
  );
}
