import {
    Body,
    Button,
    Container,
    Head,
    Heading,
    Hr,
    Html,
    Preview,
    Row,
    Section,
    Text,
} from "@react-email/components";

// ======================================================================
// TEMPLATE EMAIL — OVERDUE ADVANCE REMINDER
//
// Cara pakai:
// 1. Preview / development di React pakai `npx react-email dev`
// 2. Export jadi HTML statis pakai `npx react-email export`
// 3. Hasil file .html diserahkan ke tim backend (FastAPI) untuk
//    dipakai sebagai Jinja2 template di app/templates/email/
//
// PENTING:
// - Placeholder ditulis literal sebagai teks "{{ nama_variabel }}",
//   BUKAN interpolasi JSX ({namaUser}) — supaya saat di-export ke HTML,
//   teksnya tetap "{{ nama_variabel }}" dan bisa langsung dipakai
//   Jinja2 di backend tanpa perlu diedit lagi.
// - Semua styling inline (lewat prop React Email), karena email client
//   (Gmail, Outlook, dll) tidak mendukung CSS modern / flexbox / class.
// ======================================================================

export default function OverdueReminderEmail() {
    return (
        <Html>
            <Head />
            <Preview>
                Reminder: Advance PPC {"{{ no_ppc }}"} kamu sudah jatuh tempo
            </Preview>
            <Body style={main}>
                <Container style={container}>
                    {/* Header */}
                    <Section style={header}>
                        <Heading style={headerTitle}>Advance Overdue Reminder</Heading>
                    </Section>

                    {/* Body */}
                    <Section style={content}>
                        <Text style={paragraph}>
                            Halo <strong>{"{{ nama_user }}"}</strong>,
                        </Text>

                        <Text style={paragraph}>
                            Ini adalah pengingat bahwa pengajuan advance kamu dengan detail
                            di bawah ini <strong>sudah melewati batas waktu settlement</strong>{" "}
                            (2 hari sejak tanggal pengajuan) dan belum diselesaikan.
                            Mohon segera lakukan proses reimbursement / settlement.
                        </Text>

                        {/* Detail Box */}
                        <Section style={detailBox}>
                            <Row style={detailRow}>
                                <Text style={detailLabel}>No PPC</Text>
                                <Text style={detailValue}>{"{{ no_ppc }}"}</Text>
                            </Row>
                            <Hr style={detailDivider} />

                            <Row style={detailRow}>
                                <Text style={detailLabel}>Tanggal Pengajuan</Text>
                                <Text style={detailValue}>{"{{ tanggal_pengajuan }}"}</Text>
                            </Row>
                            <Hr style={detailDivider} />

                            <Row style={detailRow}>
                                <Text style={detailLabel}>Jatuh Tempo</Text>
                                <Text style={detailValue}>{"{{ due_date }}"}</Text>
                            </Row>
                            <Hr style={detailDivider} />

                            <Row style={detailRow}>
                                <Text style={detailLabel}>Cost Center</Text>
                                <Text style={detailValue}>{"{{ cost_center }}"}</Text>
                            </Row>
                            <Hr style={detailDivider} />

                            <Row style={detailRow}>
                                <Text style={detailLabel}>Keterangan</Text>
                                <Text style={detailValue}>{"{{ keterangan }}"}</Text>
                            </Row>
                            <Hr style={detailDivider} />

                            <Row style={detailRow}>
                                <Text style={detailLabel}>Jumlah</Text>
                                <Text style={detailValueAmount}>{"{{ jumlah }}"}</Text>
                            </Row>
                        </Section>

                        <Text style={paragraph}>
                            Segera selesaikan settlement advance ini untuk menghindari
                            keterlambatan lebih lanjut dalam proses pelaporan keuangan.
                        </Text>

                        {/* CTA Button */}
                        <Section style={buttonWrapper}>
                            <Button style={button} href={"{{ settlement_url }}"}>
                                Selesaikan Settlement
                            </Button>
                        </Section>
                    </Section>

                    <Hr style={footerDivider} />

                    {/* Footer */}
                    <Section style={footer}>
                        <Text style={footerText}>
                            Email ini dikirim otomatis oleh sistem. Mohon untuk tidak
                            membalas email ini.
                        </Text>
                        <Text style={footerText}>
                            &copy; {"{{ current_year }}"} — Finance System
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
}

// ======================================================================
// STYLES — semua inline, aman untuk email client
// ======================================================================

const main = {
    backgroundColor: "#f4f4f5",
    fontFamily:
        "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    padding: "24px 0",
};

const container = {
    backgroundColor: "#ffffff",
    margin: "0 auto",
    maxWidth: "560px",
    borderRadius: "12px",
    overflow: "hidden",
    border: "1px solid #e4e4e7",
};

const header = {
    backgroundColor: "#dc2626",
    padding: "24px 32px",
};

const headerTitle = {
    color: "#ffffff",
    fontSize: "20px",
    fontWeight: "700",
    margin: "0",
};

const content = {
    padding: "32px",
};

const paragraph = {
    color: "#3f3f46",
    fontSize: "14px",
    lineHeight: "22px",
    margin: "0 0 16px 0",
};

const detailBox = {
    backgroundColor: "#f9fafb",
    border: "1px solid #e4e4e7",
    borderRadius: "8px",
    padding: "16px 20px",
    margin: "20px 0",
};

const detailRow = {
    width: "100%",
};

const detailLabel = {
    color: "#71717a",
    fontSize: "12px",
    margin: "4px 0",
};

const detailValue = {
    color: "#18181b",
    fontSize: "14px",
    fontWeight: "600",
    margin: "0 0 8px 0",
};

const detailValueAmount = {
    color: "#dc2626",
    fontSize: "16px",
    fontWeight: "700",
    margin: "0 0 8px 0",
};

const detailDivider = {
    borderColor: "#e4e4e7",
    margin: "4px 0",
};

const buttonWrapper = {
    textAlign: "center",
    margin: "24px 0 8px 0",
};

const button = {
    backgroundColor: "#dc2626",
    borderRadius: "8px",
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: "600",
    textDecoration: "none",
    padding: "12px 28px",
    display: "inline-block",
};

const footerDivider = {
    borderColor: "#e4e4e7",
    margin: "0",
};

const footer = {
    padding: "20px 32px",
    backgroundColor: "#fafafa",
};

const footerText = {
    color: "#a1a1aa",
    fontSize: "11px",
    lineHeight: "16px",
    margin: "2px 0",
    textAlign: "center",
};