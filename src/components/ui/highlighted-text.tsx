import React from 'react';

interface HighlightedTextProps {
    text: string;
    className?: string;
}

/**
 * Component that highlights specific trigger words with themed colors
 * Based on client requirements:
 * - Trump = Red
 * - Obama = Blue  
 * - LGBTQ = Rainbow
 * - Person of Color = Wheat tones
 * - Undocumented person = Red, White & Green (Mexico flag colors)
 * - Person carrying a firearm = Black
 */
export const HighlightedText: React.FC<HighlightedTextProps> = ({ text, className = "" }) => {
    const highlightWords = (text: string): React.ReactNode => {
        // Define word patterns and their corresponding styles
        const patterns = [
            {
                // Trump - Red
                pattern: /(President Trump|Trump)/gi,
                className: "text-red-600 font-semibold bg-red-50 px-1 rounded dark:text-red-400 dark:bg-red-950/30"
            },
            {
                // Obama - Blue
                pattern: /(President Obama|Obama)/gi,
                className: "text-blue-600 font-semibold bg-blue-50 px-1 rounded dark:text-blue-400 dark:bg-blue-950/30"
            },
            {
                // LGBTQ - Rainbow gradient
                pattern: /(LGBTQ\+?|LGBTQ community|member of the LGBTQ)/gi,
                className: "font-semibold bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 via-indigo-500 to-purple-500 bg-clip-text text-transparent px-1"
            },
            {
                // Person of Color - Wheat/warm earth tones
                pattern: /(person of color|people of color)/gi,
                className: "text-amber-700 font-semibold bg-amber-50 px-1 rounded dark:text-amber-300 dark:bg-amber-950/30"
            },
            {
                // Undocumented person - Mexico flag colors (red, white, green) - improved visibility
                pattern: /(undocumented individual|undocumented person)/gi,
                className: "font-semibold text-green-700 bg-gradient-to-r from-red-100 via-green-50 to-green-100 px-2 py-0.5 rounded border-l-2 border-r-2 border-l-red-500 border-r-green-600 dark:text-green-300 dark:from-red-900/30 dark:via-green-900/20 dark:to-green-900/30 dark:border-l-red-400 dark:border-r-green-400"
            },
            {
                // Person carrying firearm - Black
                pattern: /(person carrying a firearm|carrying a firearm)/gi,
                className: "text-gray-900 font-semibold bg-gray-100 px-1 rounded dark:text-gray-100 dark:bg-gray-800"
            }
        ];

        let result: React.ReactNode[] = [];
        let lastIndex = 0;
        let matchFound = false;

        // Find all matches across all patterns
        const allMatches: Array<{
            match: RegExpMatchArray;
            pattern: typeof patterns[0];
            index: number;
        }> = [];

        patterns.forEach(pattern => {
            let match;
            const regex = new RegExp(pattern.pattern.source, pattern.pattern.flags);

            while ((match = regex.exec(text)) !== null) {
                allMatches.push({
                    match,
                    pattern,
                    index: match.index!
                });
            }
        });

        // Sort matches by their position in the text
        allMatches.sort((a, b) => a.index - b.index);

        // Process matches in order
        allMatches.forEach(({ match, pattern, index }, i) => {
            // Add text before this match
            if (index > lastIndex) {
                result.push(text.slice(lastIndex, index));
            }

            // Add the highlighted match
            result.push(
                <span key={`highlight-${i}`} className={pattern.className}>
                    {match[0]}
                </span>
            );

            lastIndex = index + match[0].length;
            matchFound = true;
        });

        // Add remaining text after the last match
        if (lastIndex < text.length) {
            result.push(text.slice(lastIndex));
        }

        // If no matches found, return original text
        if (!matchFound) {
            return text;
        }

        return result;
    };

    return (
        <span className={className}>
            {highlightWords(text)}
        </span>
    );
};