import Sidebar from './Sidebar';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#F7F5F2]">
      <Sidebar />
      <main className="flex-1 overflow-auto min-w-0">{children}</main>
    </div>
  );
}
