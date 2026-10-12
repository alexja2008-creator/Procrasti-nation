// An iPhone-shaped frame around a screenshot of the app: the light one, or the night one when the
// visitor's system is dark. Screens live in public/screens/<name>-light.png and -night.png
// (1206 × 2622 shots from the iPhone 18 Pro Simulator, halved).
export default function Phone({ name, alt, className = '', priority = false }) {
  return (
    <div
      className={`relative mx-auto w-full max-w-[290px] rounded-[44px] p-[10px] shadow-2xl ${className}`}
      style={{ background: 'var(--bezel)', boxShadow: '0 30px 60px -20px rgba(15, 20, 40, 0.45)' }}
    >
      <picture>
        <source srcSet={`/screens/${name}-night.png`} media="(prefers-color-scheme: dark)" />
        <img
          src={`/screens/${name}-light.png`}
          alt={alt}
          width={603}
          height={1311}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          className="block h-auto w-full rounded-[34px]"
        />
      </picture>
    </div>
  );
}
