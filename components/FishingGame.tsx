import React, { useState, useRef, useEffect } from 'react';
// Fix: Import `Type` for response schema and remove `Chat` as we are switching to `generateContent`.
import { GoogleGenAI, GenerateContentResponse, Type } from '@google/genai';
import { FishIcon, GameIcon } from './Icons';

const GAME_SYSTEM_INSTRUCTION = `BẠN LÀ QUẢN TRÒ CỦA TRÒ CHƠI "CÂU CÁ KIẾN THỨC PYTHON".

--- QUY TẮC CỦA TRÒ CHƠI ---
1.  Mục tiêu: Giúp học sinh lớp 10 ôn tập kiến thức Python cơ bản qua một trò chơi vui vẻ.
2.  Chủ đề: Chỉ hỏi về các khái niệm Python cho lớp 10 (biến, kiểu dữ liệu, toán tử, if/else, for/while, hàm cơ bản).
3.  Loại câu hỏi: Bạn phải luân phiên tạo ra 4 loại câu hỏi: trắc nghiệm đúng/sai (true_false), flashcard (hỏi định nghĩa), điền vào chỗ trống (fill_in_the_blank), và trắc nghiệm 4 lựa chọn (mcq).

--- ĐỊNH DẠNG GIAO TIẾP (RẤT QUAN TRỌNG) ---
-   Khi người dùng yêu cầu một câu hỏi mới ("Bắt đầu", "Câu hỏi tiếp theo"), bạn PHẢI trả lời bằng một đối tượng JSON duy nhất, không có bất kỳ văn bản nào khác.
-   Cấu trúc JSON để tạo câu hỏi:
    {
      "type": "mcq" | "true_false" | "fill_in_the_blank" | "flashcard",
      "question": "Nội dung câu hỏi ở đây...",
      "options": ["Lựa chọn A", "Lựa chọn B", "Lựa chọn C", "Lựa chọn D"],
      "answer": "Đáp án chính xác"
    }
    Lưu ý:
    - Thuộc tính "options" chỉ cần thiết cho type: "mcq".
    - Với "fill_in_the_blank", câu hỏi nên có dạng "câu lệnh ___.", và "answer" là từ cần điền.
    - Với "flashcard", "answer" là định nghĩa hoặc giải thích ngắn.
    - Với "true_false", "answer" là "Đúng" hoặc "Sai".

-   Khi người dùng gửi một câu trả lời để bạn đánh giá, bạn PHẢI trả lời bằng một đối tượng JSON duy nhất.
-   Cấu trúc JSON để đánh giá câu trả lời:
    {
      "is_correct": true | false,
      "explanation": "Giải thích ngắn gọn tại sao đáp án đó đúng hoặc sai."
    }
-   Tuyệt đối không thêm bất kỳ lời thoại hay văn bản nào khác ngoài đối tượng JSON được yêu cầu.`;

type QuestionType = 'mcq' | 'true_false' | 'fill_in_the_blank' | 'flashcard';

interface Question {
    type: QuestionType;
    question: string;
    options?: string[];
    answer: string;
}

interface Evaluation {
    is_correct: boolean;
    explanation: string;
}

// Fix: Removed the custom JSON parsing function as we will enforce JSON output via the API config.

