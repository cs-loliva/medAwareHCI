"use client";

import { useEffect, useState } from "react";

type CountdownTimerProps = {
  targetTime: string;
};

type TimeLeft = {
  hours: number;
  minutes: number;
  seconds: number;
};

function getTimeLeft(targetTime: string): TimeLeft {
  const target = new Date(targetTime).getTime();
  const now = Date.now();
  const diff = Math.max(target - now, 0);

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return { hours, minutes, seconds };
}

function formatTimeLeft(timeLeft: TimeLeft) {
  return `${String(timeLeft.hours).padStart(2, "0")}:${String(
    timeLeft.minutes
  ).padStart(2, "0")}:${String(timeLeft.seconds).padStart(2, "0")}`;
}

export function CountdownTimer({ targetTime }: CountdownTimerProps) {
  const [hasMounted, setHasMounted] = useState(false);
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    setHasMounted(true);
    setTimeLeft(getTimeLeft(targetTime));

    const interval = window.setInterval(() => {
      setTimeLeft(getTimeLeft(targetTime));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [targetTime]);

  return (
    <div className="rounded-[2rem] bg-[#FFE8EC] px-8 py-6 text-center">
      <p className="text-sm font-black text-[#FF3F4D]">Time left</p>
      <p className="mt-2 text-4xl font-black text-[#101828]">
        {hasMounted ? formatTimeLeft(timeLeft) : "--:--:--"}
      </p>
    </div>
  );
}