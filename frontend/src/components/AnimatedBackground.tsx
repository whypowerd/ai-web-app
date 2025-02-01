import { useEffect, useRef } from 'react';

export default function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mousePosition = useRef({ x: 0, y: 0 });
  const gradientCache = useRef<{ [key: string]: CanvasGradient }>({});

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const particles: Array<{
      x: number;
      y: number;
      size: number;
      rotation: number;
      speedX: number;
      speedY: number;
      rotationSpeed: number;
      opacity: number;
      points: number;
      color: string;
    }> = [];

    // Gold gradient colors
    const goldColors = [
      '#FFD700', // Gold
      '#DAA520', // Golden Rod
    ];

    const createStar = (ctx: CanvasRenderingContext2D, x: number, y: number, points: number, innerRadius: number, outerRadius: number, rotation: number) => {
      ctx.beginPath();
      for (let i = 0; i < points * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (i * Math.PI) / points + rotation;
        const pointX = x + radius * Math.cos(angle);
        const pointY = y + radius * Math.sin(angle);
        if (i === 0) {
          ctx.moveTo(pointX, pointY);
        } else {
          ctx.lineTo(pointX, pointY);
        }
      }
      ctx.closePath();
    };

    const createParticles = () => {
      const particleCount = 55; // Increased from 45 to 55
      particles.length = 0; // Clear existing particles
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 1.5 + 0.5, // Slightly smaller size range
          rotation: Math.random() * Math.PI * 2,
          speedX: (Math.random() - 0.5) * 0.3, // Reduced speed
          speedY: (Math.random() - 0.5) * 0.3, // Reduced speed
          rotationSpeed: (Math.random() - 0.5) * 0.01, // Reduced rotation speed
          opacity: Math.random() * 0.4 + 0.2, // Slightly reduced opacity
          points: Math.floor(Math.random() * 2) + 4, // 4-5 points instead of 4-6
          color: goldColors[Math.floor(Math.random() * goldColors.length)]
        });
      }
    };

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      createParticles();
    };

    const handleMouseMove = (event: MouseEvent) => {
      mousePosition.current = {
        x: event.clientX,
        y: event.clientY,
      };
    };

    const animate = () => {
      ctx.fillStyle = 'rgb(0, 0, 0)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particles.forEach((particle, index) => {
        // Calculate distance from mouse
        const dx = mousePosition.current.x - particle.x;
        const dy = mousePosition.current.y - particle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Add mouse interaction
        if (distance < 100) { // Reduced from 150 to 100
          const angle = Math.atan2(dy, dx);
          const force = (100 - distance) * 0.001; // Reduced force
          particle.speedX -= Math.cos(angle) * force;
          particle.speedY -= Math.sin(angle) * force;
        }

        // Update particle position
        particle.x += particle.speedX;
        particle.y += particle.speedY;
        particle.rotation += particle.rotationSpeed;

        // Bounce off walls
        if (particle.x < 0 || particle.x > canvas.width) particle.speedX *= -1;
        if (particle.y < 0 || particle.y > canvas.height) particle.speedY *= -1;

        // Draw star
        ctx.save();
        ctx.globalAlpha = particle.opacity;
        ctx.fillStyle = particle.color;
        createStar(
          ctx,
          particle.x,
          particle.y,
          particle.points,
          particle.size,
          particle.size * 2,
          particle.rotation
        );
        ctx.fill();
        ctx.restore();

        // Draw connections with reduced distance and opacity
        particles.forEach((otherParticle, otherIndex) => {
          if (index !== otherIndex) {
            const dx = particle.x - otherParticle.x;
            const dy = particle.y - otherParticle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 80) { // Reduced from 100 to 80
              ctx.beginPath();
              ctx.strokeStyle = `rgba(218, 165, 32, ${0.1 * (1 - distance / 80)})`; // Simplified gradient
              ctx.lineWidth = 0.3; // Reduced from 0.5
              ctx.moveTo(particle.x, particle.y);
              ctx.lineTo(otherParticle.x, otherParticle.y);
              ctx.stroke();
            }
          }
        });
      });

      requestAnimationFrame(animate);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 w-full h-full -z-10"
      style={{ background: 'linear-gradient(to bottom, #000000, #111111)' }}
    />
  );
}
