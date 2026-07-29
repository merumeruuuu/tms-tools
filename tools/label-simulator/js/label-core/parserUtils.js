export const getBcType = (raw) => {
    let t = raw.toUpperCase();
    if (t.includes('BX') || t === 'D') return 'DM';
    if (t.includes('B0') || t === 'A') return 'AZ';
    if (t.includes('BQ') || t === 'Q') return 'QR';
    if (t.includes('BU')) return 'UPCA';
    if (t.includes('BC')) return 'C128';
    if (t.includes('B2')) return 'ITF';
    return 'UNK';
};

export const extractZplBlocks = (rawCode, targetW, targetH) => {
    let zplBlocks = rawCode.match(/\^XA[\s\S]*?\^XZ/gi) || [];
    let printableBlocks = zplBlocks.filter(block => block.match(/\^FD|\^B[A-Z0-9]/i));
    return printableBlocks.map(block => {
        let cleanBlock = block.replace(/^\^XA/i, '').replace(/\^XZ[\s\S]*/i, '').trim();
        cleanBlock = cleanBlock.replace(/\^PW\d+/gi, '').replace(/\^LL\d+/gi, '');
        return `^XA\n^PW${targetW}\n^LL${targetH}\n${cleanBlock}\n^XZ`;
    });
};

export const formatRawLabelCode = (raw) => {
    let val = raw.trim();
    if (!val) return val;
    
    if (/\^XA/i.test(val)) {
        // Fix mashed ZPL
        val = val.replace(/(\^XA|\^FS|\^XZ)(?!\r?\n)/gi, '$1\n');
    } else {
        // Fix mashed EPL line-by-line
        let lines = val.split(/\r?\n/);
        let formatted = [];
        for (let line of lines) {
            line = line.trim();
            // If a line is abnormally long and has spaces outside quotes, un-mash it
            if (line.length > 30 && / +(?=(?:(?:[^"]*"){2})*[^"]*$)/.test(line)) {
                let unmashed = line.replace(/ +(?=(?:(?:[^"]*"){2})*[^"]*$)/g, '\n');
                formatted.push(unmashed);
            } else {
                formatted.push(line);
            }
        }
        val = formatted.join('\n').split(/\r?\n/).map(line => line.trim()).filter(line => line).join('\n');
    }
    return val;
};