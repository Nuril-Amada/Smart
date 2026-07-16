import { Body, Container, Head, Hr, Html, Preview, Text } from "@react-email/components";

// ======================================================================
// TEMPLATE EMAIL — OVERDUE ADVANCE REMINDER (format memo resmi)
//
// Cara pakai:
// 1. Preview / development di React pakai `npx react-email dev`
// 2. Export jadi HTML statis pakai `npx react-email export`
// 3. Hasil file .html diserahkan ke tim backend (FastAPI) untuk
//    dipakai sebagai Jinja2 template di app/templates/email/
//
// PENTING:
// - Placeholder ditulis literal sebagai teks "{{ nama_variabel }}",
//   BUKAN interpolasi JSX ({namaVariabel}) — supaya saat di-export ke
//   HTML, teksnya tetap "{{ nama_variabel }}" dan bisa langsung dipakai
//   Jinja2 di backend tanpa perlu diedit lagi.
// - Bagian tabel outstanding memakai Jinja2 for-loop ("{% for %}" /
//   "{% endfor %}") karena satu user bisa punya lebih dari satu advance
//   yang overdue dalam satu email — backend cukup loop-kan list
//   `outstanding_items` yang berisi field: tanggal, no_ppc, nama_user,
//   keterangan, nominal, status.
// - Semua styling inline, tanpa warna mencolok — mengikuti format memo
//   internal perusahaan (plain, formal, tabel bergaris).
// ======================================================================

export default function OverdueReminderEmail() {
    return (
        <Html>
            <Head />
            <Preview>
                Reminder outstanding Uang Muka Petty Cash — {"{{ nama_user }}"}
            </Preview>
            <Body style={main}>
                <Container style={container}>
                    <Text style={paragraph}>Kepada Bapak/Ibu {"{{ nama_user }}"}</Text>

                    <Text style={paragraph}>
                        Berikut adalah Uang Muka Petty Cash yang masih outstanding per
                        hari ini {"{{ tanggal_hari_ini }}"}:
                    </Text>

                    <Text style={sectionTitle}>UANG MUKA</Text>

                    <table style={table} cellPadding="0" cellSpacing="0">
                        <thead>
                            <tr>
                                <th style={th}>Tanggal</th>
                                <th style={th}>Nomor PPC</th>
                                <th style={th}>Nama User</th>
                                <th style={th}>Keterangan</th>
                                <th style={thRight}>Nominal</th>
                                <th style={th}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {"{% for item in outstanding_items %}"}
                            <tr>
                                <td style={td}>{"{{ item.tanggal }}"}</td>
                                <td style={td}>{"{{ item.no_ppc }}"}</td>
                                <td style={td}>{"{{ item.nama_user }}"}</td>
                                <td style={td}>{"{{ item.keterangan }}"}</td>
                                <td style={tdRight}>{"{{ item.nominal }}"}</td>
                                <td style={td}>{"{{ item.status }}"}</td>
                            </tr>
                            {"{% endfor %}"}
                        </tbody>
                    </table>

                    <Text style={paragraphSpaced}>
                        Mohon untuk memberikan update status dokumen penyelesaian atas
                        petty cash tersebut dan target waktu penyelesaian dengan
                        membalas email ini.
                        <br />
                        Silahkan segera submit ke kasir jika dokumen penyelesaian sudah
                        Full Approved.
                        <br />
                        Jika dirasa sudah submit dokumen dan masih tertera di list
                        Outstanding tersebut, mohon konfirmasi ke Kasir.
                    </Text>

                    <Text style={paragraph}>Internal Memo:</Text>

                    <table style={memoTable} cellPadding="0" cellSpacing="0">
                        <tbody>
                            <tr>
                                <td style={memoRefCell}>{"{{ memo_ref_no }}"}</td>
                                <td style={memoQuoteCell}>
                                    "Uang tunai yang diterima karyawan melalui Petty Cash
                                    harus dipertanggungjawabkan maksimum 2 (dua) hari kerja
                                    setelah uang diterima."
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    <Text style={paragraphSpaced}>
                        Terima kasih atas perhatian & kerjasamanya.
                    </Text>
                </Container>
            </Body>
        </Html>
    );
}

// ======================================================================
// STYLES — plain/formal, tanpa warna mencolok
// ======================================================================

const main = {
    backgroundColor: "#ffffff",
    fontFamily: "Calibri, Arial, sans-serif",
    padding: "24px 0",
};

const container = {
    backgroundColor: "#ffffff",
    margin: "0 auto",
    maxWidth: "640px",
    padding: "0 24px",
};

const paragraph = {
    color: "#000000",
    fontSize: "14px",
    lineHeight: "22px",
    margin: "0 0 16px 0",
};

const paragraphSpaced = {
    color: "#000000",
    fontSize: "14px",
    lineHeight: "22px",
    margin: "20px 0 16px 0",
};

const sectionTitle = {
    color: "#000000",
    fontSize: "14px",
    fontWeight: "700",
    textDecoration: "underline",
    margin: "0 0 10px 0",
};

const table = {
    width: "100%",
    borderCollapse: "collapse",
    marginBottom: "8px",
};

const th = {
    border: "1px solid #000000",
    padding: "6px 10px",
    fontSize: "13px",
    fontWeight: "700",
    textAlign: "left",
    backgroundColor: "#ffffff",
    color: "#000000",
};

const thRight = {
    ...th,
    textAlign: "right",
};

const td = {
    border: "1px solid #000000",
    padding: "6px 10px",
    fontSize: "13px",
    color: "#000000",
    textAlign: "left",
};

const tdRight = {
    ...td,
    textAlign: "right",
};

const memoTable = {
    width: "100%",
    borderCollapse: "collapse",
    margin: "4px 0 8px 0",
};

const memoRefCell = {
    fontSize: "12px",
    color: "#000000",
    verticalAlign: "bottom",
    padding: "0 12px 0 0",
    whiteSpace: "nowrap",
    width: "1%",
};

const memoQuoteCell = {
    fontSize: "13px",
    fontStyle: "italic",
    color: "#000000",
    lineHeight: "18px",
    padding: "0",
};