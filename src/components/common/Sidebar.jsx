import { NavLink } from "react-router-dom";
import {
  FaHome,
  FaMoneyCheckAlt,
  FaWallet,
  FaClipboardCheck,
  FaHandHoldingUsd,
  FaFileExport,
} from "react-icons/fa";

import logo from "../../assets/LOGO.png";

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
        name: "Settlement",
        icon: <FaWallet />,
        path: "/Settlement",
      },
      {
        name: "Advance",
        icon: <FaHandHoldingUsd />,
        path: "/Advance",
      },
    ],
  },

  {
    title: "",
    items: [
      {
        name: "Export",
        icon: <FaFileExport />,
        path: "/Export",
      },
    ],
  },
];

export default function Sidebar() {
  return (
    <aside className="w-[200px] h-screen bg-[#363D48] text-white flex flex-col shadow-lg">

      {/* ================= LOGO ================= */}

      <div className="h-24 border-b border-gray-600 flex items-center">

        <div className="flex items-center" style={{ marginLeft: "15px" }}>

          <img
            src={logo}
            alt="Logo"
            className="w-13 h-13 object-contain mr-4"
          />

          <div>

            <h1 className="text-[22px] font-bold text-white leading-none">
              Navicash
            </h1>

            <p className="text-[13px] text-gray-300 mt-1">
              PT. SMART Tbk.
            </p>

          </div>

        </div>

      </div>

      {/* ================= MENU ================= */}

      <div className="flex-1 overflow-y-auto pt-6 pb-5" style={{ marginLeft: "15px", marginRight: "15px" }}>

        {menu.map((section, index) => (

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
                  `mx-4 my-3 flex items-center h-[45px] rounded-lg px-4 transition-all duration-300 
                  ${isActive
                    ? "bg-[#59616F] text-white shadow"
                    : "text-gray-200 hover:bg-[#59616F]"
                  }`
                } style={{ marginTop: "5px", marginBottom: "5px" }}
              >

                {/* ICON */}

                <div className="w-8 flex justify-center text-[18px]">

                  {item.icon}

                </div>

                {/* TEXT */}

                <span className="ml-3 text-[15px] font-medium">

                  {item.name}

                </span>

              </NavLink>

            ))}

          </div>

        ))}

      </div>

      {/* ================= FOOTER ================= */}

      <div className="border-t border-gray-600 py-4 text-center text-[11px] text-gray-400">

        © 2025 PT. SMART Tbk.
        <br />
        All rights reserved.

      </div>

    </aside>
  );
}