"use client";

export default function OnboardingBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/14 blur-3xl"
        style={{ transform: "translateZ(0)" }}
      />
      <div
        className="absolute right-[-6rem] top-[18%] h-56 w-56 rounded-full bg-sky-500/10 blur-3xl"
        style={{ transform: "translateZ(0)" }}
      />
      <div
        className="absolute -bottom-12 right-[-4rem] h-80 w-80 rounded-full bg-accent/14 blur-3xl"
        style={{ transform: "translateZ(0)" }}
      />
    </div>
  );
}
