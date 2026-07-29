// label-core/demoTemplates.js

export function getMilkBankTemplate(bankName, ctx) {
    const {
        demoSettings,
        displayId,
        milkType, // 🚀 NEW: Extracted from context
        currentSerial,
        barcodePayload,
        safeBankName,
        trunc,
        d,
        months
    } = ctx;

    let zplCode = '';

    if (bankName === "The New York Milk Bankn Inc." || bankName === "The New York Milk Bank") {
        const humanDate = `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
        zplCode += `D10\r\n` +
                   `q406\r\n` +
                   `Q203,024\r\n` +
                   `N\r\n` +
                   `;TMS_DEMO\r\n` +
                   `A15,2,0,2,0,0,N,"${safeBankName}        64"\r\n` +
                   `b20,30,A,d3,"${barcodePayload}"\r\n` +
                   `A140,35,0,3,0,0,N,"${displayId}-${parseInt(currentSerial)}"\r\n` + // 🚀 Mapped dynamic Batch Number
                   `A140,65,0,2,0,0,N,"Type: ${milkType}"\r\n` + // 🚀 Injected Milk Type
                   `A140,85,0,2,0,0,N,"Cal/Oz: ${demoSettings.calories}"\r\n` +
                   `A25,122,0,2,0,0,N,"EXP: ${humanDate}"\r\n` +
                   `A25,147,0,2,0,0,N,"Volume: ${parseFloat(demoSettings.volume).toFixed(2)}mL"\r\n` +
                   `A25,172,0,2,0,0,N,"2.40 g/dL Protein"\r\n` +
                   `P1\r\n\r\n`;

    } else if (bankName === "Mothers' Milk Bank of Alabama" || bankName === "MMBAL") {
        const mmbalDate = `${months[d.getMonth()]}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
        zplCode += `D10\r\n` +
                   `q406\r\n` +
                   `Q203,024\r\n` +
                   `N\r\n` +
                   `;TMS_DEMO\r\n` +
                   `A15,10,0,2,1,1,N,"MMBAL"\r\n` +
                   `A280,10,0,2,1,1,N,"19"\r\n` +
                   `b15,35,A,d3,"${barcodePayload}"\r\n` +
                   `A140,35,0,3,1,1,N,"${displayId}-${parseInt(currentSerial)}"\r\n` +
                   `A140,65,0,2,1,1,N,"Type: ${milkType}"\r\n` + // 🚀 Injected Milk Type
                   `A140,90,0,3,1,1,N,"${demoSettings.calories} Cals/Oz"\r\n` +
                   `A15,135,0,2,1,1,N,"EXP:  ${mmbalDate}"\r\n` +
                   `A15,160,0,2,1,1,N,"Volume:  ${Math.round(demoSettings.volume)}mL"\r\n` +
                   `A15,185,0,2,1,1,N,"0.86 g/dL Protein"\r\n` +
                   `P1\r\n\r\n`;

    } else if (bankName === "Mothers' Milk Bank of Louisiana" || bankName === "MMB of Louisiana") {
        // 🚀 Now respects the exact user input for Batch Number instead of forcing a "DEP000" prefix
        const depId = displayId; 
        const mmddyyyy = `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
        const donorName = demoSettings.productName ? trunc(demoSettings.productName, 32) : "Timeless, Donor";
        const displayOz = parseFloat(demoSettings.volume).toFixed(2);

        zplCode += `D10\r\n` +
                   `ZB\r\n` +
                   `q406\r\n` +
                   `Q203,024\r\n` +
                   `N\r\n` +
                   `;TMS_DEMO\r\n` +
                   `A25,8,0,2,0,0,N,"MMB of Louisiana"\r\n` +
                   `b44,36,A,d4,"${depId}"\r\n` +
                   `A105,43,0,2,0,0,N,"${depId}"\r\n` +
                   `A105,70,0,2,0,0,N,"${displayOz} oz"\r\n` +
                   `A25,106,0,2,0,0,N,"EXP : "\r\n` +
                   `A105,106,0,2,0,0,N,"${mmddyyyy}"\r\n` +
                   `A25,133,0,2,0,0,N,"${donorName}"\r\n` +
                   `A25,158,0,2,0,0,N,"Type: ${milkType}"\r\n` + // 🚀 Injected Milk Type
                   `P1\r\n\r\n`;

    } else if (bankName === "Mother's Milk Bank of South Carolina" || bankName === "MMBSC") {
        // 🚀 Now respects the exact user input for Batch Number
        const depId = displayId;
        const mmddyyyy = `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
        const donorName = demoSettings.productName ? trunc(demoSettings.productName, 32) : "Test Donor, Timeless";
        const displayOz = parseFloat(demoSettings.volume).toFixed(2);

        zplCode += `D10\r\n` +
                   `q406\r\n` +
                   `Q203,024\r\n` +
                   `N\r\n` +
                   `;TMS_DEMO\r\n` +
                   `A15,2,0,2,0,0,N,"MMBSC"\r\n` +
                   `b20,30,A,d3,"${depId}"\r\n` +
                   `A140,40,0,3,0,0,N,"${depId}"\r\n` +
                   `A140,75,0,3,0,0,N,"${displayOz} oz"\r\n` +
                   `A25,100,0,2,0,0,N,"EXP: ${mmddyyyy}"\r\n` +
                   `A25,125,0,2,0,0,N,"MMB of South Carolina"\r\n` +
                   `A25,150,0,2,0,0,N,"${donorName}"\r\n` +
                   `A25,175,0,2,0,0,N,"Type: ${milkType}"\r\n` + // 🚀 Injected Milk Type
                   `P1\r\n\r\n`;

    } else if (bankName === "Rogers Hixon Ontario Human Milk Bank" || bankName === "Rogers Hixon") {
        const rhDate = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
        const rhVol = parseFloat(demoSettings.volume).toFixed(2);
        const rhCal = parseFloat(demoSettings.calories).toFixed(2);

        zplCode += `^XA\n` +
                   `^FX_TMS_DEMO^FS\n` +
                   ` ^PON ^PW609 ^LL203 ^CFA,15^FO103,80^FD${displayId}-${parseInt(currentSerial)}^FS\n` +
                   ` ^CFA,15^FO153,250^FDExpiry:^FS\n` +
                   ` ^CFA,15^FO25,190^FDVolume:^FS\n` +
                   ` ^CFA,15^FO25,35^FDRogers Hixon Ontario Human Milk Bank^FS\n` +
                   ` ^FO34,65^B0N,3^FD${barcodePayload}^FS\n` +
                   ` ^CFA,15^FO243,250^FD${rhDate}^FS\n` +
                   ` ^CFA,15^FO126,190^FD${rhVol}^FS\n` +
                   ` ^CFA,15^FO25,160^FDLait Maternal Pasteurizde^FS\n` +
                   ` ^CFA,15^FO25,132^FDPasteurized Donor Human Milk^FS\n` +
                   ` ^CFA,15^FO219,190^FDCal/oz:^FS\n` +
                   ` ^CFA,15^FO315,190^FD${rhCal}^FS\n` +
                   ` ^CFA,15^FO373,190^FDg/dL Protein:^FS\n` +
                   ` ^CFA,15^FO518,190^FD-^FS\n` +
                   ` ^CFA,15^FO25,220^FDMilk Type:^FS\n` +
                   ` ^CFA,15^FO147,220^FD${milkType}^FS\n` + // 🚀 Replaced "Unknown" with user input
                   ` ^CFA,15^FO25,250^FDKEEP FROZEN^FS\n` +
                   ` ^XZ\n\n`;

    } else if (bankName === "Mothers Milk Bank, North Texas" || bankName === "MMBNT") {
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const yyyy = d.getFullYear();
        const ntDate = `${mm}/${dd}/${yyyy}`;
        
        const ntVol = parseFloat(demoSettings.volume).toFixed(0);
        const ntCal = parseFloat(demoSettings.calories).toFixed(0);
        
        const labelCountStr = String(parseInt(currentSerial)).padStart(2, '0'); 

        zplCode += `^XA\n` +
                   `^FX_TMS_DEMO^FS\n` +
                   `^POR ^PW203 ^LL203\n` +
                   `^CF0,25^FO10,10^FDMMBNT^FS\n` +
                   `^CF0,20^FO192,7^FD${labelCountStr}^FS\n` +
                   `^FO10,35^B0N,3^FD${barcodePayload}^FS\n` +
                   `^CF0,20^FO125,39^FD${displayId}-${parseInt(currentSerial)}^FS\n` +
                   `^CF0,20^FO125,67^FDType: ${milkType}^FS\n` + // 🚀 Filled in empty Milk Type field
                   `^CF0,20^FO125,95^FD${ntCal} Cal/Oz^FS\n` +
                   `^CF0,20^FO10,122^FDEXP:^FS\n` +
                   `^CF0,20^FO125,122^FD${ntDate}^FS\n` +
                   `^CF0,20^FO10,149^FDVolume:^FS\n` +
                   `^CF0,20^FO125,149^FD${ntVol} mL^FS\n` +
                   `^CF0,20^FO10,173^FD0.00 g/dL Protein^FS\n` +
                   `^XZ\n\n`;

    } else if (bankName.includes("San Jose") || bankName.includes("California")) {
        
        // Exact layout matching the physical printed sample

        const sjDate = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}-${d.getFullYear()}`;
        const oz = Math.round(parseFloat(demoSettings.volume) / 29.5735); // Convert mL input to display oz
        const calFormatted = parseFloat(demoSettings.calories).toFixed(1); // Forces 1 decimal place (e.g. 21.9)

        zplCode += `^XA\n` +
                   `^FX_TMS_DEMO^FS\n` +
                   `^FO0,0^GB496,25,40^FS\n` +
                   `^FO40,14^A0N,20,20^FR^FDPasteurized Donor Human Milk^FS\n` + // ^FR forces reverse-video (white text on black box)
                   `^FO15,45^A0N,20,20^FDBatch: ${displayId}^FS\n` +
                   `^FO15,68^A0N,20,20^FDBottle: ${String(currentSerial).padStart(3, '0')}^FS\n` +
                   `^FO15,91^A0N,20,20^FDGrade: ${milkType}^FS\n` +
                   `^FO15,114^A0N,20,20^FDSize: ${oz}oz^FS\n` +
                   `^FO15,137^A0N,22,22^FDEXP: ${sjDate}^FS\n` +
                   `^FO15,165^A0N,18,18^FDMothers' Milk Bank California^FS\n` +
                   `^FO15,183^A0N,18,18^FD1887 Monterey Rd.^FS\n` +
                   `^FO15,201^A0N,18,18^FDStes 105-110^FS\n` +
                   `^FO15,219^A0N,18,18^FDSan Jose, CA 95112^FS\n` +
                   `^FO215,65^GB80,48,2^FS\n` + // Draw outer calorie box
                   `^FO215,89^GB80,0,2^FS\n` + // Draw horizontal calorie divider
                   `^FO225,70^A0N,18,18^FDCalorie^FS\n` +
                   `^FO230,94^A0N,20,20^FD${calFormatted}^FS\n` +
                   `^FO300,50^BQN,2,3.5^FDQA,${barcodePayload}^FS\n` + // Draw the QR code
                   `^XZ\n\n`;

    } else {
        // Default Template
        const humanDate = `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
        zplCode += `D10\r\n` +
                   `ZT\r\n` +
                   `q406\r\n` +
                   `Q203,024\r\n` +
                   `N\r\n` +
                   `;TMS_DEMO\r\n` +
                   `A15,2,0,2,0,0,N,"${safeBankName}"\r\n` +
                   `b15,25,A,d3,"${barcodePayload}"\r\n` +
                   `A110,26,0,3,0,0,N,"${displayId}"\r\n` +
                   `A15,105,0,2,0,0,N,"EXP: ${humanDate}"\r\n` +
                   `A15,125,0,2,0,0,N,"Volume: ${demoSettings.volume}mL"\r\n` +
                   `A15,145,0,2,0,0,N,"Calories: ${demoSettings.calories} Cal/Oz"\r\n` +
                   `A15,165,0,2,0,0,N,"Type: ${milkType}"\r\n` + // 🚀 Added Milk Type to generic template
                   `A330,170,0,2,0,0,N,"${currentSerial}"\r\n` +
                   `P1\r\n\r\n`;
    }

    return zplCode;
}