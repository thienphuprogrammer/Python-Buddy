
import React from 'react';
import { MessageRole, ChatMessage } from '../types';
import { PythonIcon } from './Icons';

interface ChatMessageProps {
  message: ChatMessage;
}

// A simple markdown-to-html converter for code blocks
const formatContent = (content: string) => {
  const codeBlockRegex = /```(python\n)?([\s\S]*?)```/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Text before the code block
    if (match.index > lastIndex) {
      parts.push(<span key={`text-${lastIndex}`}>{content.substring(lastIndex, match.index)}</span>);
    }
    // The code block itself
    const code = match[2];
    parts.push(
      <pre key={`code-${match.index}`} className="bg-gray-800 text-white p-4 rounded-md my-2 overflow-x-auto">
        <code>{code}</code>
      </pre>
    );
    lastIndex = match.index + match[0].length;
  }

  // Text after the last code block
  if (lastIndex < content.length) {
    parts.push(<span key={`text-${lastIndex}`}>{content.substring(lastIndex)}</span>);
  }

  return parts.length > 0 ? <>{parts}</> : <>{content}</>;
};

export const ChatMessageComponent: React.FC<ChatMessageProps> = ({ message }) => {
  const isUserModel = message.role === MessageRole.USER;

  return (
    <div className={`flex items-start gap-4 my-4 ${isUserModel ? 'justify-end' : 'justify-start'}`}>
      {!isUserModel && (
        <div className="flex-shrink-0 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
          <PythonIcon className="w-6 h-6 text-white" />
        </div>
      )}
      <div
        className={`max-w-xl p-4 rounded-lg shadow-md whitespace-pre-wrap break-words ${
          isUserModel
            ? 'bg-blue-600 text-white rounded-br-none'
            : 'bg-gray-700 text-gray-200 rounded-bl-none'
        }`}
      >
        {formatContent(message.content)}
      </div>
    </div>
  );
};
