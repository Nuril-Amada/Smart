import BaseCheck from "./BaseCheck";

// Konfigurasi tampilan cek khusus Maybank Indonesia
const template = {
    label: "Maybank Indonesia",
    branch: "Cab. Jakarta Senayan",
    widthCm: 21,
    heightCm: 10.5,
    accentBg: "bg-yellow-50",
    accentBorder: "border-yellow-300",
    headerText: "text-yellow-900",
    signaturePosition: "right",
};

export default function MaybankCheck({ form }) {
    return <BaseCheck template={template} form={form} />;
}