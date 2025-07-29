
import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Chat } from '@google/genai';
import { createChat } from './services/geminiService';
import Header from './components/Header';
import ChatWindow from './components/ChatWindow';
import ChatInput from './components/ChatInput';
import { type Message, Sender } from './types';

const App: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const chatRef = useRef<Chat | null>(null);

    useEffect(() => {
        chatRef.current = createChat();
        setMessages([
            {
                id: 'initial-message',
                text: "Hello! I'm Seeky, your AI assistant. How can I help you today?",
                sender: Sender.AI,
            },
        ]);
    }, []);

    const sendMessage = useCallback(async (text: string) => {
        if (isLoading || !text.trim() || !chatRef.current) return;

        setIsLoading(true);
        const userMessage: Message = { id: Date.now().toString(), text, sender: Sender.User };
        setMessages(prev => [...prev, userMessage]);

        const aiMessageId = (Date.now() + 1).toString();
        // Add a placeholder for the AI response
        setMessages(prev => [...prev, { id: aiMessageId, text: '', sender: Sender.AI }]);

        try {
            const stream = await chatRef.current.sendMessageStream({ message: text });
            
            let accumulatedText = "";
            for await (const chunk of stream) {
                accumulatedText += chunk.text;
                setMessages(prev =>
                    prev.map(msg =>
                        msg.id === aiMessageId ? { ...msg, text: accumulatedText } : msg
                    )
                );
            }
        } catch (error) {
            console.error("Error sending message to Gemini:", error);
            const errorMessage: Message = {
                id: aiMessageId,
                text: "Sorry, I encountered an error. Please try again.",
                sender: Sender.AI,
            };
            setMessages(prev => prev.map(msg => msg.id === aiMessageId ? errorMessage : msg));
        } finally {
            setIsLoading(false);
        }
    }, [isLoading]);

    return (
        <div className="flex flex-col h-screen bg-slate-900 text-white font-sans antialiased">
            <Header />
            <ChatWindow messages={messages} isLoading={isLoading} />
            <div className="p-4 bg-slate-900">
                <ChatInput onSendMessage={sendMessage} isLoading={isLoading} />
            </div>
        </div>
    );
};

export default App;
