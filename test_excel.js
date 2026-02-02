import * as XLSX from 'xlsx';

try {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet([{ "Test": "Success" }]);
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    // Just test if we can create the object, don't write to disk to avoid clutter
    console.log("XLSX library loaded and workbook created successfully.");
} catch (e) {
    console.error("XLSX Error:", e);
}
