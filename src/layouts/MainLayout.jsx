import Sidebar from "../components/common/Sidebar";
import Navbar from "../components/common/Navbar";

export default function MainLayout({ children }) {
  return (
    <div className="flex h-screen bg-gray-100">

      {/* Sidebar */}
      <Sidebar />

      {/* Content */}
      <div className="flex flex-col flex-1 min-w-0">

        {/* Navbar */}
        <Navbar />

        {/* Page */}
        <main className="flex-1 overflow-y-auto px-8 py-6">

          <div className="max-w-[1800px] mx-auto">

            {children}

          </div>

        </main>

      </div>

    </div>
  );
}