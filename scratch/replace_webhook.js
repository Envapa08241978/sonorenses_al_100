const fs = require('fs');

const filePath = 'app/api/whatsapp/webhook/route.ts';
let content = fs.readFileSync(filePath, 'utf8');

// We split by lines
const lines = content.split(/\r?\n/);
const outputLines = [];

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('El gran Torneo de Dominadas de nuestro Senador Heriberto Aguilar') && line.includes('mañana sábado 13 de junio')) {
        // Detect indentation
        const matchIndent = line.match(/^(\s*)/);
        const indent = matchIndent ? matchIndent[1] : '';
        
        // Construct replacement block with matching indentation
        const replacement = [
            `const msgLower = (messageDoc.body || '').toLowerCase();`,
            `if (msgLower.includes('lamarque') || msgLower.includes('obregon') || msgLower.includes('obregón') || msgLower.includes('itson') || msgLower.includes('asamblea') || msgLower.includes('20')) {`,
            `    replyText = \`¡Hola, \${firstName}! La Asamblea Informativa "Así Gobierna la 4T en Sonora" con el invitado especial Javier Lamarque Cano se llevará a cabo el sábado 20 de junio a las 10:00 AM en la Arena ITSON, en Ciudad Obregón. ¡Te esperamos! 🏛️✨\`;`,
            `} else {`,
            `    replyText = \`¡Hola, \${firstName}! El gran Torneo de Dominadas de nuestro Senador Heriberto Aguilar se llevó a cabo el sábado 13 de junio. Tenemos 3 sedes en Guaymas: Fátima (11:00 AM), Centinela (4:00 PM) y Guaymas Norte (6:00 PM). Los requisitos son copia de acta de nacimiento del menor, copia del INE del tutor y la carta responsiva firmada. ¡Te esperamos! ⚽🏆\`;`,
            `}`
        ].map(l => indent + l).join('\n');
        
        outputLines.push(replacement);
    } else {
        outputLines.push(line);
    }
}

// Preserve original line endings (CRLF or LF)
const hasCRLF = content.includes('\r\n');
fs.writeFileSync(filePath, outputLines.join(hasCRLF ? '\r\n' : '\n'), 'utf8');
console.log('Successfully updated all remaining fallback occurrences!');
