/** The two-leaf mark from the landing navbar. */
export function SproutMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        d="M12 21.5V11"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M12 12.5C12 7.9 8.9 4.6 4.2 4c-.4 4.8 2.6 8.5 7.8 8.5z"
        fill="var(--lagoon-deep)"
      />
      <path
        d="M12 15c0-4.1 2.8-7.1 7-7.6.4 4.3-2.4 7.6-7 7.6z"
        fill="currentColor"
        opacity="0.82"
      />
    </svg>
  )
}
