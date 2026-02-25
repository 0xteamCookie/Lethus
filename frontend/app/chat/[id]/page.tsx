"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import ChatInput from "@/component/chatInput";
import SideNavbar from "@/component/sideNavbar";
import RightPanel from "@/component/rightPanel";
import MessageList from "@/component/messageList";
import Greet from "@/component/greet";
import { useConversation } from "@/lib/conversation";

export default function ChatPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const {
        messages,
        loading,
        sending,
        loadConversation,
        send,
        refreshConversations,
    } = useConversation();

    useEffect(() => {
        if (id) {
            loadConversation(id);
            refreshConversations();
        }
    }, [id, loadConversation, refreshConversations]);

    const handleSend = async (text: string) => {
        const convId = await send(text);
        // If a new conversation was created, navigate to it
        if (!id || id !== convId) {
            router.push(`/chat/${convId}`);
        }
    };

    const hasMessages = messages.length > 0;

    return (
        <div className="relative min-h-screen bg-page-bg">
            <SideNavbar />
            <main className="min-h-screen flex flex-col items-center px-5 py-10 gap-4">
                {hasMessages || loading ? (
                    <MessageList
                        messages={messages}
                        loading={loading}
                        sending={sending}
                    />
                ) : (
                    <div className="flex-1 flex items-center justify-center">
                        <Greet />
                    </div>
                )}
                <div className="w-full flex justify-center pb-4 sticky bottom-0">
                    <ChatInput onSend={handleSend} disabled={sending} />
                </div>
            </main>
            <RightPanel />
        </div>
    );
}
