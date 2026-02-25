import Greet from "@/component/greet";
import ChatInput from "@/component/chatInput";
import SideNavbar from "@/component/sideNavbar";

export default async function Page({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    return (
        <div className="flex min-h-screen bg-page-bg">
            <SideNavbar />
            <main className="flex-1 flex flex-col items-center justify-center px-5 py-10 gap-10 transition-all duration-300">
                <Greet />
                <ChatInput />
            </main>
        </div>
    );
}