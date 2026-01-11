import React, { useState, useEffect, forwardRef } from 'react';
import { SendIcon } from './Icons';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

export const ChatInput = forwardRef<HTMLTextAreaElement, ChatInputProps>(
  ({ onSendMessage, isLoading }, ref) => {
    const [input, setInput] = useState('');

    useEffect(() => {
        const textarea = (ref as React.RefObject<HTMLTextAreaElement>)?.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${textarea.scrollHeight}px`;
        }
    }, [input, ref]);

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (input.trim() && !isLoading) {
        onSendMessage(input.trim());
        setInput('');
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e);
      }
    };

    return (
      <form
        onSubmit={handleSubmit}
        className="sticky bottom-0 left-0 right-0 p-4 bg-gray-900 border-t border-gray-700"
      >
        <div className="max-w-4xl mx-auto bg-gray-800 rounded-lg p-2 flex items-end shadow-lg">
          <textarea
            ref={ref}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nhập câu hỏi hoặc đoạn code Python của bạn..."
            rows={1}
            className="flex-grow bg-transparent text-gray-200 placeholder-gray-500 focus:outline-none resize-none max-h-48 px-2"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="ml-2 p-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
            aria-label="Send message"
          >
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <SendIcon className="w-6 h-6" />
            )}
          </button>
        </div>
      </form>
    );
  }
);

ChatInput.displayName = 'ChatInput';
