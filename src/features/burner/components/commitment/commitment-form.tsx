'use client';

/**
 * Commitment Form Component
 * Form for creating new learning commitments with validation
 * Requirements: 2.1, 2.3, 2.4, 2.5
 */

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';

import {
    createCommitmentSchema,
    type CreateCommitmentInput,
} from '../../utils/validation';
import { createCommitment } from '../../actions/commitment-actions';

interface CommitmentFormProps {
    /** Callback when commitment is successfully created */
    onSuccess?: () => void;
    /** Callback when form is cancelled */
    onCancel?: () => void;
}

/**
 * CommitmentForm - Form for creating new learning commitments
 *
 * Features:
 * - Topic input (3-200 characters)
 * - Duration input (1-90 days)
 * - Stake amount input ($1-$1000)
 * - Zod validation with react-hook-form
 * - Inline validation errors
 * - Loading state during submission
 * - Success/error toast notifications
 */
export function CommitmentForm({ onSuccess, onCancel }: CommitmentFormProps) {
    const [isPending, startTransition] = useTransition();
    const [serverError, setServerError] = useState<string | null>(null);

    const form = useForm<CreateCommitmentInput>({
        resolver: zodResolver(createCommitmentSchema),
        defaultValues: {
            topic: '',
            durationDays: 7,
            stakeAmount: 10,
        },
    });

    async function onSubmit(data: CreateCommitmentInput) {
        setServerError(null);

        startTransition(async () => {
            try {
                // Create FormData for server action
                const formData = new FormData();
                formData.append('topic', data.topic);
                formData.append('stakeAmount', data.stakeAmount.toString());
                formData.append('durationDays', data.durationDays.toString());

                const result = await createCommitment(formData);

                if (result.success) {
                    toast.success('Commitment created!', {
                        description: `You've committed to learning "${data.topic}" with $${data.stakeAmount} at stake.`,
                    });
                    form.reset();
                    onSuccess?.();
                } else {
                    // Handle validation errors from server
                    if (result.errors) {
                        const authError = result.errors.find(
                            (e) => e.field === 'auth'
                        );
                        const serverErr = result.errors.find(
                            (e) => e.field === 'server'
                        );

                        if (authError) {
                            setServerError(authError.message);
                            toast.error('Authentication required', {
                                description: authError.message,
                            });
                        } else if (serverErr) {
                            setServerError(serverErr.message);
                            toast.error('Error creating commitment', {
                                description: serverErr.message,
                            });
                        } else {
                            // Set field-specific errors
                            result.errors.forEach((error) => {
                                if (
                                    error.field === 'topic' ||
                                    error.field === 'stakeAmount' ||
                                    error.field === 'durationDays'
                                ) {
                                    form.setError(error.field, {
                                        type: 'server',
                                        message: error.message,
                                    });
                                }
                            });
                            toast.error('Validation error', {
                                description:
                                    'Please check the form for errors.',
                            });
                        }
                    }
                }
            } catch (error) {
                const message =
                    error instanceof Error
                        ? error.message
                        : 'An unexpected error occurred';
                setServerError(message);
                toast.error('Error', {
                    description: message,
                });
            }
        });
    }

    return (
        <Form form={form} onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Server Error Display */}
            {serverError && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    {serverError}
                </div>
            )}

            {/* Topic Field */}
            <FormField
                control={form.control}
                name="topic"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>
                            Learning Topic
                            <span className="ml-1 text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                            <Input
                                placeholder="e.g., React Server Components, Machine Learning Basics"
                                disabled={isPending}
                                {...field}
                            />
                        </FormControl>
                        <FormDescription>
                            What do you want to learn? Be specific for better
                            exam questions.
                        </FormDescription>
                        <FormMessage />
                    </FormItem>
                )}
            />

            {/* Duration and Stake Amount - Side by Side */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {/* Duration Field */}
                <FormField
                    control={form.control}
                    name="durationDays"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>
                                Duration (Days)
                                <span className="ml-1 text-destructive">*</span>
                            </FormLabel>
                            <FormControl>
                                <Input
                                    type="number"
                                    min={1}
                                    max={90}
                                    placeholder="7"
                                    disabled={isPending}
                                    {...field}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        field.onChange(
                                            value === ''
                                                ? undefined
                                                : parseInt(value, 10)
                                        );
                                    }}
                                />
                            </FormControl>
                            <FormDescription>
                                1-90 days to complete your learning
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Stake Amount Field */}
                <FormField
                    control={form.control}
                    name="stakeAmount"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>
                                Stake Amount ($)
                                <span className="ml-1 text-destructive">*</span>
                            </FormLabel>
                            <FormControl>
                                <Input
                                    type="number"
                                    min={1}
                                    max={1000}
                                    step={1}
                                    placeholder="10"
                                    disabled={isPending}
                                    {...field}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        field.onChange(
                                            value === ''
                                                ? undefined
                                                : parseFloat(value)
                                        );
                                    }}
                                />
                            </FormControl>
                            <FormDescription>
                                $1-$1000 - Learn it or lose it!
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            {/* Form Actions */}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                {onCancel && (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onCancel}
                        disabled={isPending}
                    >
                        Cancel
                    </Button>
                )}
                <Button type="submit" disabled={isPending}>
                    {isPending ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating...
                        </>
                    ) : (
                        'Create Commitment'
                    )}
                </Button>
            </div>
        </Form>
    );
}
