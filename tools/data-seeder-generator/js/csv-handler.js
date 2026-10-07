/**
 * CSV Handler
 * Parses client-formatted CSV files and strictly maps them to the TMS internal schema
 */

class CsvHandler {
    constructor() {
        // Exact headers from the CHKD Product List export + 'Action' column
        this.headers = [
            'Action',
            'Item Name',
            'ShortName',
            'HL7 Reference',
            'Manufacturer Description',
            'Supports Direct Scanning',
            'Type',
            'Category',
            'Measurement Unit',
            'Open Expiration Date (Hours)',
            'Base Caloric Value',
            'Displacement',
            'Can Be Base',
            'Can Be Fortifier',
            'Water Displacement',
            'Breast milk Displacement',
            'Cal Per Oz',
            'Cal Per Gram',
            'Expiration Hour (after Prepare)',
            'Product Code (Item Number)',
            'Form Factor Barcode',
            'Form Factor Unit Quantity',
            'Form Factor UOM',
            'Form Factor Measurement Vol',
            'Form Factors'
        ];
    }

    /**
     * Generate CSV template matching the client's native format
     */
    generateTemplate() {
        const headerRow = this.headers.join(',');
        
        // Example row demonstrating proper quoting for text and newlines
        const exampleRow = [
            'create',                            // Action
            '"Similac Special Care 24"',         // Item Name
            '"SSC 24"',                          // ShortName
            '"SIM-SC-24"',                       // HL7 Reference
            '"Abbott Nutrition"',                // Manufacturer Description
            '1',                                 // Supports Direct Scanning
            '"Ready to Feed Liquid"',            // Type
            '"Formula"',                         // Category
            '"ml"',                              // Measurement Unit
            '48',                                // Open Expiration Date (Hours)
            '24',                                // Base Caloric Value
            '1.0',                               // Displacement
            '1',                                 // Can Be Base
            '0',                                 // Can Be Fortifier
            '0',                                 // Water Displacement
            '0',                                 // Breast milk Displacement
            '24',                                // Cal Per Oz
            '0',                                 // Cal Per Gram
            '48',                                // Expiration Hour (after Prepare)
            '"64758"',                           // Product Code (Item Number)
            '"070074647589"',                    // Form Factor Barcode
            '48',                                // Form Factor Unit Quantity
            '"ml"',                              // Form Factor UOM
            '59',                                // Form Factor Measurement Vol
            '"Case[] (48)\n59mL Bottle[] (1)"'   // Form Factors (Note the quoted newline)
        ].join(',');

        return headerRow + '\n' + exampleRow;
    }

