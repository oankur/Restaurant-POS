export default function OutletHome() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-[#F7F5F2] min-h-screen">
      <div className="flex flex-col items-center gap-6">
        <img
          src="/brand-logo.png"
          alt="Brand Logo"
          className="w-56 h-56 object-contain"
        />
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">The Highlander's Shawarma</h1>
      </div>
    </div>
  );
}
