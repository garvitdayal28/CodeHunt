import { motion } from "motion/react";

export default function HeroHeader({ title, description, image, height = "h-[300px]", className = "" }) {
    return (
        <div className={`relative w-full ${height} overflow-hidden rounded-2xl mb-8 ${className}`}>
            {/* Background Image */}
            <img
                src={image}
                alt={title}
                className="absolute inset-0 w-full h-full object-cover"
            />
            {/* Dark Overlay */}
            <div className="absolute inset-0 bg-linear-to-b from-black/40 via-black/30 to-black/60" />

            {/* Content */}
            <div className="relative h-full flex flex-col items-center justify-center px-6 text-center">
                <motion.h1
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="text-display-md md:text-display-lg text-white mb-2 drop-shadow-lg"
                >
                    {title}
                </motion.h1>
                {description && (
                    <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                        className="text-body-md text-white/80 max-w-2xl drop-shadow-md"
                    >
                        {description}
                    </motion.p>
                )}
            </div>
        </div>
    );
}
