import Navbar from "@/components/Navbar";
import DailyDrop from "@/components/DailyDrop";
import CommunityFooter from "@/components/CommunityFooter";

export default function Home() {
  return (
    <main className="flex w-full max-w-[100vw] min-h-screen flex-col overflow-x-clip">
      <Navbar />
      <div className="flex-grow">
        <DailyDrop />
      </div>
      <CommunityFooter />
    </main>
  );
}