import { useEffect, useRef } from 'react';

const ParticlesBackground = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let particles: Particle[] = [];
        let animationFrameId: number;
        const mouse = { x: -1000, y: -1000 };

        const resizeCanvas = () => {
            canvas.width = globalThis.innerWidth;
            canvas.height = globalThis.innerHeight;
        };

        const handleMouseMove = (event: MouseEvent) => {
            mouse.x = event.clientX;
            mouse.y = event.clientY;
        };

        class Particle {
            x: number;
            y: number;
            size: number;
            speedX: number;
            speedY: number;
            color: string;

            constructor() {
                this.x = Math.random() * canvas!.width;
                this.y = Math.random() * canvas!.height;
                this.size = Math.random() * 1 + 2; // Increased size
                this.speedX = Math.random() * 1.5 - 0.75;
                this.speedY = Math.random() * 1.5 - 0.75;

                // Mix of Blue, Green, and Purple
                const rand = Math.random();
                let hue;
                if (rand < 0.33) {
                    hue = Math.random() * 20 + 210; // Blue (210-230)
                } else if (rand < 0.66) {
                    hue = Math.random() * 40 + 100; // Green (100-140)
                } else {
                    hue = Math.random() * 40 + 260; // Purple (260-300)
                }
                const saturation = Math.random() * 20 + 70;
                const lightness = Math.random() * 20 + 40;
                const alpha = Math.random() * 0.5 + 0.3; // Increased opacity
                this.color = `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
            }

            update() {
                // Mouse interaction
                const dx = mouse.x - this.x;
                const dy = mouse.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const maxDistance = 200;

                if (distance < maxDistance) {
                    const forceDirectionX = dx / distance;
                    const forceDirectionY = dy / distance;
                    const force = (maxDistance - distance) / maxDistance;
                    const directionX = forceDirectionX * force * 3;
                    const directionY = forceDirectionY * force * 3;

                    this.x += directionX;
                    this.y += directionY;
                }

                this.x += this.speedX;
                this.y += this.speedY;

                if (this.x < 0) this.x = canvas!.width;
                if (this.x > canvas!.width) this.x = 0;
                if (this.y < 0) this.y = canvas!.height;
                if (this.y > canvas!.height) this.y = 0;
            }

            draw() {
                if (!ctx) return;
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        const init = () => {
            particles = [];
            const numberOfParticles = Math.min(globalThis.innerWidth * 0.15, 120);
            for (let i = 0; i < numberOfParticles; i++) {
                particles.push(new Particle());
            }
        };

        const animate = () => {
            if (!ctx || !canvas) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            particles.forEach((particle) => {
                particle.update();
                particle.draw();
            });

            animationFrameId = requestAnimationFrame(animate);
        };

        globalThis.addEventListener('resize', () => {
            resizeCanvas();
            init();
        });
        globalThis.addEventListener('mousemove', handleMouseMove);

        resizeCanvas();
        init();
        animate();

        return () => {
            globalThis.removeEventListener('resize', resizeCanvas);
            globalThis.removeEventListener('mousemove', handleMouseMove);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed top-0 left-0 w-full h-full pointer-events-none"
            style={{
                zIndex: 0,
                background: 'transparent'
            }}
        />
    );
};

export default ParticlesBackground;
