import { useState, useEffect } from 'react';

export const TypingText = ({ text, onComplete }: { text: string; onComplete?: () => void }) => {
    const [displayedText, setDisplayedText] = useState('');
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (currentIndex < text.length) {
            const timer = setTimeout(() => {
                setDisplayedText(prev => prev + text[currentIndex]);
                setCurrentIndex(prev => prev + 1);
            }, 20);
            return () => clearTimeout(timer);
        } else if (onComplete) {
            onComplete();
        }
    }, [currentIndex, text, onComplete]);

    return <span dangerouslySetInnerHTML={ { __html: displayedText } } />;
};