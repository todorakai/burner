'use client';

/**
 * Exam Question Component
 * Displays a single question with appropriate input based on question type
 * Requirements: 4.1, 4.2
 */

import { useState, useCallback } from 'react';
import { HelpCircle, CheckCircle2, FileText, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';

import type { ExamQuestion as ExamQuestionType, QuestionType, QuestionDifficulty } from '../../types/database';

interface ExamQuestionProps {
    /** The question to display */
    question: ExamQuestionType;
    /** Current answer value */
    value?: string;
    /** Callback when answer changes */
    onChange?: (answer: string) => void;
    /** Question number (1-based) */
    questionNumber: number;
    /** Whether the question is disabled */
    disabled?: boolean;
    /** Optional className for styling */
    className?: string;
}

/**
 * Get question type configuration
 */
function getQuestionTypeConfig(type: QuestionType): {
    label: string;
    icon: typeof HelpCircle;
    description: string;
} {
    switch (type) {
        case 'multiple_choice':
            return {
                label: 'Multiple Choice',
                icon: CheckCircle2,
                description: 'Select the best answer',
            };
        case 'short_answer':
            return {
                label: 'Short Answer',
                icon: FileText,
                description: 'Provide a brief response',
            };
        case 'application':
            return {
                label: 'Application',
                icon: Lightbulb,
                description: 'Apply your knowledge to solve this problem',
            };
        default:
            return {
                label: 'Question',
                icon: HelpCircle,
                description: 'Answer the question',
            };
    }
}

/**
 * Get difficulty badge configuration
 */
function getDifficultyConfig(difficulty: QuestionDifficulty): {
    label: string;
    className: string;
} {
    switch (difficulty) {
        case 'advanced':
            return {
                label: 'Advanced',
                className: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30',
            };
        case 'intermediate':
        default:
            return {
                label: 'Intermediate',
                className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
            };
    }
}

/**
 * ExamQuestion - Displays a single exam question
 *
 * Features:
 * - Supports multiple choice, short answer, and application question types
 * - Radio buttons for multiple choice questions
 * - Textarea for short answer and application questions
 * - Question type and difficulty indicators
 * - Requirement 4.1: Display questions one at a time
 * - Requirement 4.2: Store response when user submits answer
 */
export function ExamQuestion({
    question,
    value = '',
    onChange,
    questionNumber,
    disabled = false,
    className,
}: ExamQuestionProps) {
    const typeConfig = getQuestionTypeConfig(question.type);
    const difficultyConfig = getDifficultyConfig(question.difficulty);
    const TypeIcon = typeConfig.icon;

    const handleChange = useCallback(
        (newValue: string) => {
            if (!disabled && onChange) {
                onChange(newValue);
            }
        },
        [disabled, onChange]
    );

    return (
        <Card className={cn('transition-all duration-200', className)}>
            <CardHeader>
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm shrink-0">
                            {questionNumber}
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className="gap-1">
                                    <TypeIcon className="h-3 w-3" />
                                    {typeConfig.label}
                                </Badge>
                                <Badge variant="outline" className={difficultyConfig.className}>
                                    {difficultyConfig.label}
                                </Badge>
                            </div>
                            <CardDescription>{typeConfig.description}</CardDescription>
                        </div>
                    </div>
                </div>
                <CardTitle className="text-lg leading-relaxed mt-4">
                    {question.question}
                </CardTitle>
            </CardHeader>

            <CardContent>
                {question.type === 'multiple_choice' && question.options ? (
                    <MultipleChoiceInput
                        options={question.options}
                        value={value}
                        onChange={handleChange}
                        disabled={disabled}
                        questionId={question.id}
                    />
                ) : (
                    <TextAnswerInput
                        value={value}
                        onChange={handleChange}
                        disabled={disabled}
                        questionType={question.type}
                        questionId={question.id}
                    />
                )}
            </CardContent>
        </Card>
    );
}

/**
 * Multiple choice input with radio buttons
 */
function MultipleChoiceInput({
    options,
    value,
    onChange,
    disabled,
    questionId,
}: {
    options: string[];
    value: string;
    onChange: (value: string) => void;
    disabled: boolean;
    questionId: string;
}) {
    return (
        <RadioGroup
            value={value}
            onValueChange={onChange}
            disabled={disabled}
            className="space-y-3"
        >
            {options.map((option, index) => {
                const optionLetter = String.fromCharCode(65 + index); // A, B, C, D...
                const optionValue = optionLetter;
                const isSelected = value === optionValue;

                return (
                    <div
                        key={`${questionId}-option-${index}`}
                        className={cn(
                            'flex items-start space-x-3 rounded-lg border p-4 transition-all duration-200',
                            isSelected
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/50 hover:bg-muted/50',
                            disabled && 'opacity-60 cursor-not-allowed'
                        )}
                    >
                        <RadioGroupItem
                            value={optionValue}
                            id={`${questionId}-${optionValue}`}
                            className="mt-0.5"
                        />
                        <Label
                            htmlFor={`${questionId}-${optionValue}`}
                            className={cn(
                                'flex-1 cursor-pointer font-normal leading-relaxed',
                                disabled && 'cursor-not-allowed'
                            )}
                        >
                            <span className="font-semibold mr-2">{optionLetter}.</span>
                            {option}
                        </Label>
                    </div>
                );
            })}
        </RadioGroup>
    );
}

/**
 * Text answer input for short answer and application questions
 */
function TextAnswerInput({
    value,
    onChange,
    disabled,
    questionType,
    questionId,
}: {
    value: string;
    onChange: (value: string) => void;
    disabled: boolean;
    questionType: QuestionType;
    questionId: string;
}) {
    const [charCount, setCharCount] = useState(value.length);

    const handleChange = useCallback(
        (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            const newValue = e.target.value;
            setCharCount(newValue.length);
            onChange(newValue);
        },
        [onChange]
    );

    const minRows = questionType === 'application' ? 6 : 4;
    const placeholder =
        questionType === 'application'
            ? 'Explain your reasoning and provide a detailed answer...'
            : 'Type your answer here...';

    return (
        <div className="space-y-2">
            <Label htmlFor={`answer-${questionId}`} className="sr-only">
                Your Answer
            </Label>
            <Textarea
                id={`answer-${questionId}`}
                value={value}
                onChange={handleChange}
                disabled={disabled}
                placeholder={placeholder}
                className={cn(
                    'resize-none transition-all duration-200',
                    disabled && 'opacity-60 cursor-not-allowed'
                )}
                rows={minRows}
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                    {questionType === 'application'
                        ? 'Provide a thorough explanation with examples if applicable'
                        : 'Be concise but complete in your response'}
                </span>
                <span className={cn(charCount > 0 && 'text-foreground')}>
                    {charCount} characters
                </span>
            </div>
        </div>
    );
}
