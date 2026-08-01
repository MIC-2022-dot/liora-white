/** Static, decorative preview of a Liora conversation used on the landing page. */
export function ConversationPreview() {
  return (
    <div className="panel overflow-hidden p-0">
      <div className="hairline flex items-center gap-3 px-4 py-3">
        <div className="flex size-9 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
          AK
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">Aïcha K.</p>
          <p className="text-[11px] text-success">Online</p>
        </div>
      </div>
      <div className="space-y-2.5 bg-surface/60 px-4 py-5">
        <Bubble side="in">Are we still on for tonight?</Bubble>
        <Bubble side="out">Yes — I'll call you when I leave.</Bubble>
        <Bubble side="in">Perfect. Bring the photos 🙂</Bubble>
        <div className="flex items-center gap-1 pt-1 pl-1 text-[11px] text-muted-foreground">
          <span>Aïcha is typing</span>
          <span className="inline-flex gap-0.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="size-1 rounded-full bg-muted-foreground"
                style={{ animation: `liora-dot 1.2s ${i * 0.15}s infinite` }}
              />
            ))}
          </span>
        </div>
      </div>
    </div>
  );
}

function Bubble({ side, children }: { side: "in" | "out"; children: React.ReactNode }) {
  const out = side === "out";
  return (
    <div className={out ? "flex justify-end" : "flex justify-start"}>
      <div
        className={
          out
            ? "max-w-[80%] rounded-2xl rounded-br-md bg-bubble-out px-3 py-2 text-[13px] text-bubble-out-foreground"
            : "max-w-[80%] rounded-2xl rounded-bl-md bg-bubble-in px-3 py-2 text-[13px] text-bubble-in-foreground shadow-[var(--shadow-soft)]"
        }
      >
        {children}
      </div>
    </div>
  );
}