export const FishingGame: React.FC = () => {
    const [score, setScore] = useState(0);
    const [question, setQuestion] = useState<Question | null>(null);
    const [userAnswer, setUserAnswer] = useState('');
    const [feedback, setFeedback] = useState<Evaluation | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    // Fix: Removed chatRef as we are no longer using the Chat API for this component.

    const speak = (text: string) => {
        try {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'vi-VN';
            window.speechSynthesis.speak(utterance);
        } catch (e) {
            console.error("Speech synthesis failed.", e);
        }
    };

    // Fix: Refactored the entire function to use `generateContent` with a response schema for robust JSON generation.
    const getNextQuestion = async () => {
        setIsLoading(true);
        setError(null);
        setQuestion(null);
        setFeedback(null);
        setUserAnswer('');

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: 'Câu hỏi tiếp theo',
                config: {
                    systemInstruction: GAME_SYSTEM_INSTRUCTION,
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            type: { type: Type.STRING },
                            question: { type: Type.STRING },
                            options: { type: Type.ARRAY, items: { type: Type.STRING } },
                            answer: { type: Type.STRING }
                        },
                        required: ["type", "question", "answer"]
                    }
                }
            });
            const parsedQuestion = JSON.parse(response.text) as Question;
            setQuestion(parsedQuestion);
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
            setError(`Không thể tải câu hỏi. Vui lòng thử lại. Lỗi: ${errorMessage}`);
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };
    
    useEffect(() => {
        getNextQuestion();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Fix: Refactored the answer submission logic to also use `generateContent` with a specific schema for evaluation.
    const handleAnswerSubmit = async (answer: string) => {
        if (!question) return;
        setIsLoading(true);
        setError(null);
        setUserAnswer(answer);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
            const prompt = `Câu hỏi là: "${question.question}". Câu trả lời của tôi là: "${answer}". Câu trả lời này đúng hay sai?`;
            const response: GenerateContentResponse = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    systemInstruction: GAME_SYSTEM_INSTRUCTION,
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            is_correct: { type: Type.BOOLEAN },
                            explanation: { type: Type.STRING },
                        },
                        required: ["is_correct", "explanation"],
                    },
                },
            });
            const evaluation = JSON.parse(response.text) as Evaluation;

            if (evaluation.is_correct) {
                setScore(prev => prev + 1);
                speak('Bạn giỏi quá!');
            } else {
                setScore(0);
                speak('Rất tiếc bạn đã sai rồi');
            }
            setFeedback(evaluation);
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
            setError(`Không thể đánh giá câu trả lời. Vui lòng thử lại. Lỗi: ${errorMessage}`);
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const renderQuestionInput = () => {
        if (!question) return null;
        switch (question.type) {
            case 'mcq':
                return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                        {question.options?.map((opt) => (
                            <button key={opt} onClick={() => handleAnswerSubmit(opt)} className="p-4 bg-gray-700 hover:bg-blue-600 rounded-lg text-left transition-colors">
                                {opt}
                            </button>
                        ))}
                    </div>
                );
            case 'true_false':
                return (
                    <div className="flex gap-4 mt-4">
                        <button onClick={() => handleAnswerSubmit('Đúng')} className="flex-1 p-4 bg-green-600 hover:bg-green-700 rounded-lg transition-colors font-bold">Đúng</button>
                        <button onClick={() => handleAnswerSubmit('Sai')} className="flex-1 p-4 bg-red-600 hover:bg-red-700 rounded-lg transition-colors font-bold">Sai</button>
                    </div>
                );
            case 'fill_in_the_blank':
            case 'flashcard':
                return (
                    <form onSubmit={(e) => { e.preventDefault(); handleAnswerSubmit(userAnswer); }} className="flex gap-2 mt-4">
                        <input
                            type="text"
                            value={userAnswer}
                            onChange={(e) => setUserAnswer(e.target.value)}
                            placeholder="Nhập câu trả lời của bạn..."
                            className="flex-grow p-3 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button type="submit" className="p-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold">Trả lời</button>
                    </form>
                );
            default:
                return null;
        }
    };
    
    return (
        <div className="p-4 sm:p-6 max-w-4xl mx-auto w-full h-full flex flex-col">
            <div className="bg-gray-800 p-4 rounded-lg shadow-lg flex justify-between items-center mb-6 border border-gray-700">
                <h2 className="text-2xl font-bold text-purple-400 flex items-center gap-2"><GameIcon /> Game Câu Cá</h2>
                <div className="flex items-center gap-2 text-xl font-bold text-yellow-400">
                    <FishIcon className="w-8 h-8"/>
                    <span>{score}</span>
                </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg shadow-lg flex-grow flex flex-col justify-center border border-gray-700">
                {isLoading && !feedback && <div className="text-center">Đang tải câu hỏi...</div>}
                {error && <div className="text-center text-red-500">{error}</div>}
                
                {question && !feedback && (
                    <div>
                        <p className="text-lg text-gray-400 mb-2">Câu hỏi:</p>
                        <p className="text-2xl font-semibold text-white whitespace-pre-wrap">{question.question}</p>
                        {!isLoading && renderQuestionInput()}
                    </div>
                )}
                
                {feedback && (
                    <div className="text-center">
                        <h3 className={`text-3xl font-bold ${feedback.is_correct ? 'text-green-400' : 'text-red-400'}`}>
                            {feedback.is_correct ? 'Chính xác!' : 'Sai rồi!'}
                        </h3>
                        <p className="mt-4 text-lg">{feedback.explanation}</p>
                        <p className="mt-2 text-gray-400">Đáp án đúng là: <span className="font-bold text-white">{question?.answer}</span></p>
                        <button onClick={getNextQuestion} disabled={isLoading} className="mt-8 bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors shadow-lg text-lg disabled:bg-gray-600">
                            {isLoading ? "Đang tải..." : "Câu tiếp theo"}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
