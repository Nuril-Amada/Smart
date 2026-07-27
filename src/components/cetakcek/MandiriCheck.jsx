import BaseCheck from "./BaseCheck";

// Konfigurasi tampilan cek khusus Bank Mandiri
const template = {
    label: "Bank Mandiri (001)",
    branch: "Cab. Jakarta Thamrin",
    widthCm: 21,
    heightCm: 10,
    accentBg: "bg-sky-50",
    accentBorder: "border-sky-200",
    headerText: "text-sky-900",
    signaturePosition: "right",
};

export default function MandiriCheck({ form }) {
    return <BaseCheck template={template} form={form} />;
}