import fs from 'fs';

const content = fs.readFileSync('c:/Users/ENRIQ/SISTEMA DE VOTANTES PARA EL ESTADO de SONORA/app/registro-dashboard/page.tsx', 'utf8');

let curly = 0;
let paren = 0;
let bracket = 0;

for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (char === '{') curly++;
    if (char === '}') curly--;
    if (char === '(') paren++;
    if (char === ')') paren--;
    if (char === '[') bracket++;
    if (char === ']') bracket--;
}

console.log(`Curly: ${curly}, Paren: ${paren}, Bracket: ${bracket}`);
