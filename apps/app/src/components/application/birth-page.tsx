import { birthDateOf, localDateString, voice, type LocalDate } from '@pn/core';
import { useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { ApplicationForm } from '@/components/application/application-form';
import { Button } from '@/components/button';
import { Text } from '@/components/text';
import { noFocusRing } from '@/lib/web-styles';
import { useStyles, type Tokens } from '@/theme/tokens';

const copy = voice.application;

type Field = 'month' | 'day' | 'year';
const FIELDS: { id: Field; label: string; placeholder: string; length: number; ios: 'birthdateMonth' | 'birthdateDay' | 'birthdateYear' }[] = [
  { id: 'month', label: copy.birthMonth, placeholder: 'MM', length: 2, ios: 'birthdateMonth' },
  { id: 'day', label: copy.birthDay, placeholder: 'DD', length: 2, ios: 'birthdateDay' },
  { id: 'year', label: copy.birthYear, placeholder: 'YYYY', length: 4, ios: 'birthdateYear' },
];

type Props = {
  busy: boolean;
  error: string | null;
  /** A real date of birth: the screen decides what happens with it (it's never kept). */
  onContinue: (born: LocalDate) => void;
  back: () => void;
};

/**
 * Date of birth, the age check before a passport: blank fields (no year filled in to accept), and
 * nothing on the page says what age is needed (a neutral age screen, as the FTC asks of COPPA).
 */
export function BirthPage({ busy, error, onContinue, back }: Props) {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  const [typed, setTyped] = useState<Record<Field, string>>({ month: '', day: '', year: '' });
  const [focused, setFocused] = useState<Field | null>(null);
  const [invalid, setInvalid] = useState(false);
  const refs = { month: useRef<TextInput>(null), day: useRef<TextInput>(null), year: useRef<TextInput>(null) };
  const ready = FIELDS.every((f) => typed[f.id].length > 0);

  const submit = () => {
    if (!ready || busy) return;
    const born = birthDateOf(typed.month, typed.day, typed.year, localDateString());
    setInvalid(!born);
    if (born) onContinue(born);
  };

  const change = (field: Field, text: string, i: number) => {
    const digits = text.replace(/\D/g, '').slice(0, FIELDS[i].length);
    setTyped((now) => ({ ...now, [field]: digits }));
    setInvalid(false);
    // A full month or day moves on to the next field.
    const nextField = FIELDS[i + 1];
    if (nextField && digits.length === FIELDS[i].length) refs[nextField.id].current?.focus();
  };

  return (
    <ApplicationForm
      page="birth"
      title={copy.birthTitle}
      lead={copy.birthLead}
      error={invalid ? copy.birthInvalid : error}
      footer={
        <>
          <Button variant="quiet" label={copy.back} onPress={back} disabled={busy} />
          <Button label={copy.next} onPress={submit} disabled={busy || !ready} />
        </>
      }>
      <View style={s.row}>
        {FIELDS.map((field, i) => (
          <View key={field.id} style={field.id === 'year' ? s.yearColumn : s.column}>
            <Text variant="label" color={c.muted}>
              {field.label.toUpperCase()}
            </Text>
            <TextInput
              ref={refs[field.id]}
              value={typed[field.id]}
              onChangeText={(text) => change(field.id, text, i)}
              onFocus={() => setFocused(field.id)}
              onBlur={() => setFocused(null)}
              placeholder={field.placeholder}
              placeholderTextColor={c.muted}
              accessibilityLabel={field.label}
              inputMode="numeric"
              maxLength={field.length}
              textContentType={field.ios}
              autoFocus={i === 0}
              editable={!busy}
              returnKeyType={field.id === 'year' ? 'done' : 'next'}
              submitBehavior={field.id === 'year' ? 'blurAndSubmit' : 'submit'}
              onSubmitEditing={field.id === 'year' ? submit : () => refs[FIELDS[i + 1].id].current?.focus()}
              style={[s.input, noFocusRing, focused === field.id && s.inputFocused]}
            />
          </View>
        ))}
      </View>
    </ApplicationForm>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    row: { flexDirection: 'row', gap: 10 },
    column: { flex: 2, gap: 6 },
    yearColumn: { flex: 3, gap: 6 },
    input: {
      minHeight: 50,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: t.c.field.border,
      borderRadius: t.radii.lg,
      backgroundColor: t.c.field.bg,
      color: t.c.ink,
      fontFamily: t.fonts.mono,
      // 16px keeps mobile Safari from zooming into the field.
      fontSize: 16,
      letterSpacing: 1,
    },
    inputFocused: { borderColor: t.c.primary, borderWidth: 1.5 },
  }),
});
