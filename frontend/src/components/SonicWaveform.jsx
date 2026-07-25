import { useEffect, useRef } from "react";

export default function SonicWaveform() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let animationId;
    let time = 0;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const SIGNAL_GREEN = "#3BE07A";
    const MID_GREEN = "#1A5C35";
    const DARK_GREEN = "#0D2E1A";

    function drawWave(yOffset, amplitude, frequency, speed, color, alpha, lineWidth) {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = lineWidth;
      ctx.shadowBlur = 30;
      ctx.shadowColor = SIGNAL_GREEN;

      for (let x = 0; x <= canvas.width; x += 2) {
        const y =
          canvas.height / 2 +
          yOffset +
          amplitude * Math.sin(frequency * x + time * speed) +
          (amplitude * 0.4) * Math.sin(frequency * 1.7 * x + time * speed * 0.8) +
          (amplitude * 0.2) * Math.sin(frequency * 3.1 * x - time * speed * 1.2);

        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    }

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Background gradient — dark BRG tint
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, "#050F08");
      grad.addColorStop(1, "#0A1A0F");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Deep background waves — 40% larger amplitude
      drawWave(84,  49, 0.008, 0.4, DARK_GREEN, 0.4, 1.5);
      drawWave(-84, 39, 0.010, 0.3, DARK_GREEN, 0.3, 1.2);

      // Mid waves
      drawWave(28,  70, 0.012, 0.6, MID_GREEN,    0.5, 1.2);
      drawWave(-42, 59, 0.009, 0.5, MID_GREEN,    0.4, 1.0);

      // Main signal green waves — 40% larger amplitude, higher opacity
      drawWave(0,   91, 0.014, 0.8, SIGNAL_GREEN, 1.0, 2.5);
      drawWave(14,  77, 0.011, 0.7, SIGNAL_GREEN, 0.8, 1.8);
      drawWave(-21, 63, 0.013, 0.9, SIGNAL_GREEN, 0.6, 1.4);

      time += 0.012;
      animationId = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ display: "block" }}
    />
  );
}
