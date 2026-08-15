"use client";

interface WaveVisualizerProps {
  active: boolean;
}

const BARS = 9;

export function WaveVisualizer({ active }: WaveVisualizerProps) {
  return (
    /* 构成主义：方形条柱，技术级别显示 */
    <div className="flex items-end justify-center gap-[2px] h-6">
      {Array.from({ length: BARS }).map((_, i) => (
        <span
          key={i}
          className="w-[2px] bg-[#3A7A4A]"
          style={
            active
              ? {
                  animation: `wave-bar 0.7s ease-in-out infinite`,
                  animationDelay: `${i * 0.08}s`,
                  height: "4px",
                }
              : { height: "4px", opacity: 0.2 }
          }
        />
      ))}
    </div>
  );
}
