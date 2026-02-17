export default function AuthIllustration() {
  // Generate particles with varied properties
  const particles = Array.from({ length: 35 }, (_, i) => {
    const size = 2 + Math.random() * 3;
    const left = Math.random() * 100;
    const delay = Math.random() * 20;
    const duration = 15 + Math.random() * 25;
    const isAlt = i % 3 === 0;
    const colors = [
      "rgba(0, 229, 255, 0.7)",
      "rgba(0, 229, 255, 0.4)",
      "rgba(0, 255, 198, 0.5)",
      "rgba(124, 77, 255, 0.4)",
      "rgba(0, 168, 168, 0.5)",
      "rgba(79, 195, 247, 0.3)",
    ];
    const color = colors[i % colors.length];

    return (
      <div
        key={i}
        className="particle"
        style={{
          width: size,
          height: size,
          left: `${left}%`,
          bottom: `-${10 + Math.random() * 20}px`,
          backgroundColor: color,
          boxShadow: `0 0 ${size * 2}px ${color}`,
          animation: `${isAlt ? "particle-rise-alt" : "particle-rise"} ${duration}s linear ${delay}s infinite`,
        }}
      />
    );
  });

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Base depth */}
      <div className="absolute inset-0 bg-depth-0" />

      {/* Living canvas - more vibrant for auth */}
      <div className="absolute inset-0 living-canvas-auth" />

      {/* Subtle grid suggesting structure */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,229,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.15) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />

      {/* Central radial glow (light source behind form) */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_50%_45%,rgba(0,229,255,0.08),transparent_70%)]" />

      {/* Particles */}
      {particles}

      {/* Depth vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_50%,transparent_30%,rgba(8,20,24,0.7)_100%)]" />
    </div>
  );
}
