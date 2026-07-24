import { useState } from "react";
import Employee, { meta as employeeMeta } from "../components/masterdata/Employee";
import GLAccount, { meta as glAccountMeta } from "../components/masterdata/GLAccount";
import CostCenter, { meta as costCenterMeta } from "../components/masterdata/CostCenter";
import Vendor, { meta as vendorMeta } from "../components/masterdata/Vendor";

const TABS = [
    { ...employeeMeta, Component: Employee },
    { ...glAccountMeta, Component: GLAccount },
    { ...costCenterMeta, Component: CostCenter },
    { ...vendorMeta, Component: Vendor },
];

export default function MasterData() {
    const [activeTab, setActiveTab] = useState("employee");

    const activeConfig = TABS.find((t) => t.id === activeTab);
    const ActiveComponent = activeConfig?.Component;

    return (
        <div style={{ padding: "20px 20px 20px", minHeight: "100vh" }}>
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: "12px",
                    marginBottom: "8px",
                    position: "sticky",
                    top: 0,
                    zIndex: 20,
                    paddingTop: "8px",
                    paddingBottom: "8px",
                }}
            >
                {TABS.map((tab) => {
                    const isActive = activeTab === tab.id;
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                position: "relative",
                                display: "flex",
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "flex-start",
                                gap: "10px",
                                padding: "10px 14px",
                                border: isActive ? `2px solid ${tab.color}` : "2px solid #e5e7eb",
                                borderRadius: "12px",
                                background: isActive
                                    ? `linear-gradient(135deg, ${tab.color}15, ${tab.color}06)`
                                    : "#fff",
                                cursor: "pointer",
                                transform: isActive ? "translateY(-5px)" : "translateY(0)",
                                boxShadow: isActive
                                    ? `0 10px 28px ${tab.color}28, 0 4px 10px ${tab.color}18`
                                    : "0 2px 6px rgba(0,0,0,0.06)",
                                transition: "transform 0.25s cubic-bezier(.34,1.56,.64,1), box-shadow 0.25s ease, border-color 0.2s, background 0.2s",
                                outline: "none",
                                zIndex: isActive ? 2 : 1,
                                textAlign: "left",
                                width: "100%",
                                boxSizing: "border-box",
                            }}
                            onMouseEnter={(e) => {
                                if (!isActive) {
                                    e.currentTarget.style.transform = "translateY(-2px)";
                                    e.currentTarget.style.boxShadow = `0 6px 16px ${tab.color}18`;
                                    e.currentTarget.style.borderColor = `${tab.color}50`;
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!isActive) {
                                    e.currentTarget.style.transform = "translateY(0)";
                                    e.currentTarget.style.boxShadow = "0 2px 6px rgba(0,0,0,0.06)";
                                    e.currentTarget.style.borderColor = "#e5e7eb";
                                }
                            }}
                        >
                            {isActive && (
                                <div
                                    style={{
                                        position: "absolute",
                                        left: 0,
                                        top: "20%",
                                        bottom: "20%",
                                        width: "3px",
                                        background: tab.color,
                                        borderRadius: "0 4px 4px 0",
                                    }}
                                />
                            )}

                            <div
                                style={{
                                    width: "34px",
                                    height: "34px",
                                    borderRadius: "10px",
                                    background: isActive ? tab.color : `${tab.color}15`,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                    transition: "background 0.2s",
                                }}
                            >
                                <Icon
                                    style={{
                                        fontSize: "15px",
                                        color: isActive ? "#fff" : tab.color,
                                        transition: "color 0.2s",
                                    }}
                                />
                            </div>

                            <span
                                style={{
                                    fontSize: "13px",
                                    fontWeight: isActive ? 700 : 500,
                                    color: isActive ? tab.color : "#6b7280",
                                    transition: "color 0.2s",
                                    whiteSpace: "nowrap",
                                }}
                            >
                                {tab.label}
                            </span>
                        </button>
                    );
                })}
            </div>

            {activeConfig && (
                <div
                    key={activeTab}
                    style={{
                        marginTop: "20px",
                        background: "#fff",
                        borderRadius: "20px",
                        border: `1.5px solid ${activeConfig.color}30`,
                        boxShadow: `0 8px 32px ${activeConfig.color}12`,
                        padding: "24px",
                        animation: "slideDown 0.3s cubic-bezier(.34,1.56,.64,1)",
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                        <div
                            style={{
                                width: "36px",
                                height: "36px",
                                borderRadius: "10px",
                                background: `${activeConfig.color}15`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                            }}
                        >
                            <activeConfig.icon style={{ fontSize: "16px", color: activeConfig.color }} />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#1e1b4b" }}>
                                {activeConfig.label}
                            </h3>
                            <p style={{ margin: 0, fontSize: "12px", color: "#9ca3af" }}>
                                Kelola data {activeConfig.label.toLowerCase()} di sini
                            </p>
                        </div>
                    </div>

                    <ActiveComponent />
                </div>
            )}
        </div>
    );
}