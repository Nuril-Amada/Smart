import BaseCheck from "./BaseCheck";

// Konfigurasi tampilan cek khusus Bank Sinarmas
const template = {
    label: "Bank Sinarmas",
    branch: "Cab. Jakarta Sudirman",
    widthCm: 21,
    heightCm: 9.5,
    accentBg: "bg-amber-50",
    accentBorder: "border-amber-200",
    headerText: "text-amber-900",
    signaturePosition: "left",
};

export default function SinarmasCheck({ form }) {
    return <BaseCheck template={template} form={form} />;
}