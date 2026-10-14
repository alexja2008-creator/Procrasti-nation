'use client';

import { useRef, useState } from 'react';

// Each tone as a lock screen with two of its reminders. The one in front is the tone shown; the other
// two sit partly behind it, one each side. Arrows, the tone names below, a swipe, the left and right
// arrow keys, or a click on a tile behind all bring another to the front.
const WHEN = ['now', '1h ago'];
const SWIPE = 40;

export default function ToneCarousel({ tones, task, buttons }) {
  const [front, setFront] = useState(0);
  const swipeFrom = useRef(null);
  // A swipe that ends on a tile behind isn't also a click on it.
  const swiped = useRef(false);
  const n = tones.length;
  const go = (step) => setFront((i) => (i + step + n) % n);
  const tone = tones[front];

  const onKeyDown = (e) => {
    if (e.key === 'ArrowLeft') go(-1);
    else if (e.key === 'ArrowRight') go(1);
    else return;
    e.preventDefault();
  };

  return (
    <div className="mt-10" role="region" aria-roledescription="carousel" aria-label="Nudge tones" onKeyDown={onKeyDown}>
      <div
        className="tone-stage"
        onPointerDown={(e) => {
          swipeFrom.current = e.clientX;
          swiped.current = false;
        }}
        onPointerUp={(e) => {
          const dx = swipeFrom.current === null ? 0 : e.clientX - swipeFrom.current;
          swipeFrom.current = null;
          if (Math.abs(dx) <= SWIPE) return;
          swiped.current = true;
          go(dx < 0 ? 1 : -1);
        }}
      >
        {tones.map((t, i) => {
          // -1 behind on the left, 0 in front, 1 behind on the right.
          const place = ((i - front + n + 1) % n) - 1;
          return (
            <div
              key={t.id}
              className="tone-tile"
              data-place={place}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${n}: ${t.name}`}
              aria-hidden={place !== 0}
              onClick={place !== 0 ? () => !swiped.current && go(place) : undefined}
            >
              <LockScreen tone={t} task={task} buttons={buttons} />
            </div>
          );
        })}
        <button type="button" className="tone-arrow" data-side="left" aria-label="Previous tone" onClick={() => go(-1)}>
          <Chevron flip />
        </button>
        <button type="button" className="tone-arrow" data-side="right" aria-label="Next tone" onClick={() => go(1)}>
          <Chevron />
        </button>
      </div>

      <p className="mt-6 text-center font-semibold" aria-live="polite">
        {tone.name}: <span className="font-normal" style={{ color: 'var(--ink-soft)' }}>{tone.blurb}</span>
      </p>
      <div className="mt-4 flex justify-center gap-2">
        {tones.map((t, i) => (
          <button
            key={t.id}
            type="button"
            className="tone-pick"
            aria-pressed={i === front}
            onClick={() => setFront(i)}
          >
            {t.name}
          </button>
        ))}
      </div>
    </div>
  );
}

function LockScreen({ tone, task, buttons }) {
  return (
    <div className="lock-screen" data-tone={tone.id}>
      <p className="lock-mode">{tone.name.toUpperCase()}</p>
      <p className="lock-date">Monday 12 October</p>
      <p className="lock-time font-display">9:41</p>
      <div className="mt-6 flex flex-col gap-2.5">
        {tone.samples.map((line, i) => (
          <div key={line} className="notif">
            <div className="notif-head">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icon.svg" alt="" width={20} height={20} className="notif-icon" />
              <span>ProcrastiNation</span>
              <span className="ml-auto">{WHEN[i] ?? ''}</span>
            </div>
            <p className="notif-title">{task}</p>
            <p className="notif-body">{line}</p>
            {i === 0 ? (
              <div className="notif-actions">
                {buttons.map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function Chevron({ flip = false }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={flip ? { transform: 'scaleX(-1)' } : undefined}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}
