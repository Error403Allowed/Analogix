import { motion } from "framer-motion";

const Confetti = () => {
  const confettiColors = ["#a855f7", "#3b82f6", "#22c55e", "#f59e0b", "#ec4899"];
  const confettiPieces = Array.from({ length: 30 });

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {confettiPieces.map((_, index) => (
        <motion.div
          key={index}
          className="absolute w-3 h-3 rounded-sm"
          style={{
            left: `${Math.random() * 100}%`,
            top: "50%",
            backgroundColor: confettiColors[index % confettiColors.length],
          }}
          initial={{ y: 0, x: 0, rotate: 0, opacity: 1 }}
          animate={{
            y: -(Math.random() * 200 + 100),
            x: (Math.random() - 0.5) * 200,
            rotate: Math.random() * 720,
            opacity: 0,
          }}
          transition={{
            duration: 1.5,
            ease: "easeOut",
            delay: Math.random() * 0.3,
          }}
        />
      ))}
    </div>
  );
};

export default Confetti;
