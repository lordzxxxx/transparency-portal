import { useEffect, useState } from 'react';

const dateTime = new Intl.DateTimeFormat('en-PH', {
  timeZone: 'Asia/Manila',
  year: 'numeric', month: 'short', day: 'numeric',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
  hour12: true,
});

export default function PhilippineClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="ph-clock" aria-label="Current Philippine date and time">
      <span className="label">Philippine time · PHT (UTC+8)</span>
      <time dateTime={now.toISOString()}>{dateTime.format(now)}</time>
    </div>
  );
}