    downloadTemplate() {
        const csv = this.generateTemplate();
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'tms-seeder-template.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    parseFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const csv = e.target.result;
                    const data = this.parseCsv(csv);
                    resolve(data);
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    parseCsv(csv) {
        // Advanced split: only split on newlines that are OUTSIDE of quotes
        const lines = [];
        let currentLine = '';
        let insideQuotes = false;

        for (let i = 0; i < csv.length; i++) {
            const char = csv[i];
            if (char === '"') {
                insideQuotes = !insideQuotes;
            }
            
            if ((char === '\n' || char === '\r') && !insideQuotes) {
                if (currentLine.trim()) {
                    lines.push(currentLine);
                }
                currentLine = '';
                if (char === '\r' && csv[i + 1] === '\n') {
                    i++;
                }
            } else {
                currentLine += char;
            }
        }
        if (currentLine.trim()) lines.push(currentLine);

        if (lines.length < 2) throw new Error("CSV file is empty or missing data rows.");

        const rawHeaders = this.parseCsvLine(lines[0]).map(h => h.trim().toLowerCase());
        const products = [];
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (!line.trim()) continue;

            const values = this.parseCsvLine(line);
            
            const getVal = (colName) => {
                const index = rawHeaders.indexOf(colName.toLowerCase());
                let val = index !== -1 && values[index] ? values[index].trim() : '';
                return val.toLowerCase() === 'nan' || val.toLowerCase() === 'na' ? '' : val;
            };

            const rawAction = getVal('Action').toLowerCase();
            const action = rawAction || 'create'; 
            const itemName = getVal('Item Name');

            if (!itemName) continue; 

            let typeId = 1; 
            const rawType = getVal('Type').toLowerCase();
            if (rawType.includes('powder')) typeId = 3;
            else if (rawType.includes('concentrate')) typeId = 2;

            let catId = 3; 
            const rawCat = getVal('Category').toLowerCase();
            if (rawCat.includes('additive') || rawCat.includes('fortifier')) catId = 5;
            else if (rawCat.includes('ebm')) catId = 1;
            else if (rawCat.includes('dhm')) catId = 2;

            const canBeBase = parseInt(getVal('Can Be Base')) || 0;
            const canBeFortifier = parseInt(getVal('Can Be Fortifier')) || 0;
            let productUse = 'base';
            if (canBeFortifier && !canBeBase) productUse = 'fortifier';
            if (catId === 5 && !canBeFortifier) productUse = 'modular';

            const containerVol = parseFloat(getVal('Form Factor Measurement Vol')) || 0;

            let containerId = 1; 
            if (containerVol > 200 && typeId === 3) containerId = 3; 
            if (getVal('Measurement Unit').toLowerCase() === 'g' && containerVol < 50) containerId = 6; 

            // NEW: Parse the Form Factors column into the hierarchy array
            const rawFormFactors = getVal('Form Factors');
            const hierarchy = [];

            if (rawFormFactors) {
                const ffLines = rawFormFactors.split('\n').map(l => l.trim()).filter(Boolean);
                for (let j = 0; j < ffLines.length; j++) {
                    const ffLine = ffLines[j];
                    
                    let cid = ''; // UPDATED: Default to blank to trigger the yellow warning highlight
                    const lowerLine = ffLine.toLowerCase();
                    
                    if (lowerLine.includes('bottle')) cid = '1';
                    else if (lowerLine.includes('carton')) cid = '2';
                    else if (lowerLine.includes('can')) cid = '3';
                    else if (lowerLine.includes('case')) cid = '4';
                    else if (lowerLine.includes('packet')) cid = '6';
                    else if (lowerLine.includes('tetra')) cid = '10';

                    // Extract barcode from brackets []
                    const bcMatch = ffLine.match(/\[(.*?)\]/);
                    const bc = bcMatch && bcMatch[1] ? bcMatch[1].trim() : '';

                    // Extract quantity from parentheses ()
                    const qtyMatch = ffLine.match(/\((\d+)\)/);
                    const qty = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;

                    // Assign base volume to the innermost unit (the last one in the string), and 0 to outer containers
                    const vol = (j === ffLines.length - 1) ? containerVol : 0;

                    hierarchy.push({
                        containerId: cid,
                        barcode: bc,
                        quantity: qty,
                        volume: vol
                    });
                }
                // Reverse the array so the innermost container is at index 0, matching the Word Doc parser
                hierarchy.reverse();
            }

            // Fallback for simple flat CSVs without a Form Factors column
            if (hierarchy.length === 0) {
                hierarchy.push({
                    containerId: containerId,
                    barcode: getVal('Form Factor Barcode'),
                    quantity: parseInt(getVal('Form Factor Unit Quantity')) || 1,
                    volume: containerVol
                });
            }

            products.push({
                action: action,
                manufacturer: getVal('Manufacturer Description'),
                productName: itemName,
                shortName: getVal('ShortName') || itemName,
                productCode: getVal('Product Code (Item Number)'),
                barcode: getVal('Form Factor Barcode'),
                hl7Reference: getVal('HL7 Reference'),
                hl7Fortifier: '', 
                productType: typeId,
                productUse: productUse,
                categoryId: catId,
                caloricValue: parseFloat(getVal('Base Caloric Value')) || 20,
                displacement: parseFloat(getVal('Displacement')) || 1.0,
                expirationOpened: parseInt(getVal('Open Expiration Date (Hours)')) || 48,
                expirationPrepared: parseInt(getVal('Expiration Hour (after Prepare)')) || 48,
                containerType: containerId,
                unitQuantity: parseInt(getVal('Form Factor Unit Quantity')) || 1,
                measurementVolume: containerVol,
                measurementUnit: getVal('Measurement Unit') || 'ml',
                hierarchy: hierarchy, // <-- Hierarchy added here!
                updateFields: action === 'update' ? this.detectUpdateFields(rawHeaders, getVal) : []
            });
        }

        return products;
    }

    /**
     * Determines which fields the user wants to update by checking which columns are populated
     */
    detectUpdateFields(rawHeaders, getVal) {
        const fields = [];
        if (getVal('Manufacturer Description')) fields.push('manufacturer');
        if (getVal('ShortName')) fields.push('shortName');
        if (getVal('HL7 Reference')) fields.push('hl7Reference');
        if (getVal('Base Caloric Value')) fields.push('caloricValue');
        if (getVal('Displacement')) fields.push('displacement');
        if (getVal('Open Expiration Date (Hours)')) fields.push('expirationOpened');
        if (getVal('Expiration Hour (after Prepare)')) fields.push('expirationPrepared');
        if (getVal('Form Factor Unit Quantity')) fields.push('unitQuantity');
        if (getVal('Form Factor Measurement Vol')) fields.push('measurementVolume');
        if (getVal('Type')) fields.push('productType');
        if (getVal('Category')) fields.push('categoryId');
        if (getVal('Can Be Base') || getVal('Can Be Fortifier')) fields.push('productUse');
        return fields;
    }

    /**
     * Standard CSV line parser handling embedded commas and quotes
     */
    parseCsvLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];

            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    current += '"';
                    i++; // skip escaped quote
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current);
        return result;
    }
}

// Export singleton instance
const csvHandler = new CsvHandler();