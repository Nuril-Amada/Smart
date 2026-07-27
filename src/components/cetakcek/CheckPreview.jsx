import MandiriCheck from "./MandiriCheck";
import BCACheck from "./BCACheck";
import SinarmasCheck from "./SinarmasCheck";
import MaybankCheck from "./MaybankCheck";

// Peta nama bank (sesuai value pada <select> di CheckForm) ke komponennya
const BANK_COMPONENTS = {
    "Bank Mandiri": MandiriCheck,
    "Bank BCA": BCACheck,
    "Bank Sinarmas": SinarmasCheck,
    Maybank: MaybankCheck,
};

export default function CheckPreview({ form }) {
    const SelectedCheck = form.bank ? BANK_COMPONENTS[form.bank] : null;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden" style={{ margin: "20px", padding: "20px" }}>
            <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                <h2 className="font-bold text-gray-800">Preview Layout Cek Fisik</h2>
                {form.bank && (
                    <span className="text-xs text-gray-500">
                        Format: <strong className="text-gray-700">{form.bank}</strong>
                    </span>
                )}
            </div>
            <div className="p-6 flex justify-center overflow-x-auto bg-gray-50/50">
                {!SelectedCheck ? (
                    <div
                        className="rounded-2xl border-2 border-dashed border-gray-300 bg-white flex flex-col items-center justify-center p-8 text-center"
                        style={{ width: "21cm", height: "9.5cm" }}
                    >
                        <p className="text-gray-400 text-sm font-medium">
                            Silakan pilih Bank pada form di atas untuk menampilkan simulasi cetak cek
                        </p>
                    </div>
                ) : (
                    <SelectedCheck form={form} />
                )}
            </div>
        </div>
    );
}