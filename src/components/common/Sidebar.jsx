import { NavLink, useNavigate } from "react-router-dom";
import {
  FaHome,
  FaMoneyCheckAlt,
  FaWallet,
  FaFileInvoiceDollar,
  FaMoneyCheck,
  FaDatabase,
  FaSignOutAlt,
} from "react-icons/fa";

import logo from "../../assets/LOGO.png";
import { logoutApi } from "../../api/auth";

const menu = [
  {
    title: "",
    items: [
      {
        name: "Dashboard",
        icon: <FaHome />,
        path: "/Dashboard",
      },
    ],
  },

  {
    title: "",
    items: [
      {
        name: "Cetak Cek",
        icon: <FaMoneyCheckAlt />,
        path: "/CetakCek",
      },
    ],
  },

  {
    title: "",
    items: [
      {
        name: "Reimbursement & Settlement",
        icon: <FaWallet />,
        path: "/Settlement",
      },
      {
        name: "Advance",
        icon: <FaFileInvoiceDollar />,
        path: "/Advance",
      },
    ],
  },

  {
    title: "",
    items: [
      {
        name: "Cash Opname",
        icon: <FaMoneyCheck />,
        path: "/CashOpname",
      },
    ],
  },

  {
    title: "",
    items: [
      {
        name: "Master Data",
        icon: <FaDatabase />,
        path: "/MasterData",
      },
    ],
  },
];

export default function Sidebar() {
  const navigate = useNavigate();

  const userStr = localStorage.getItem("navicash_user");
  let isAdmin = false;
  if (userStr) {
    try {
      const u = JSON.parse(userStr);
      if (u && (u.role || "").toLowerCase() === "admin") {
        isAdmin = true;
      }
    } catch (e) {
      console.error(e);
    }
  }

  const filteredMenu = isAdmin
    ? menu
        .map((sec) => ({
          ...sec,
          items: sec.items.filter((it) => it.path === "/MasterData"),
        }))
        .filter((sec) => sec.items.length > 0)
    : menu;

  const handleLogout = async () => {
    await logoutApi();
    localStorage.removeItem("navicash_user");
    localStorage.removeItem("navicash_token");
    navigate("/login", { replace: true });
  };

  return (
    <aside className="w-[200px] h-screen bg-[#363D48] text-white flex flex-col shadow-lg">

      {/* ================= LOGO ================= */}
      <div className="h-24 border-b border-gray-600 flex items-center">
        <div className="flex items-center gap-2.5" style={{ marginLeft: "15px" }}>
          <img
            src={logo}
            alt="Logo"
            className="w-12 h-12 object-contain flex-shrink-0"
          />
          <div>
            <h1 className="text-[20px] font-bold text-white leading-none">
              Navicash
            </h1>
            <p className="text-[12px] text-gray-300 mt-1">
              PT. SMART Tbk.
            </p>
          </div>
        </div>
      </div>

      {/* ================= MENU ================= */}
      <div className="flex-1 overflow-y-auto pt-6 pb-5" style={{ marginLeft: "15px", marginRight: "15px" }}>
        {filteredMenu.map((section, index) => (
          <div key={index} className="mb-10">
            {section.title !== "" && (
              <h3 className="px-6 mb-5 text-[11px] uppercase tracking-widest text-gray-400 font-semibold">
                {section.title}
              </h3>
            )}

            {section.items.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                className={({ isActive }) =>
                  `mx-4 my-3 flex items-center min-h-[45px] h-auto rounded-lg px-3 py-2 transition-all duration-300 
                  ${isActive
                    ? "bg-[#59616F] text-white shadow"
                    : "text-gray-200 hover:bg-[#59616F]"
                  }`
                } style={{ marginTop: "5px", marginBottom: "5px" }}
              >
                {/* ICON */}
                <div className="w-8 flex-shrink-0 flex justify-center text-[20px]">
                  {item.icon}
                </div>

                {/* TEXT */}
                <span className="ml-3 text-[14px] font-medium leading-snug break-words">
                  {item.name}
                </span>
              </NavLink>
            ))}
          </div>
        ))}
      </div>

      {/* ================= FOOTER & LOGOUT ================= */}
      <div
        style={{ paddingBottom: "10px", paddingTop: "10px" }}
        className="px-3 border-t border-gray-600 flex flex-col gap-1.5"
      >
        <button
          onClick={handleLogout}
          style={{ borderRadius: "0px", padding: "8px 12px" }}
          className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-all duration-200 shadow hover:shadow-md cursor-pointer active:scale-95 border-none"
        >
          <FaSignOutAlt className="text-sm" />
          <span>Keluar (Logout)</span>
        </button>

        <div className="text-center text-[12px] text-gray-400">
          © 2026 PT. SMART Tbk.
        </div>
      </div>
    </aside>
  );
}