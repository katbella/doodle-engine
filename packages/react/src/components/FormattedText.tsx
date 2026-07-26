/**
 * FormattedText - Renders the dialogue formatting syntax without interpreting HTML
 */

import { Fragment, type ReactNode } from 'react';
import { parseRichText, type RichTextSegment } from '@doodle-engine/core';

export interface FormattedTextProps {
    text: string;
}

function textWithLineBreaks(text: string, segmentIndex: number): ReactNode[] {
    const lines = text.split('\n');
    const output: ReactNode[] = [];

    lines.forEach((line, lineIndex) => {
        if (lineIndex > 0) {
            output.push(<br key={`break-${segmentIndex}-${lineIndex}`} />);
        }
        output.push(line);
    });

    return output;
}

function renderSegment(segment: RichTextSegment, index: number): ReactNode {
    let content: ReactNode = textWithLineBreaks(segment.text, index);

    if (segment.italic) content = <em>{content}</em>;
    if (segment.bold) content = <strong>{content}</strong>;
    if (segment.color) {
        content = <span style={{ color: segment.color }}>{content}</span>;
    }

    return <Fragment key={index}>{content}</Fragment>;
}

export function FormattedText({ text }: FormattedTextProps) {
    return <>{parseRichText(text).map(renderSegment)}</>;
}
