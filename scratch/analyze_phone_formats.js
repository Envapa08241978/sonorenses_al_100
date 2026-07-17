const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

async function main() {
    // 1. Read all contacts from the Firestore fetch in find_unsent_contacts or just read our generated Excel Report
    const workbook = XLSX.readFile('Reporte_Envio_Asamblea_Errores.xlsx');
    const sheet = workbook.Sheets['Pendientes y Fallidos'];
    const unsentList = XLSX.utils.sheet_to_json(sheet);
    
    console.log(`Loaded ${unsentList.length} pending contacts from previous report.`);

    const formattingIssues = [];

    unsentList.forEach(c => {
        const name = c["Nombre"] || "Sin Nombre";
        const phoneRaw = String(c["Teléfono"] || "");
        const clean = phoneRaw.replace(/\D/g, ''); // keep only digits

        let issue = null;
        if (!clean) {
            issue = "Teléfono vacío o sin dígitos";
        } else if (clean.length < 10) {
            issue = `Demasiado corto: tiene ${clean.length} dígitos (debe tener mínimo 10)`;
        } else if (clean.length === 10) {
            // Standard Mexican number, should be OK
        } else if (clean.length === 11) {
            // Mexican mobile with dial code prefix 1 (e.g. 1 662...) or incorrect digits
            if (clean.startsWith('1')) {
                // Wait, if it's 1 + 10 digits, it's 11 digits
            } else {
                issue = `Longitud inusual: 11 dígitos (no inicia con 1)`;
            }
        } else if (clean.length === 12) {
            // Should be 52 + 10 digits
            if (!clean.startsWith('52')) {
                issue = `12 dígitos pero no inicia con código de país 52`;
            }
        } else if (clean.length === 13) {
            // Should be 521 + 10 digits
            if (!clean.startsWith('521')) {
                issue = `13 dígitos pero no inicia con 521`;
            }
        } else {
            issue = `Demasiado largo: ${clean.length} dígitos`;
        }

        // Additional checks: check for repeated digits like 0000000000 or 1234567890 (common dummy values)
        if (!issue && clean.length >= 10) {
            const tenDigits = clean.substring(clean.length - 10);
            if (/^(\d)\1{9}$/.test(tenDigits)) {
                issue = `Número falso (dígitos repetidos: ${tenDigits})`;
            } else if (tenDigits === "1234567890") {
                issue = `Número de prueba secuencial (${tenDigits})`;
            }
        }

        if (issue) {
            formattingIssues.push({
                "ID Contacto": c["ID Contacto"],
                "Nombre": name,
                "Teléfono Original": phoneRaw,
                "Teléfono Limpio": clean,
                "Detalle de Error": issue,
                "Seccional": c["Seccional"] || "N/A",
                "Colonia": c["Colonia"] || "N/A"
            });
        }
    });

    console.log(`Found ${formattingIssues.length} contacts with obvious phone formatting issues.`);

    // Export formatting issues to Excel
    const wb = XLSX.utils.book_new();
    const wsIssues = XLSX.utils.json_to_sheet(formattingIssues);
    XLSX.utils.book_append_sheet(wb, wsIssues, "Errores de Formato");
    
    const outputPath = 'Reporte_Errores_Formato_Telefono.xlsx';
    XLSX.writeFile(wb, outputPath);
    console.log(`Saved format errors report to ${outputPath}`);
}

main().catch(console.error);
