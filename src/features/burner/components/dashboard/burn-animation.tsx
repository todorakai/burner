'use client';

/**
 * Burn Animation Component
 * Displays a dramatic "burn" animation when a stake is burned
 * Requirements: 8.3 - When a stake is "burned" THE System SHALL display a dramatic "burn" animation
 */

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Flame, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { StakeStatus } from '../../types/database';

/**
 * Props for the BurnAnimation component
 */
export interface BurnAnimationProps {
    /** The stake amount being burned */
    stakeAmount: number;
    /** Current stake status - animation triggers when this changes to "burned" */
    stakeStatus: StakeStatus;
    /** Whether the animation should be visible */
    isVisible?: boolean;
    /** Callback when animation completes or is dismissed */
    onComplete?: () => void;
    /** Whether to play sound effect (optional) */
    enableSound?: boolean;
    /** Custom message to display */
    message?: string;
    /** Optional className for styling */
    className?: string;
    /** Whether to show as overlay (true) or inline (false) */
    overlay?: boolean;
}

/**
 * Format a number as USD currency
 */
function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

/**
 * Individual flame particle component
 */
interface FlameParticleProps {
    delay: number;
    x: number;
    size: 'sm' | 'md' | 'lg';
}

function FlameParticle({ delay, x, size }: FlameParticleProps) {
    const sizeClasses = {
        sm: 'w-3 h-4',
        md: 'w-5 h-6',
        lg: 'w-7 h-8',
    };

    const colors = ['text-orange-500', 'text-red-500', 'text-yellow-500', 'text-amber-500'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    return (
        <motion.div
            className={cn('absolute', sizeClasses[size], randomColor)}
            style={{ left: `${x}%` }}
            initial={{ y: 0, opacity: 0, scale: 0.5 }}
            animate={{
                y: [-20, -80, -140],
                opacity: [0, 1, 0],
                scale: [0.5, 1.2, 0.3],
                rotate: [0, Math.random() * 30 - 15, Math.random() * 60 - 30],
            }}
            transition={{
                duration: 1.5,
                delay,
                repeat: Infinity,
                ease: 'easeOut',
            }}
        >
            <Flame className="w-full h-full" />
        </motion.div>
    );
}

/**
 * Ember particle component for additional visual effect
 */
interface EmberParticleProps {
    delay: number;
    startX: number;
    startY: number;
}

function EmberParticle({ delay, startX, startY }: EmberParticleProps) {
    const endX = startX + (Math.random() * 100 - 50);
    const endY = startY - Math.random() * 150 - 50;

    return (
        <motion.div
            className="absolute w-1.5 h-1.5 rounded-full bg-gradient-to-r from-orange-400 to-yellow-300"
            style={{ left: `${startX}%`, bottom: `${startY}%` }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{
                x: [0, endX - startX],
                y: [0, -(endY - startY)],
                opacity: [0, 1, 1, 0],
                scale: [0, 1, 0.5, 0],
            }}
            transition={{
                duration: 2,
                delay,
                repeat: Infinity,
                ease: 'easeOut',
            }}
        />
    );
}

/**
 * Burn Animation Component
 * Displays a dramatic visual effect when a stake is burned, leveraging
 * loss aversion psychology to create an impactful experience.
 *
 * Features:
 * - Animated flames rising from the bottom
 * - Ember particles floating upward
 * - Stake amount "consumed" by flames
 * - Pulsing glow effect
 * - Optional sound effect
 * - Can be used as overlay or inline
 *
 * @param props - Component props
 * @returns Burn animation component
 */
export function BurnAnimation({
    stakeAmount,
    stakeStatus,
    isVisible: isVisibleProp,
    onComplete,
    enableSound = false,
    message = 'Your stake has been burned',
    className,
    overlay = true,
}: BurnAnimationProps) {
    // Determine visibility based on prop or stake status
    const [isVisible, setIsVisible] = useState(isVisibleProp ?? stakeStatus === 'burned');
    const [hasPlayedSound, setHasPlayedSound] = useState(false);

    // Update visibility when stake status changes to "burned"
    useEffect(() => {
        if (stakeStatus === 'burned' && isVisibleProp === undefined) {
            setIsVisible(true);
        }
    }, [stakeStatus, isVisibleProp]);

    // Update visibility when prop changes
    useEffect(() => {
        if (isVisibleProp !== undefined) {
            setIsVisible(isVisibleProp);
        }
    }, [isVisibleProp]);

    // Play sound effect when animation becomes visible
    useEffect(() => {
        if (isVisible && enableSound && !hasPlayedSound) {
            // Create a simple fire crackling sound using Web Audio API
            try {
                const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);

                oscillator.type = 'sawtooth';
                oscillator.frequency.setValueAtTime(150, audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.5);

                gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.5);

                setHasPlayedSound(true);
            } catch {
                // Audio not supported or blocked
                console.warn('Audio playback not available');
            }
        }
    }, [isVisible, enableSound, hasPlayedSound]);

    // Reset sound state when animation is hidden
    useEffect(() => {
        if (!isVisible) {
            setHasPlayedSound(false);
        }
    }, [isVisible]);

    const handleDismiss = useCallback(() => {
        setIsVisible(false);
        onComplete?.();
    }, [onComplete]);

    // Generate flame particles
    const flameParticles = Array.from({ length: 12 }, (_, i) => ({
        id: i,
        delay: i * 0.1,
        x: 10 + (i * 7) + Math.random() * 5,
        size: (['sm', 'md', 'lg'] as const)[Math.floor(Math.random() * 3)],
    }));

    // Generate ember particles
    const emberParticles = Array.from({ length: 20 }, (_, i) => ({
        id: i,
        delay: i * 0.15,
        startX: 20 + Math.random() * 60,
        startY: 10 + Math.random() * 20,
    }));

    const content = (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className={cn(
                'relative flex flex-col items-center justify-center',
                overlay && 'fixed inset-0 z-50 bg-black/80 backdrop-blur-sm',
                !overlay && 'w-full min-h-[300px] bg-gradient-to-t from-red-950/50 to-transparent rounded-lg',
                className
            )}
            onClick={overlay ? handleDismiss : undefined}
        >
            {/* Close button for overlay mode */}
            {overlay && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-4 right-4 text-white/70 hover:text-white hover:bg-white/10"
                    onClick={handleDismiss}
                >
                    <X className="h-6 w-6" />
                    <span className="sr-only">Close</span>
                </Button>
            )}

            {/* Main content container */}
            <div className="relative flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
                {/* Glow effect behind the amount */}
                <motion.div
                    className="absolute inset-0 bg-gradient-radial from-orange-500/30 via-red-500/20 to-transparent rounded-full blur-3xl"
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.5, 0.8, 0.5],
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                    style={{ width: '300px', height: '300px', transform: 'translate(-50%, -50%)', left: '50%', top: '50%' }}
                />

                {/* Flame icon with animation */}
                <motion.div
                    className="relative z-10 mb-4"
                    animate={{
                        scale: [1, 1.1, 1],
                        rotate: [0, 5, -5, 0],
                    }}
                    transition={{
                        duration: 0.5,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                >
                    <Flame className="h-16 w-16 text-orange-500 drop-shadow-[0_0_15px_rgba(249,115,22,0.7)]" />
                </motion.div>

                {/* Stake amount being burned */}
                <motion.div
                    className="relative z-10 text-center"
                    initial={{ scale: 1.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                >
                    <motion.p
                        className="text-5xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 via-orange-500 to-red-600 drop-shadow-[0_0_20px_rgba(249,115,22,0.5)]"
                        animate={{
                            textShadow: [
                                '0 0 20px rgba(249,115,22,0.5)',
                                '0 0 40px rgba(249,115,22,0.8)',
                                '0 0 20px rgba(249,115,22,0.5)',
                            ],
                        }}
                        transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: 'easeInOut',
                        }}
                    >
                        {formatCurrency(stakeAmount)}
                    </motion.p>

                    {/* "BURNED" text */}
                    <motion.p
                        className="mt-2 text-2xl md:text-3xl font-bold text-red-500 tracking-widest"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                    >
                        BURNED
                    </motion.p>
                </motion.div>

                {/* Message */}
                <motion.p
                    className="relative z-10 mt-6 text-lg text-white/80 text-center max-w-md px-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                >
                    {message}
                </motion.p>

                {/* Flame particles container */}
                <div className="absolute bottom-0 left-0 right-0 h-40 overflow-hidden pointer-events-none">
                    {flameParticles.map((particle) => (
                        <FlameParticle
                            key={particle.id}
                            delay={particle.delay}
                            x={particle.x}
                            size={particle.size}
                        />
                    ))}
                </div>

                {/* Ember particles */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {emberParticles.map((ember) => (
                        <EmberParticle
                            key={ember.id}
                            delay={ember.delay}
                            startX={ember.startX}
                            startY={ember.startY}
                        />
                    ))}
                </div>

                {/* Dismiss hint for overlay */}
                {overlay && (
                    <motion.p
                        className="absolute bottom-8 text-sm text-white/50"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1 }}
                    >
                        Click anywhere to dismiss
                    </motion.p>
                )}
            </div>
        </motion.div>
    );

    return (
        <AnimatePresence>
            {isVisible && content}
        </AnimatePresence>
    );
}
