import Navbar from "@/components/Navbar";
import DailyDrop from "@/components/DailyDrop";
import CommunityFooter from "@/components/CommunityFooter";

export default function Home() {
  return (
    <main className="flex flex-col min-h-screen">
      <Navbar />
      <div className="flex-grow">
        <DailyDrop />
      </div>
      <CommunityFooter />
    </main>
  );
}