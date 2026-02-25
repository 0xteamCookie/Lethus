import Greet from "@/component/greet";
import ChatInput from "@/component/chatInput";
import SideNavbar from "@/component/sideNavbar";
import RightPanel from "@/component/rightPanel";

export default async function Page({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    return (
        <div className="relative min-h-screen bg-page-bg">
            <SideNavbar />
            <main className="min-h-screen flex flex-col items-center justify-center px-5 py-10 gap-10">
                <Greet />
                <ChatInput />
            </main>
            <RightPanel />
        </div>
    );
}
