/** Full-block loading indicator — use for page-level loading states */
export default function LoadingDots({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-slate-400">
      <span className="mr-1">{label}</span>
      <span className="inline-block w-[0.3em] h-[0.3em] rounded-full bg-gray-500 dark:bg-slate-400 animate-bounce [animation-delay:-0.3s]" />
      <span className="inline-block w-[0.3em] h-[0.3em] rounded-full bg-gray-500 dark:bg-slate-400 animate-bounce [animation-delay:-0.15s]" />
      <span className="inline-block w-[0.3em] h-[0.3em] rounded-full bg-gray-500 dark:bg-slate-400 animate-bounce" />
    </div>
  );
}

/** Inline loading indicator — use inside buttons; dots inherit the button's text colour */
export function InlineLoadingDots({ label, className }: { label: string; className?: string }) {
  return (
    <span className={`flex items-center gap-1${className ? ` ${className}` : ""}`}>
      <span className="mr-0.5">{label}</span>
      <span className="inline-block w-[0.3em] h-[0.3em] rounded-full bg-current animate-bounce [animation-delay:-0.3s]" />
      <span className="inline-block w-[0.3em] h-[0.3em] rounded-full bg-current animate-bounce [animation-delay:-0.15s]" />
      <span className="inline-block w-[0.3em] h-[0.3em] rounded-full bg-current animate-bounce" />
    </span>
  );
}
