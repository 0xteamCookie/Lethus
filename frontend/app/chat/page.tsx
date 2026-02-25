"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import ChatInput from "@/component/chatInput";
import SideNavbar from "@/component/sideNavbar";
import RightPanel from "@/component/rightPanel";
import Greet from "@/component/greet";
import { useConversation } from "@/lib/conversation";

export default function NewChatPage() {
    const router = useRouter();
    const { sending, send, clearCurrent, refreshConversations } =
        useConversation();

    useEffect(() => {
        clearCurrent();
        refreshConversations();
    }, [clearCurrent, refreshConversations]);

    const handleSend = async (text: string) => {
        const convId = await send(text);
        router.push(`/chat/${convId}`);
    };

    return (
        <div className="relative min-h-screen bg-page-bg">
            <SideNavbar />
            <main className="min-h-screen flex flex-col items-center justify-center px-5 py-10 gap-10">
                <Greet />
                <ChatInput onSend={handleSend} disabled={sending} />
            </main>
            <RightPanel />
        </div>
    );
}
