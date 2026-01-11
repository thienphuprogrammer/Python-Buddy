
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Chat } from '@google/genai';
import { MessageRole, ChatMessage } from './types';
import { ChatInput } from './components/ChatInput';
import { ChatMessageComponent } from './components/ChatMessage';
import { PythonIcon, GameIcon } from './components/Icons';
import { FishingGame } from './components/FishingGame';

const SYSTEM_INSTRUCTION = `Bạn là "Python Buddy" - một Trợ giảng AI chuyên về lập trình Python cho học sinh lớp 10 theo chương trình giáo dục phổ thông của Việt Nam.

--- QUY TẮC BẮT BUỘC PHẢI TUÂN THỦ NGHIÊM NGẶT ---

1. VAI TRÒ GIÁO DỤC:
   - Mục tiêu chính của bạn là giúp học sinh phát triển kỹ năng tự học và tự gỡ lỗi (debugging), không phải là làm bài tập hộ.
   - Giới hạn kiến thức của bạn chỉ trong phạm vi chương trình Python lớp 10: biến, kiểu dữ liệu (số, chuỗi, boolean), các phép toán, câu lệnh điều kiện (if/elif/else), vòng lặp (for, while), và các hàm cơ bản (print, input, len, range). Không đề cập đến các chủ đề nâng cao.
   - LỆNH CẤM TUYỆT ĐỐI: Không bao giờ được cung cấp code giải quyết hoàn chỉnh cho một bài tập, bài toán, hoặc bài kiểm tra. Không bao giờ được viết lại toàn bộ code của học sinh để sửa lỗi.

2. QUY TRÌNH PHÂN TÍCH VÀ SỬA LỖI (QUAN TRỌNG NHẤT):
   - Khi nhận được một đoạn code bị lỗi, nhiệm vụ của bạn là hướng dẫn học sinh tự tìm ra lỗi.
   - Bước 1: Phân tích và xác định rõ loại lỗi. Ví dụ: "Đây có vẻ là một lỗi cú pháp (Syntax Error)" hoặc "Mình nghĩ code của bạn có một lỗi logic (Logic Error) ở vòng lặp."
   - Bước 2: Thay vì chỉ ra chính xác và sửa lỗi, hãy đặt 2-3 câu hỏi gợi mở, tập trung vào dòng code hoặc khối code có vấn đề.
     - Ví dụ cho Syntax Error: "Bạn hãy kiểm tra lại xem cú pháp của lệnh 'print' trong Python viết như thế nào nhé?", "Dấu hai chấm (:) ở cuối câu lệnh 'if' có vai trò gì và bạn đã đặt nó đúng chỗ chưa?"
     - Ví dụ cho Logic Error: "Vòng lặp 'for' của bạn đang chạy bao nhiêu lần? Có đúng với số lần bạn mong muốn không?", "Biến 'tong' đã được gán giá trị ban đầu trước khi bắt đầu tính tổng chưa?"
     - Ví dụ cho NameError: "Lỗi này báo rằng biến 'x' chưa được định nghĩa. Bạn hãy xem lại xem mình đã tạo ra biến 'x' ở đâu đó phía trên chưa nhé?"

3. QUY TRÌNH GIẢI THÍCH KHÁI NIỆM:
   - Khi học sinh hỏi về một khái niệm, hãy giải thích bằng ngôn ngữ đơn giản, gần gũi, phù hợp với lứa tuổi học sinh lớp 10.
   - Luôn đi kèm một ví dụ code cực kỳ ngắn gọn và dễ hiểu để minh họa.
   - Sau ví dụ, hãy giải thích ngắn gọn tại sao khái niệm đó lại hữu ích và quan trọng trong lập trình.

4. PHONG CÁCH GIAO TIẾP:
   - Luôn giữ giọng văn thân thiện, tích cực, kiên nhẫn và động viên như một người bạn đồng hành. Sử dụng các từ như "chúng ta", "cùng xem nào", "bạn thử nghĩ xem".
   - Luôn kết thúc câu trả lời bằng một câu hỏi mở để khuyến khích học sinh tiếp tục suy nghĩ và tương tác. Ví dụ: "Bạn thử áp dụng gợi ý của mình xem sao nhé?", "Bạn còn câu hỏi nào khác không?".`;
   
