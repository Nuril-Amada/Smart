import BaseCheck from "./BaseCheck";

// Konfigurasi tampilan cek khusus Bank BCA
// Catatan: bank ini belum ada di data awal, ditambahkan agar sesuai
// dengan struktur folder yang menyertakan BCACheck.jsx
const template = {
    label: "Bank BCA (014)",
    branch: "Cab. Jakarta Sudirman",
    widthCm: 21,
    heightCm: 9.5,
    accentBg: "bg-blue-50",
    accentBorder: "border-blue-200",
    headerText: "text-blue-900",
    signaturePosition: "left",
};

export default function BCACheck({ form }) {
    return <BaseCheck template={template} form={form} />;
}