// src/Components/SessionTimer.tsx
import { useEffect, useMemo, useState } from "react";

type Props = {
  startAt: number | null;          // timestamp (ms). Si null, on n'affiche rien.
  pill?: boolean;                  // style en pilule (par défaut true)
  title?: string;                  // libellé (par défaut "Temps passé")
};

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export default function SessionTimer({ startAt, pill = true, title = "Temps passé" }: Props) {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!startAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [startAt]);

  const text = useMemo(() => {
    if (!startAt) return "00:00:00";
    const diff = Math.max(0, now - startAt);
    const s = Math.floor(diff / 1000);
    const hh = Math.floor(s / 3600);
    const mm = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    return `${pad(hh)}:${pad(mm)}:${pad(ss)}`;
  }, [now, startAt]);

  if (startAt === null) return null;

  return (
    <div
      style={{
        padding: "8px 14px",
        borderRadius: pill ? 12 : 6,
        border: "1px solid #444",
        color: "#eaeaea",
        background: "transparent",
        fontSize: 14,
        fontWeight: 600,
        lineHeight: 1,
        userSelect: "none",
        whiteSpace: "nowrap",
      }}
      title={`${title}`}
    >
      {title} : {text}
    </div>
  );
}