type AppMode = 'welcome' | 'chat' | 'game';

const WelcomeScreen = ({ onModeSelect }: { onModeSelect: (mode: AppMode) => void }) => (
    <div className="text-center p-8 flex flex-col items-center justify-center h-full">
      <div className="inline-block p-4 bg-green-500 rounded-full">
        <PythonIcon className="w-16 h-16 text-white"/>
      </div>
      <h1 className="text-4xl font-bold mt-4 text-green-400">Python Buddy</h1>
      <p className="text-lg text-gray-400 mt-2 max-w-lg">
        Trợ giảng AI giúp bạn học lập trình Python. Chọn một chế độ để bắt đầu!
      </p>
      <div className="mt-8 flex flex-col sm:flex-row gap-4">
        <button
          onClick={() => onModeSelect('chat')}
          className="bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors shadow-lg text-lg flex items-center justify-center gap-2"
        >
          <PythonIcon className="w-6 h-6" />
          Giải thích & Gỡ lỗi
        </button>
        <button
          onClick={() => onModeSelect('game')}
          className="bg-purple-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-purple-700 transition-colors shadow-lg text-lg flex items-center justify-center gap-2"
        >
          <GameIcon className="w-6 h-6" />
          Game Câu Cá
        </button>
      </div>
    </div>
);

const ChatInterface = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSendMessage = async (text: string) => {
    if (isLoading || !text.trim()) return;

    const userMessage: ChatMessage = { role: MessageRole.USER, content: text };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      if (!chatRef.current) {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
        chatRef.current = ai.chats.create({
          model: 'gemini-3-flash-preview',
          config: { systemInstruction: SYSTEM_INSTRUCTION },
        });
      }

      const stream = await chatRef.current.sendMessageStream({ message: text });
      setMessages((prev) => [...prev, { role: MessageRole.MODEL, content: '' }]);

      for await (const chunk of stream) {
        const chunkText = chunk.text;
        setMessages((prev) => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage.role === MessageRole.MODEL) {
            lastMessage.content += chunkText;
          }
          return newMessages;
        });
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
      setError(errorMessage);
      setMessages((prev) => [
        ...prev,
        { role: MessageRole.MODEL, content: `Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại. Lỗi: ${errorMessage}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="flex-grow overflow-y-auto p-4 flex flex-col">
        <div className="max-w-4xl mx-auto w-full flex-grow">
          {messages.map((msg, index) => (
            <ChatMessageComponent key={index} message={msg} />
          ))}
          {error && <div className="text-red-500 text-center my-4">{error}</div>}
          <div ref={messagesEndRef} />
        </div>
      </div>
      <ChatInput ref={inputRef} onSendMessage={handleSendMessage} isLoading={isLoading} />
    </>
  );
};


const App: React.FC = () => {
    const [mode, setMode] = useState<AppMode>('welcome');

    return (
        <div className="flex flex-col h-screen bg-gray-900 font-sans relative">
            {/* Attribution Text - Updated per user request */}
            <div className="absolute top-1 right-2 z-50 text-[12px] text-green-500 pointer-events-none select-none italic">
                designed by: vuthao83
            </div>

            <header className="p-4 border-b border-gray-700 shadow-md bg-gray-800 flex items-center justify-between">
                <h1 className="text-xl font-semibold text-center text-green-400 flex items-center justify-center gap-2">
                    <PythonIcon className="w-6 h-6"/> Python Buddy
                </h1>
                {mode !== 'welcome' && (
                    <button 
                        onClick={() => setMode('welcome')}
                        className="text-sm bg-gray-600 hover:bg-gray-500 text-white font-bold py-1 px-3 rounded-lg transition-colors"
                    >
                        Quay lại
                    </button>
                )}
            </header>
            <main className="flex-grow overflow-y-auto flex flex-col">
                {mode === 'welcome' && <WelcomeScreen onModeSelect={setMode} />}
                {mode === 'chat' && <ChatInterface />}
                {mode === 'game' && <FishingGame />}
            </main>
        </div>
    );
};

export default App;
