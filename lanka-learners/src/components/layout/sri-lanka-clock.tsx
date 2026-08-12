"use client";

import { useEffect, useState } from "react";

const FORMATTER = new Intl.DateTimeFormat("en-LK", {
  timeZone: "Asia/Colombo",
  weekday: "short",
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: true,
});

export function SriLankaClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <time
      dateTime={now?.toISOString()}
      className="hidden whitespace-nowrap text-xs tabular text-sidebar-foreground/70 md:block"
      title="Sri Lanka Standard Time"
    >
      {now ? FORMATTER.format(now) : "Sri Lanka time"}
    </time>
  );
}
