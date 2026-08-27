import React, { useState, useEffect } from 'react';
import { FiClock, FiUser, FiFileText, FiCheckCircle, FiMail, FiTrash, FiX } from 'react-icons/fi';
// import { getReminderLogs, getGenerateEml, markReminderSent } from '../api/notification';
// import { deleteAdvanceRequest } from '../api/advance';

function Notification() {
    const [loading, setLoading] = useState(true);
    const [groupedNotifications, setGroupedNotifications] = useState([]);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [hoveredIndex, setHoveredIndex] = useState(null);

    // Bulk delete state
    const [isDeleteMode, setIsDeleteMode] = useState(false);
    const [selectedEmployees, setSelectedEmployees] = useState([]);
    const [deleteBatchOpen, setDeleteBatchOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState('');

    const fetchNotifications = () => {
        getReminderLogs()
            .then((data) => {
                const groups = {};

                data.forEach((item) => {
                    const groupKey = item.employee_name || 'Karyawan';

                    if (!groups[groupKey]) {
                        groups[groupKey] = {
                            employee_name: item.employee_name,
                            sent_at: item.sent_at,
                            document_nos: [item.document_no],
                            raw_items: [item],
                        };
                    } else {
                        if (item.document_no && !groups[groupKey].document_nos.includes(item.document_no)) {
                            groups[groupKey].document_nos.push(item.document_no);
                        }
                        groups[groupKey].raw_items.push(item);
                    }
                });

                const finalGroups = Object.values(groups).map((group) => {
                    const allSent = group.raw_items.every((x) => x.is_sent);
                    const firstSentItem = group.raw_items.find((x) => x.last_sent_at);
                    const lastSentAt = firstSentItem ? firstSentItem.last_sent_at : null;
                    return {
                        ...group,
                        is_sent: allSent,
                        last_sent_at: lastSentAt,
                    };
                });

                setGroupedNotifications(finalGroups);
                setLoading(false);
            })
            .catch((err) => {
                console.error('Error fetching notifications:', err);
                setErrorMsg('Gagal memuat daftar notifikasi overdue.');
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const handleOpenOutlook = async (groupItem) => {
        if (groupItem.is_sent) return;
        try {
            // 1. Ambil file EML dari backend
            const blob = await getGenerateEml(groupItem.employee_name);

            if (blob) {
                // 2. Unduh berkas EML
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                const safeName = (groupItem.employee_name || 'Karyawan').replace(/\s+/g, '_');
                link.download = `Reminder_Outstanding_${safeName}.eml`;
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.URL.revokeObjectURL(url);

                // 3. Tandai status pengiriman di database backend
                if (typeof markReminderSent === 'function') {
                    await markReminderSent(groupItem.employee_name);
                }

                // 4. Perbarui daftar notifikasi di UI secara langsung
                fetchNotifications();

                // 5. Trigger event agar angka di lonceng Navbar langsung berkurang/update
                window.dispatchEvent(new Event('reminder-updated'));

                // 6. Tampilkan notifikasi sukses seperti di master data
                setSuccessMessage(`Draft reminder untuk ${groupItem.employee_name || 'Karyawan'} berhasil diunduh.`);
                setTimeout(() => setSuccessMessage(''), 3000);
            }
        } catch (err) {
            console.error('Error downloading EML draft:', err);
            setErrorMsg('Gagal mengunduh draft email reminder.');
        }
    };

    // ─── Bulk Delete Handlers ─────────────────────────────────────────────────
    const toggleDeleteMode = () => {
        setIsDeleteMode((prev) => !prev);
        setSelectedEmployees([]);
        setDeleteError('');
    };

    const cancelDeleteMode = () => {
        setIsDeleteMode(false);
        setSelectedEmployees([]);
        setDeleteError('');
    };

    const toggleSelectEmployee = (e, employeeName) => {
        e.stopPropagation();
        setSelectedEmployees((prev) =>
            prev.includes(employeeName)
                ? prev.filter((n) => n !== employeeName)
                : [...prev, employeeName]
        );
    };

    const handleDeleteBatchConfirm = async () => {
        if (selectedEmployees.length === 0) return;
        try {
            setDeleting(true);
            setDeleteError('');
            const itemsToDelete = groupedNotifications.filter((g) =>
                selectedEmployees.includes(g.employee_name)
            );
            await Promise.all(
                itemsToDelete.flatMap((item) =>
                    item.raw_items.map((adv) => deleteAdvanceRequest(adv.advance_id))
                )
            );
            setDeleteBatchOpen(false);
            cancelDeleteMode();
            fetchNotifications();
            window.dispatchEvent(new Event('reminder-updated'));
            setSuccessMessage('Data terpilih berhasil dihapus.');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            console.error('Error deleting advances:', err);
            setDeleteError(err?.response?.data?.detail || 'Gagal menghapus beberapa PPC.');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div style={styles.container}>
            <style>{`
                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-12px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes toastIn {
                    from { opacity: 0; transform: translate(-50%, -12px); }
                    to   { opacity: 1; transform: translate(-50%, 0); }
                }
            `}</style>

            {/* ── Toast Notifikasi Sukses (Sama seperti di Master Data) ── */}
            {successMessage && (
                <div
                    style={{
                        position: 'fixed',
                        top: '20px',
                        left: '50%',
                        transform: 'translate(-50%, 0)',
                        zIndex: 100,
                        background: '#ecfdf5',
                        border: '1.5px solid #6ee7b7',
                        color: '#047857',
                        borderRadius: '10px',
                        padding: '10px 18px',
                        fontSize: '13px',
                        fontWeight: 600,
                        boxShadow: '0 8px 24px rgba(16,185,129,0.25)',
                        animation: 'toastIn 0.25s ease',
                    }}
                >
                    {successMessage}
                </div>
            )}

            {/* ── Header Card ── */}
            <div style={styles.header}>
                <p style={styles.subtitle}>
                    Klik salah satu item notifikasi di bawah untuk mengunduh draft email reminder.
                    Buka file <strong>.eml</strong> yang terunduh untuk membukanya secara otomatis di
                    Microsoft Outlook.
                </p>

                {/* Tombol Hapus di pojok kanan header */}
                <div style={styles.headerActions}>
                    {isDeleteMode ? (
                        <>
                            <button
                                onClick={() => {
                                    setDeleteError('');
                                    setDeleteBatchOpen(true);
                                }}
                                disabled={selectedEmployees.length === 0}
                                style={{
                                    ...styles.btnDeleteConfirm,
                                    opacity: selectedEmployees.length === 0 ? 0.5 : 1,
                                    cursor: selectedEmployees.length === 0 ? 'not-allowed' : 'pointer',
                                }}
                            >
                                <FiTrash size={15} style={{ marginRight: '6px' }} />
                                Hapus Terpilih ({selectedEmployees.length})
                            </button>
                            <button onClick={cancelDeleteMode} style={styles.btnCancel}>
                                <FiX size={15} style={{ marginRight: '6px' }} />
                                Batal
                            </button>
                        </>
                    ) : (
                        <button onClick={toggleDeleteMode} style={styles.btnDeleteToggle} >
                            <FiTrash size={15} />
                        </button>
                    )}
                </div>
            </div>

            {errorMsg && <div style={styles.alertError}>{errorMsg}</div>}

            {/* ── Daftar Notifikasi ── */}
            <div style={styles.listContainer}>
                {loading ? (
                    <div style={styles.emptyCard}>
                        <p style={styles.emptyText}>Memuat data notifikasi...</p>
                    </div>
                ) : groupedNotifications.length === 0 ? (
                    <div style={styles.emptyCard}>
                        <p style={styles.emptyText}>Tidak ada transaksi advance yang overdue saat ini.</p>
                    </div>
                ) : (
                    groupedNotifications.map((item, index) => {
                        const isHovered = hoveredIndex === index;
                        const hasBeenSent = item.is_sent;
                        const isSelected = selectedEmployees.includes(item.employee_name);

                        let cardBg = hasBeenSent ? '#f8fafc' : '#ffffff';
                        if (!hasBeenSent && isHovered && !isDeleteMode) cardBg = '#e2e8f0';
                        if (isDeleteMode && isSelected) cardBg = '#eff6ff';

                        return (
                            <div
                                key={index}
                                onClick={() => {
                                    if (isDeleteMode) {
                                        setSelectedEmployees((prev) =>
                                            prev.includes(item.employee_name)
                                                ? prev.filter((n) => n !== item.employee_name)
                                                : [...prev, item.employee_name]
                                        );
                                    } else {
                                        handleOpenOutlook(item);
                                    }
                                }}
                                onMouseEnter={() => !hasBeenSent && !isDeleteMode && setHoveredIndex(index)}
                                onMouseLeave={() => setHoveredIndex(null)}
                                style={{
                                    ...styles.notifItem,
                                    backgroundColor: cardBg,
                                    cursor: 'pointer',
                                    border: isDeleteMode && isSelected
                                        ? '1.5px solid #3b82f6'
                                        : '1px solid #e2e8f0',
                                }}
                            >
                                {/* Checkbox hanya muncul saat mode hapus */}
                                {isDeleteMode && (
                                    <div style={styles.checkboxWrapper}>
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={(e) => toggleSelectEmployee(e, item.employee_name)}
                                            onClick={(e) => e.stopPropagation()}
                                            style={styles.checkbox}
                                        />
                                    </div>
                                )}

                                {/* Kiri: nama & daftar PPC */}
                                <div style={styles.notifLeft}>
                                    <div style={styles.userSection}>
                                        <FiUser size={16} style={{ marginRight: '8px', color: '#475569' }} />
                                        <span style={styles.employeeName}>{item.employee_name || 'Karyawan'}</span>
                                    </div>
                                    <div style={styles.docSection}>
                                        <FiFileText size={14} style={{ marginRight: '6px', color: '#64748b' }} />
                                        <span>PPC ({item.raw_items.length}): {item.document_nos.filter(Boolean).join(', ') || '-'}</span>
                                    </div>
                                </div>

                                {/* Kanan: tanggal + ikon status */}
                                <div style={styles.notifRight}>
                                    {item.sent_at && (
                                        <span style={styles.dateText}>
                                            <FiClock size={13} style={{ marginRight: '4px' }} />
                                            {item.sent_at}
                                        </span>
                                    )}

                                    {hasBeenSent ? (
                                        <FiCheckCircle
                                            size={20}
                                            title={`Sudah ditindaklanjuti${item.last_sent_at ? ` (${item.last_sent_at})` : ''}`}
                                            style={{ color: '#16a34a', flexShrink: 0 }}
                                        />
                                    ) : (
                                        <FiMail
                                            size={20}
                                            title="Belum ditindaklanjuti – klik untuk unduh draft"
                                            style={{ color: '#2563eb', flexShrink: 0 }}
                                        />
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* ========== MODAL KONFIRMASI HAPUS BATCH ========== */}
            {deleteBatchOpen && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 50,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(0,0,0,0.45)',
                        backdropFilter: 'blur(4px)',
                    }}
                >
                    <div
                        style={{
                            background: '#fff',
                            borderRadius: '20px',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
                            width: '100%',
                            maxWidth: '380px',
                            animation: 'slideDown 0.25s ease',
                        }}
                    >
                        <div style={{ padding: '20px 20px 15px' }}>
                            <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 700, color: '#1e1b4b' }}>
                                Hapus Data Terpilih
                            </h3>
                            <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>
                                Apakah Anda yakin ingin menghapus PPC overdue untuk{' '}
                                <span style={{ fontWeight: 700, color: '#dc2626' }}>
                                    {selectedEmployees.length} karyawan terpilih
                                </span>{' '}
                                yang telah dipilih?
                            </p>

                            {deleteError && (
                                <div
                                    style={{
                                        marginTop: '12px',
                                        fontSize: '13px',
                                        color: '#dc2626',
                                        background: '#fef2f2',
                                        border: '1px solid #fecaca',
                                        borderRadius: '8px',
                                        padding: '10px 12px',
                                    }}
                                >
                                    {deleteError}
                                </div>
                            )}
                        </div>
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: '10px',
                                padding: '16px 24px 24px',
                                borderTop: '1px solid #f1f5f9',
                            }}
                        >
                            <button
                                type="button"
                                onClick={() => {
                                    setDeleteBatchOpen(false);
                                    setDeleteError('');
                                }}
                                disabled={deleting}
                                style={{
                                    border: '1.5px solid #e5e7eb',
                                    borderRadius: '10px',
                                    padding: '8px 20px',
                                    fontSize: '13px',
                                    color: '#6b7280',
                                    background: '#fff',
                                    cursor: 'pointer',
                                    fontWeight: 500,
                                    opacity: deleting ? 0.6 : 1,
                                }}
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteBatchConfirm}
                                disabled={deleting}
                                style={{
                                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                                    border: 'none',
                                    borderRadius: '10px',
                                    padding: '8px 20px',
                                    fontSize: '13px',
                                    color: '#fff',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    opacity: deleting ? 0.6 : 1,
                                }}
                            >
                                {deleting ? 'Menghapus...' : 'Ya, Hapus'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const styles = {
    container: {
        width: '100%',
        padding: '20px 24px',
        boxSizing: 'border-box',
    },
    header: {
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        padding: '16px 20px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        flexWrap: 'wrap',
    },
    subtitle: {
        margin: 0,
        fontSize: '13px',
        color: '#64748b',
        flex: 1,
    },
    headerActions: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexShrink: 0,
    },
    btnDeleteToggle: {
        display: 'flex',
        alignItems: 'center',
        padding: '8px 16px',
        backgroundColor: '#fef2f2',
        color: '#dc2626',
        border: '1px solid #fecaca',
        borderRadius: '8px',
        fontSize: '13px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
    },
    btnDeleteConfirm: {
        display: 'flex',
        alignItems: 'center',
        padding: '8px 16px',
        backgroundColor: '#dc2626',
        color: '#ffffff',
        border: 'none',
        borderRadius: '8px',
        fontSize: '13px',
        fontWeight: '600',
        transition: 'all 0.2s ease',
    },
    btnCancel: {
        display: 'flex',
        alignItems: 'center',
        padding: '8px 16px',
        backgroundColor: '#f1f5f9',
        color: '#475569',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        fontSize: '13px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
    },
    listContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        width: '100%',
    },
    notifItem: {
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        padding: '16px 20px',
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)',
        border: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        transition: 'all 0.2s ease',
        gap: '12px',
    },
    checkboxWrapper: {
        display: 'flex',
        alignItems: 'center',
        flexShrink: 0,
    },
    checkbox: {
        width: '18px',
        height: '18px',
        accentColor: '#3b82f6',
        cursor: 'pointer',
    },
    notifLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
        flex: 1,
    },
    userSection: {
        display: 'flex',
        alignItems: 'center',
        minWidth: '180px',
    },
    employeeName: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#1e293b',
    },
    docSection: {
        display: 'flex',
        alignItems: 'center',
        fontSize: '13px',
        color: '#64748b',
        backgroundColor: '#f8fafc',
        padding: '4px 10px',
        borderRadius: '6px',
        border: '1px solid #f1f5f9',
    },
    notifRight: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexShrink: 0,
    },
    dateText: {
        display: 'flex',
        alignItems: 'center',
        fontSize: '12px',
        color: '#94a3b8',
    },
    emptyCard: {
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        padding: '40px',
        textAlign: 'center',
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)',
    },
    emptyText: {
        fontSize: '14px',
        color: '#64748b',
        margin: 0,
    },
    alertError: {
        backgroundColor: '#fef2f2',
        color: '#991b1b',
        padding: '12px 16px',
        borderRadius: '8px',
        fontSize: '13px',
        marginBottom: '16px',
        border: '1px solid #fecaca',
    },
};

export default Notification;