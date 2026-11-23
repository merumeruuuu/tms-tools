// label-core/renderEngine.js
import { getBcType, extractZplBlocks } from './parserUtils.js';
import { sizeOffsets } from './configs.js';

export function createRenderEngine({
    watch,
    settings,
    activePrinterConfig,
    calibratedDots,
    validationErrors,
    isListView,
    selectedFiles,
    selectedTmsUrl,
    calibrationRules,
    isCalibrationMode,
    isCurrentLabelDemo,
    isDeveloperMode,
    renderedLabels,
    qzConnected,
    qzPrinters,
    selectedPrinter,
    activeSignaturesForSaving,
    zplCache,
    engineState,
    getCombinedListCode,
    getCalibrationRule,
    syncUiToSignature,
    checkSizeLimits
}) {
        const renderLabelLocally = (eplBlock, dotsW, dotsH, isDemoLabelActive) => {
            const canvas = document.createElement('canvas');
            canvas.width = dotsW; canvas.height = dotsH;
            const ctx = canvas.getContext('2d');
            
            ctx.imageSmoothingEnabled = false;
            ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, dotsW, dotsH);
            ctx.fillStyle = '#000000'; ctx.textBaseline = 'top';
            
            const lines = eplBlock.split(/\r?\n/);
            const isDemoLabel = isDemoLabelActive || eplBlock.includes(';TMS_DEMO');

            //  1. PRE-SCAN: Measure Aztec and DataMatrix INDEPENDENTLY
            let isWideLabel = false;
            let maxAztecDataLen = 0; 
            let maxDataMatrixLen = 0; 

            for (let line of lines) {
                let t = line.trim().toLowerCase();
                if (t.startsWith('q')) {
                    let qVal = parseInt(t.substring(1));
                    if (qVal > 600) isWideLabel = true;
                }
                if (t.startsWith('b')) {
                    let p = line.split(',');
                    let type = p[2] ? p[2].replace(/"/g,'').toUpperCase() : '';
                    
                    if (type === 'A' || type === 'D') {
                        let firstQuote = line.indexOf('"'); 
                        let lastQuote = line.lastIndexOf('"');
                        if (firstQuote !== -1 && lastQuote !== -1) {
                            let len = lastQuote - firstQuote - 1;
                            if (type === 'A' && len > maxAztecDataLen) maxAztecDataLen = len;
                            if (type === 'D' && len > maxDataMatrixLen) maxDataMatrixLen = len;
                        }
                    }
                }
            }

            //  2. CALCULATE DYNAMIC EPL
            let textScaleOffset = 0;
            let textSpacingOffset = 0;
            let detectedLayer = 1; 
            let is300Dpi = settings.value.density === '12'; 

            let prePassSig = null; 
            let hardwareRuleSig = null;
            
            //  NEW: Auto-capture font sizes & handle text-only labels
            let hasBarcode = false;
            for (let line of lines) {
                let trimmed = line.trim();
                if (trimmed.startsWith('b')) {
                    hasBarcode = true;
                    let p = trimmed.split(',');
                    let bcType = getBcType(p[2] ? p[2].replace(/"/g,'').toUpperCase() : '');
                    let sig = `${isDemoLabel ? 'DEMO_' : ''}EPL_${bcType}_${parseInt(p[0].substring(1))}_${parseInt(p[1])}`; 
                    
                    let fontMatches = eplBlock.match(/,0,([a-zA-Z0-9]+),0,/g);
                    if (fontMatches) {
                        let fonts = fontMatches.map(m => m.split(',')[2]);
                        let uniqueFonts = [...new Set(fonts)].sort().join('');
                        if (uniqueFonts) sig += '_F' + uniqueFonts;
                    }

                    if (!prePassSig) prePassSig = sig; 
                    let checkRule = getCalibrationRule(sig);
                    if (checkRule && checkRule.labelSize) hardwareRuleSig = sig; 
                    activeSignaturesForSaving.add(sig);
                }
            }

            if (!hasBarcode) {
                let sig = `${isDemoLabel ? 'DEMO_' : ''}EPL_TEXTONLY`;
                let fontMatches = eplBlock.match(/,0,([a-zA-Z0-9]+),0,/g);
                if (fontMatches) {
                    let fonts = fontMatches.map(m => m.split(',')[2]);
                    let uniqueFonts = [...new Set(fonts)].sort().join('');
                    if (uniqueFonts) sig += '_F' + uniqueFonts;
                }
                if (!prePassSig) prePassSig = sig;
                let checkRule = getCalibrationRule(sig);
                if (checkRule && checkRule.labelSize) hardwareRuleSig = sig;
                activeSignaturesForSaving.add(sig);
            }
            
            let finalSigToSync = hardwareRuleSig || prePassSig;
            if (finalSigToSync && !engineState.primaryEplSignature) { engineState.primaryEplSignature = finalSigToSync; syncUiToSignature(finalSigToSync); }

            let savedRule = getCalibrationRule(finalSigToSync);
            let isPrimary = (!isListView.value || selectedFiles.value.length <= 1);
            let isBcPrimary = isPrimary || finalSigToSync === engineState.primaryEplSignature;

            //  EPL HARDWARE CENTERING (VIRTUAL DISPLAY OVERRIDE)
            let hwOffsetX = 0;
            let hwOffsetY = 0;

            if (settings.value.isHardwareCenteringActive) {
                let explicitQWidth = dotsW;
                let explicitQHeight = dotsH;
                
                for (let line of lines) {
                    let t = line.trim();
                    if (t.startsWith('q')) {
                        let parsed = parseInt(t.substring(1));
                        if (parsed > 0) explicitQWidth = parsed;
                    }
                    if (t.toUpperCase().startsWith('Q')) {
                        let parsed = parseInt(t.substring(1).split(',')[0]);
                        if (parsed > 0) explicitQHeight = parsed;
                    }
                }
                
                let diffX = dotsW - explicitQWidth;
                let diffY = dotsH - explicitQHeight;

                let isAnomalyLabel = (explicitQWidth >= 810 && explicitQWidth <= 815) && (dotsW >= 708 && dotsW <= 712);

                if (isAnomalyLabel) {
                    let myVirtualTweakX = 30; 
                    let myVirtualTweakY = -2; 

                    hwOffsetX = Math.floor(diffX / 2) + myVirtualTweakX;
                    hwOffsetY = (diffY < 0 ? diffY : Math.floor(diffY / 2)) + myVirtualTweakY;
                } 
            } 

            // Combine hardware baseline with UI sliders
            let globalX = (isBcPrimary ? parseInt(settings.value.offsetX || 0) : (savedRule ? parseInt(savedRule.offsetX || 0) : 0)) + hwOffsetX;
            let globalY = (isBcPrimary ? parseInt(settings.value.offsetY || 0) : (savedRule ? parseInt(savedRule.offsetY || 0) : 0)) + hwOffsetY;

            let tFont = isBcPrimary ? (settings.value.font || '') : (savedRule ? (savedRule.font || '') : '');
            let customFont = tFont ? `"${tFont}", ` : '';

            // ==========================================================
            // HELPER: BARCODE PARSING
            // ==========================================================
            const drawEplBarcode = (line, offsetX, offsetY) => {
                const firstQuote = line.indexOf('"'); 
                const lastQuote = line.lastIndexOf('"');
                if (firstQuote === -1 || lastQuote === -1) return;

                const data = line.substring(firstQuote + 1, lastQuote);
                const params = line.substring(1, firstQuote).split(',');
                
                let x = parseInt(params[0]) || 0; 
                let y = parseInt(params[1]) || 0; 
                const type = params[2] ? params[2].toUpperCase() : ''; 
                
                let bcid = 'datamatrix'; 
                if (type === 'Q') bcid = 'qrcode'; 
                else if (type === 'P') bcid = 'pdf417'; 
                else if (type === 'A') bcid = 'azteccode'; 
                else if (type === 'D') bcid = 'datamatrix'; 

                let parsedVal = 3; 

                if (bcid === 'azteccode' || bcid === 'datamatrix' || bcid === 'qrcode') {
                    for (let j = 3; j < params.length; j++) {
                        let p = params[j].trim().toLowerCase();
                        let match = p.match(/^[a-z](\d+(?:\.\d+)?)$/);
                        if (match) {
                            let val = parseFloat(match[1]);
                            if (val > 0) parsedVal = val;
                        }
                    }
                }

                let sig = `${isDemoLabel ? 'DEMO_' : ''}EPL_${getBcType(type)}_${x}_${y}`; 
                
                let fontMatches = eplBlock.match(/,0,([a-zA-Z0-9]+),0,/g);
                if (fontMatches) {
                    let fonts = fontMatches.map(m => m.split(',')[2]);
                    let uniqueFonts = [...new Set(fonts)].sort().join('');
                    if (uniqueFonts) sig += '_F' + uniqueFonts;
                }

                let thisSavedRule = getCalibrationRule(sig);
                let thisIsBcPrimary = isPrimary || sig === engineState.primaryEplSignature;

                let tDm = 0; 
                let tX = 0; 
                let tY = 0;
                let globalMasterX = 0;
                let globalMasterY = 0;

                // ONLY calculate and apply offsets if it is specifically a DataMatrix
                if (bcid === 'datamatrix') {
                    tDm = thisIsBcPrimary ? parseFloat(settings.value.dmOffset || 0) : (thisSavedRule ? parseFloat(thisSavedRule.dmOffset || 0) : 0);
                    tX = thisIsBcPrimary ? parseInt(settings.value.bcMoveX || 0) : (thisSavedRule ? parseInt(thisSavedRule.bcMoveX || 0) : 0);
                    tY = thisIsBcPrimary ? parseInt(settings.value.bcMoveY || 0) : (thisSavedRule ? parseInt(thisSavedRule.bcMoveY || 0) : 0);
                    
                    if (isNaN(tDm)) tDm = 0; if (isNaN(tX)) tX = 0; if (isNaN(tY)) tY = 0;

                    // Your Global Hardcoded DataMatrix Offsets
                    globalMasterX = 4; 
                    globalMasterY = 4; 
                }

                // Apply the math! (If it's an Aztec or QR code, tX and tY will safely remain 0)
                x = x + tX + offsetX + globalMasterX; 
                y = y + tY + offsetY + globalMasterY;

                try {
                    const tempCanvas = document.createElement('canvas');
                    let bwipOpts = { bcid: bcid, text: data, scale: 1, padding: 0, includetext: false };

                    if (bcid === 'azteccode') {
                        bwipOpts.eclevel = 23; 
                        bwipOpts.format = 'compact';
                    }

                    try {
                        bwipjs.toCanvas(tempCanvas, bwipOpts);
                    } catch (err) {
                        if (bwipOpts.format === 'compact') {
                            delete bwipOpts.format; 
                            bwipjs.toCanvas(tempCanvas, bwipOpts);
                        } else {
                            throw err;
                        }
                    }
                        
                    const tmpCtx = tempCanvas.getContext('2d');
                    const ctxScaleX = (tmpCtx.getTransform ? tmpCtx.getTransform().a : window.devicePixelRatio) || 1;
                    const ctxScaleY = (tmpCtx.getTransform ? tmpCtx.getTransform().d : window.devicePixelRatio) || 1;
                    
                    const baseModulesW = tempCanvas.style.width ? parseFloat(tempCanvas.style.width) : (tempCanvas.width / ctxScaleX);
                    const baseModulesH = tempCanvas.style.height ? parseFloat(tempCanvas.style.height) : (tempCanvas.height / ctxScaleY);

                    let finalScalar = 0.50;
                    if (bcid === 'azteccode') finalScalar = 0.50; 
                    else if (bcid === 'qrcode') finalScalar = 0.65;
                    else if (bcid === 'datamatrix') finalScalar = 0.85;

                    let dotMultiplier = parsedVal * finalScalar;
                    dotMultiplier = Math.max(0.1, dotMultiplier + tDm);

                    let drawW = baseModulesW * dotMultiplier; 
                    let drawH = baseModulesH * dotMultiplier;

                    if (drawH > 82 && tDm === 0 && bcid !== 'azteccode' && bcid !== 'qrcode' && bcid !== 'datamatrix') { 
                        let shrinkRatio = 82 / drawH; 
                        drawH = 82; 
                        drawW *= shrinkRatio; 
                    }

                    if (isNaN(drawW) || isNaN(drawH) || drawW <= 0 || drawH <= 0) throw new Error(`Dimensions invalid: W=${drawW}, H=${drawH}`);

                    ctx.imageSmoothingEnabled = false;
                    ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height, x, y, drawW, drawH);
                    
                } catch (e) { 
                    console.warn(`Barcode [${bcid}] skipped at X:${x}, Y:${y}. Reason:`, e.message); 
                    ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
                    ctx.fillRect(x, y, 60, 60);
                    ctx.fillStyle = '#000000';
                }
            };

            // ==========================================================
            // RENDER LOOP
            // ==========================================================
            let renderLines = lines;
            if (!isDemoLabel && !savedRule) renderLines = lines;

            for (let line of renderLines) {
                line = line.trim(); 
                if (!line) continue;
                
                if (line.startsWith('A')) {
                    const firstQuote = line.indexOf('"'); const lastQuote = line.lastIndexOf('"');
                    if (firstQuote !== -1 && lastQuote !== -1) {
                        const text = line.substring(firstQuote + 1, lastQuote);
                        const params = line.substring(1, firstQuote).split(',');
                        const x = parseInt(params[0]) || 0; const y = parseInt(params[1]) || 0; const font = params[3];
                        let multX = parseInt(params[4]); if (isNaN(multX) || multX <= 0) multX = 1;
                        let multY = parseInt(params[5]); if (isNaN(multY) || multY <= 0) multY = 1;

                        //  FIX: Master Calibrators for EACH specific EPL Font!
                        let baseH = 1.06; let baseW = 1.00; let dotHeight = 24; let fontWeight = 'bold';
                        
                        if (font === '1')      { dotHeight = 12; fontWeight = 'normal'; baseH = 1.06; baseW = 1.00; }
                        else if (font === '2') { dotHeight = 16; fontWeight = 'normal'; baseH = 1.20; baseW = 1.12; }
                        else if (font === '3') { dotHeight = 20; fontWeight = 'bold';   baseH = 1.15; baseW = 1.08; }
                        else if (font === '4') { dotHeight = 24; fontWeight = 'bold';   baseH = 1.25; baseW = 1.00; }
                        else if (font === '5') { dotHeight = 48; fontWeight = 'bold';   baseH = 1.06; baseW = 1.00; }
                        else if (font === '6') { dotHeight = 64; fontWeight = 'bold';   baseH = 1.06; baseW = 1.00; }

                        if (isWideLabel) { baseH -= 0.06; baseW -= 0.05; }

                        let widthScale = baseW + textScaleOffset;

                        let activeFontSize = isBcPrimary ? parseFloat(settings.value.fontSize || 1.0) : (savedRule ? parseFloat(savedRule.fontSize || 1.0) : 1.0);
                        let activeWidth = isBcPrimary ? parseFloat(settings.value.fontWidth || 1.0) : (savedRule ? parseFloat(savedRule.fontWidth || 1.0) : 1.0);
                        let activeSpacing = isBcPrimary ? parseInt(settings.value.fontSpace || 0) : (savedRule ? parseInt(savedRule.fontSpace || 0) : 0);

                        let canvasFontSize = Math.round((dotHeight * baseH) * activeFontSize);

                        ctx.save();
                        ctx.font = `${fontWeight} ${canvasFontSize}px ${customFont}"Consolas", monospace`;
                        if (ctx.letterSpacing !== undefined) ctx.letterSpacing = `${activeSpacing}px`;
                        
                        let finalStretch = multX * activeWidth * widthScale;
                        
                        ctx.scale(finalStretch, multY);
                        ctx.fillText(text, (x + globalX) / finalStretch, (y + globalY) / multY);
                        ctx.restore();
                    }
                } else if (line.startsWith('b')) {
                    drawEplBarcode(line, globalX, globalY);
                } else if (line.startsWith('B')) {
                    const firstQuote = line.indexOf('"'); const lastQuote = line.lastIndexOf('"');
                    if (firstQuote !== -1 && lastQuote !== -1) {
                        const data = line.substring(firstQuote + 1, lastQuote); const params = line.substring(1, firstQuote).split(',');
                        const x = parseInt(params[0]) || 0; const y = parseInt(params[1]) || 0;
                        const bcType = params[3]; const narrowBar = parseInt(params[4]) || 2; const targetHeight = parseInt(params[6]) || 50; 
                        let bcid = 'code128'; if (bcType === '3') bcid = 'code39'; if (bcType === 'E30') bcid = 'ean13'; if (bcType === 'UA0') bcid = 'upca';
                        try {
                            const tempCanvas = document.createElement('canvas');
                            bwipjs.toCanvas(tempCanvas, { bcid: bcid, text: data, scaleX: 1, scaleY: 1, height: 10, includetext: false, padding: 2 });
                            ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height, x + globalX, y + globalY, tempCanvas.width * narrowBar, targetHeight);
                        } catch (e) { console.warn("Barcode skipped:", e.message) }
                    }
                } else if (/^(LE|LO|LS|LW|X)/i.test(line)) {
                    let cmd = line.substring(0, 2).toUpperCase(); let paramsStr = line.substring(2);
                    if (cmd.startsWith('X')) { cmd = 'X'; paramsStr = line.substring(1); }
                    let params = paramsStr.split(','); const x = parseInt(params[0]) || 0; const y = parseInt(params[1]) || 0;
                    const w = parseInt(params[2]) || 0; const h = parseInt(params[3]) || 0;

                    ctx.fillStyle = cmd === 'LW' ? '#ffffff' : '#000000';
                    if (cmd === 'X') {
                        const t = parseInt(params[4]) || 1;
                        ctx.fillRect(x + globalX, y + globalY, w, t); ctx.fillRect(x + globalX, y + globalY, t, h);
                        ctx.fillRect(x + globalX, y + globalY + h - t, w, t); ctx.fillRect(x + globalX + w - t, y + globalY, t, h);
                    } else { ctx.fillRect(x + globalX, y + globalY, w, h); }
                    ctx.fillStyle = '#000000'; 
                }
            }

            if (isDeveloperMode.value) {
                ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
                ctx.fillRect(0, dotsH - 30, Math.max(dotsW, 800), 30); 
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 20px Consolas, monospace';
                ctx.fillText(`DEBUG -> Aztec: ${maxAztecDataLen} | DM: ${maxDataMatrixLen} | Layer: ${detectedLayer} | Offset: ${textScaleOffset} | 300DPI: ${is300Dpi}`, 10, dotsH - 25);
            }

            return canvas.toDataURL('image/png');
        };

        const renderState = {
            lastCode: '',
            wasAutoActive: true,
            maxRequiredW: 0,
            maxRequiredH: 0,
            lockedSize: null,
            lockedDpi: null,
            autoHardwareOffsetX: 0
        };
        
        watch(() => settings.value.isHardwareCenteringActive, () => {
            triggerRender();
        });

        //  THE FIX: Tell the canvas to instantly re-calculate when the Auto Size toggle is clicked!
        watch(() => settings.value.isAutoDetectActive, () => {
            triggerRender();
        });

        //  FIX: Watch UI sliders and force Canvas Redraw!
        watch(
            () => [
                settings.value.offsetX, 
                settings.value.offsetY,
                settings.value.dmOffset, 
                settings.value.bcMoveX, 
                settings.value.bcMoveY,
                settings.value.fontSize, 
                settings.value.fontWidth, 
                settings.value.fontSpace
            ],
            () => {
                // Uses the built-in debouncer so it doesn't crash if you type fast
                debouncedRender(); 
            }
        );

        const processAutoDetectSizing = (codeString, detectedLang) => {
            let lockedSizeToApply = '2.25x1.25';
            let lockedDpiToApply = 203;

            // 1. Detect Explicit Canvas Boundaries (^PW / ^LL / q / Q)
            let currentRawW = null; let currentRawH = null;
            let firstBlock = detectedLang === 'zpl' ? (codeString.match(/\^XA[\s\S]*?\^XZ/i)?.[0] || "") : (codeString.match(/^[\s\S]*?P1/i)?.[0] || "");
            if (detectedLang === 'zpl') {
                const pwMatch = firstBlock.match(/\^PW\s*(\d+)/i); const llMatch = firstBlock.match(/\^LL\s*(\d+)/i);
                if (pwMatch) currentRawW = parseInt(pwMatch[1]); if (llMatch) currentRawH = parseInt(llMatch[1]);
            } else {
                const qMatch = firstBlock.match(/(?:^|[\r\n])[ \t]*q\s*(\d+)/); const capQMatch = firstBlock.match(/(?:^|[\r\n])[ \t]*Q\s*(\d+)(?:,\d+)?/);
                if (qMatch) currentRawW = parseInt(qMatch[1]); if (capQMatch) currentRawH = parseInt(capQMatch[1]);
            }

            lockedDpiToApply = 203; // Default Fallback
            
            // THE FIX: Safely extract sizes whether they are a flat array or grouped categories
            let availableSizes = [];
            if (activePrinterConfig.value && activePrinterConfig.value.sizes) {
                if (Array.isArray(activePrinterConfig.value.sizes)) {
                    availableSizes = activePrinterConfig.value.sizes;
                } else {
                    availableSizes = Object.values(activePrinterConfig.value.sizes).flat(); 
                }
            }
            
            if (currentRawW) {
                let is300 = availableSizes.some(s => Math.abs((parseFloat(s.split('x')[0]) * 300) - currentRawW) <= 10);
                let is203 = availableSizes.some(s => Math.abs((parseFloat(s.split('x')[0]) * 203) - currentRawW) <= 10);
                if (is300 && !is203) lockedDpiToApply = 300;
                else if (currentRawW >= 800 && !is203) lockedDpiToApply = 300;
            }

            // 2. Calculate Ink Bounding Box (In case explicit boundaries are missing)
            let maxReachX = 0; let maxReachY = 0;
            if (detectedLang === 'zpl') {
                let zplBlocks = codeString.split(/\^XA/i);
                zplBlocks.forEach(block => {
                    let lhX = 0, lhY = 0;
                    let allLh = [...block.matchAll(/\^LH\s*(\d+)\s*,\s*(\d+)/gi)];
                    if (allLh.length > 0) {
                        let lastLh = allLh[allLh.length - 1]; lhX = parseInt(lastLh[1]) || 0; lhY = parseInt(lastLh[2]) || 0;
                    }
                    const fields = block.split(/\^FS/i);
                    fields.forEach(f => {
                        const foMatch = f.match(/\^F[O0T]\s*(\d+)\s*,\s*(\d+)/i);
                        if (foMatch) {
                            let x = parseInt(foMatch[1]) + lhX; 
                            let y = parseInt(foMatch[2]) + lhY + 25; 
                            const fontMatch = f.match(/\^A[A-Z0-9]*[,\s]+(\d+)[,\s]+(\d+)/i);
                            const fdMatch = f.match(/\^FD([\s\S]*)$/i);
                            
                            let estimatedReachX = x;
                            
                            // FIX: Isolate Barcodes from Text calculations!
                            if (f.match(/\^(BX|B0|BQ|BU|BC|B2)/i)) {
                                // 1D barcodes are wider, 2D barcodes are compact squares
                                let is1D = f.match(/\^(BU|BC|B2)/i);
                                estimatedReachX += is1D ? 250 : 120; 
                            } else {
                                // Only multiply character width for actual readable text
                                let charW = fontMatch ? parseInt(fontMatch[2]) : 20;
                                let textLen = fdMatch && fdMatch[1] ? fdMatch[1].trim().length : 0;
                                estimatedReachX += (charW * textLen * 0.48); 
                            }

                            if (estimatedReachX > maxReachX) maxReachX = estimatedReachX;
                            if (y > maxReachY) maxReachY = y;
                        }
                    });
                });
            } else {
                const lines = codeString.split(/\r?\n/);
                lines.forEach(line => {
                    let trimmed = line.trim();
                    if (trimmed.startsWith('A')) {
                        let parts = trimmed.split(',');
                        if (parts.length >= 8) {
                            let x = parseInt(parts[0].substring(1)) || 0; let y = parseInt(parts[1]) || 0;
                            let font = parseInt(parts[3]) || 2; let multX = parseInt(parts[4]) || 1;
                            if (multX === 0) multX = 1;
                            let firstQuote = trimmed.indexOf('"'); let lastQuote = trimmed.lastIndexOf('"');
                            let textLen = (firstQuote !== -1 && lastQuote > firstQuote) ? lastQuote - firstQuote - 1 : 0;
                            let charW = 10; if (font === 1) charW = 8; if (font === 3) charW = 12; if (font === 4) charW = 14; if (font === 5) charW = 32;
                            let estimatedReachX = x + (textLen * charW * multX);
                            if (estimatedReachX > maxReachX) maxReachX = estimatedReachX;
                            if (y > maxReachY) maxReachY = y;
                        }
                    } else if (trimmed.match(/^[bB]/)) {
                        let parts = trimmed.split(',');
                        if (parts.length >= 3) {
                            let x = parseInt(parts[0].substring(1)) || 0; let y = parseInt(parts[1]) || 0;
                            let estimatedReachX = x + 180;
                            if (estimatedReachX > maxReachX) maxReachX = estimatedReachX;
                            if (y > maxReachY) maxReachY = y;
                        }
                    }
                });
            }

            // FIX: Never trust explicit canvas bounds blindly! Legacy templates often have wrong widths. 
            // We must use whichever is LARGER: the explicit command, or the actual calculated ink boundaries.
            let requiredDotsW = Math.max((currentRawW || 0), (maxReachX > 0 ? maxReachX + 40 : 0));
            let requiredDotsH = Math.max((currentRawH || 0), (maxReachY > 0 ? maxReachY + 40 : 0));

            if (requiredDotsW === 0) requiredDotsW = 457; // Default Fallback W
            if (requiredDotsH === 0) requiredDotsH = 254; // Default Fallback H

            let testW = requiredDotsW / lockedDpiToApply; 
            let testH = requiredDotsH / lockedDpiToApply;

            const sortedSizes = availableSizes.sort((a, b) => {
                const [aw, ah] = a.split('x').map(parseFloat); const [bw, bh] = b.split('x').map(parseFloat);
                return (aw * ah) - (bw * bh);
            });

            let bestFitMatch = null;
            for (let sizeStr of sortedSizes) {
                const [sw, sh] = sizeStr.split('x').map(parseFloat);
                if (sw >= (testW - 0.05) && sh >= (testH - 0.05)) {
                    bestFitMatch = { size: sizeStr, sw: sw, sh: sh }; 
                    break;
                }
            }

            if (bestFitMatch) {
                // If a standard size has too much dead space, instantly switch to Custom sizing
                if (bestFitMatch.sw - testW > 0.5 || bestFitMatch.sh - testH > 0.5) {
                    lockedSizeToApply = 'custom';
                    settings.value.customW = Math.max(1, Math.ceil(testW * 4) / 4);
                    settings.value.customH = Math.max(1, Math.ceil(testH * 4) / 4);
                } else {
                    lockedSizeToApply = bestFitMatch.size; 
                }
            } else {
                lockedSizeToApply = 'custom';
                settings.value.customW = Math.max(1, Math.ceil(testW * 4) / 4);
                settings.value.customH = Math.max(1, Math.ceil(testH * 4) / 4);
            }

            // ==========================================================
            // FINALIZE STATE
            // ==========================================================
            let intendedDensity = (lockedDpiToApply === 300) ? '12' : '8';
            settings.value.intendedDensity = intendedDensity; // SAVE THIS FOR THE VALIDATION ENGINE!
            
            let calculatedDensity = intendedDensity;
            
            // HARDWARE STRICT OVERRIDE
            if (activePrinterConfig.value && activePrinterConfig.value.fixedDpi) {
                calculatedDensity = activePrinterConfig.value.fixedDpi;
            }

            settings.value.density = calculatedDensity;
            settings.value.size = lockedSizeToApply;

            if (lockedSizeToApply !== 'custom') {
                if (sizeOffsets[lockedSizeToApply]) {
                    settings.value.offsetX = sizeOffsets[lockedSizeToApply].x;
                    settings.value.offsetY = sizeOffsets[lockedSizeToApply].y;
                } else {
                    settings.value.offsetX = 0; 
                    settings.value.offsetY = 0; // RESTORED TO ZERO
                }
            }
        };

        const triggerRender = async () => {
            await new Promise(resolve => setTimeout(resolve, 10));

            if (engineState.currentRenderController) engineState.currentRenderController.abort();
            engineState.currentRenderController = new AbortController();
            const signal = engineState.currentRenderController.signal;

            engineState.primaryZplSignature = null;
            engineState.primaryEplSignature = null;
            activeSignaturesForSaving.clear();
            
            validationErrors.value = []; 

            let codeString = isListView.value ? getCombinedListCode() : engineState.codeEditor?.getValue();
            
            const toggleJustTurnedOn = settings.value.isAutoDetectActive && !renderState.wasAutoActive;
            renderState.wasAutoActive = settings.value.isAutoDetectActive;

            if (toggleJustTurnedOn) {
                renderState.maxRequiredW = 0;
                renderState.maxRequiredH = 0;
                renderState.lockedSize = null;
                renderState.lockedDpi = null;
            }

            if (!codeString || !codeString.trim()) {
                renderedLabels.value = [];
                return;
            }

            isCurrentLabelDemo.value = codeString.includes('^FX_TMS_DEMO') || codeString.includes(';TMS_DEMO');
            const detectedLang = codeString.includes('^XA') ? 'zpl' : 'epl';
            settings.value.lang = detectedLang;

            if (settings.value.isAutoDetectActive) {
                processAutoDetectSizing(codeString, detectedLang);
            }
            else {
                const toggleJustTurnedOff = !settings.value.isAutoDetectActive && renderState.wasAutoActive;
                const codeChanged = codeString !== renderState.lastCode;
                
                if (codeChanged || toggleJustTurnedOff) {
                    engineState.lastLoadedSignature = null;
                    let foundSavedRule = false;
                    const isDemoLabel = isCurrentLabelDemo.value;

                    try {
                        let sigToCheck = null;
                        if (detectedLang === 'zpl') {
                            const fields = codeString.split(/\^FS/i);
                            for (let field of fields) {
                                let bcMatch = field.match(/\^(BX|B0|BQ|BU|BC|B2)/i);
                                if (bcMatch) {
                                    let foMatch = field.match(/\^F[O0T]\s*(-?\d+)\s*,\s*(-?\d+)/i);
                                    sigToCheck = `${isDemoLabel ? 'DEMO_' : ''}ZPL_${getBcType(bcMatch[1])}_${foMatch ? foMatch[1] : "0"}_${foMatch ? foMatch[2] : "0"}`;
                                    break;
                                }
                            }
                        } else {
                            const lines = codeString.split(/\r?\n/);
                            for (let line of lines) {
                                let trimmed = line.trim();
                                if (trimmed.startsWith('b')) {
                                    let p = trimmed.split(',');
                                    sigToCheck = `${isDemoLabel ? 'DEMO_' : ''}EPL_${getBcType(p[2] ? p[2].replace(/"/g,'').toUpperCase() : '')}_${parseInt(p[0].replace(/b/i,''))}_${parseInt(p[1])}`;
                                    break;
                                }
                            }
                        }

                        if (sigToCheck) {
                            let rule = getCalibrationRule(sigToCheck);
                            if (rule && (rule.labelSize || rule.labelDensity)) {
                                if (rule.labelSize) settings.value.size = rule.labelSize;
                                if (rule.labelDensity) settings.value.density = rule.labelDensity;
                                
                                if (rule.labelSize === 'custom') {
                                    settings.value.customW = parseFloat(rule.customW) || settings.value.customW;
                                    settings.value.customH = parseFloat(rule.customH) || settings.value.customH;
                                }
                                foundSavedRule = true; 
                            }
                        }
                    } catch(e) { console.warn("Manual Pre-Scan Failed:", e); }

                    if (!foundSavedRule && !isDemoLabel && selectedTmsUrl.value && calibrationRules.value.clientDefaults) {
                        let urlLower = selectedTmsUrl.value.toLowerCase();
                        let matchedKey = Object.keys(calibrationRules.value.clientDefaults).find(k => urlLower.includes(k));
                        
                        if (matchedKey) {
                            let cd = calibrationRules.value.clientDefaults[matchedKey];
                            if (cd.density) settings.value.density = cd.density;
                            if (cd.size) settings.value.size = cd.size;
                            
                            if (cd.size === 'custom') {
                                settings.value.customW = parseFloat(cd.customW) || 3;
                                settings.value.customH = parseFloat(cd.customH) || 1.5;
                            }
                            foundSavedRule = true; 
                        }
                    }
                }
            }

            renderState.lastCode = codeString;
            checkSizeLimits();
            
            const dots = calibratedDots.value;
            const dpi = settings.value.density === '12' ? 300 : 203;
            const physicalWMm = (dots.w / dpi) * 25.4;
            const physicalHMm = (dots.h / dpi) * 25.4;

            // =========================================================================
            //  DYNAMIC HARDWARE CENTERING MATH
            // =========================================================================
            let nativeDotsW = dots.w;
            let explicitSized = false;
            let sampleBlock = detectedLang === 'zpl' ? (codeString.match(/\^XA[\s\S]*?\^XZ/i)?.[0] || codeString) : (codeString.match(/^[\s\S]*?P1/i)?.[0] || codeString);

            if (detectedLang === 'zpl') {
                const pwMatch = sampleBlock.match(/\^PW\s*(\d+)/i);
                if (pwMatch) { nativeDotsW = parseInt(pwMatch[1]); explicitSized = true; }
            } else {
                const qMatch = sampleBlock.match(/(?:^|[\r\n])[ \t]*q\s*(\d+)/i);
                if (qMatch) { nativeDotsW = parseInt(qMatch[1]); explicitSized = true; }
            }

            if (!explicitSized) {
                let maxReachX = 0;
                if (detectedLang === 'zpl') {
                    const foMatches = [...sampleBlock.matchAll(/\^F[O0T]\s*(-?\d+)/gi)];
                    for (let m of foMatches) { if (parseInt(m[1]) > maxReachX) maxReachX = parseInt(m[1]); }
                } else {
                    const lines = sampleBlock.split(/\r?\n/);
                    for (let line of lines) {
                        let match = line.match(/^[ABbX]\s*(-?\d+)/i);
                        if (match && parseInt(match[1]) > maxReachX) maxReachX = parseInt(match[1]);
                    }
                }
                
                //  SMARTER FALLBACK: Now correctly recognizes 2" labels!
                if (maxReachX > 0) {
                    let est = maxReachX + 150; // Add breathing room for text/barcodes
                    if (est <= 406) nativeDotsW = 406;      // Snaps to 2"
                    else if (est <= 457) nativeDotsW = 457; // Snaps to 2.25"
                    else if (est <= 609) nativeDotsW = 609; // Snaps to 3"
                    else nativeDotsW = dots.w;
                } else {
                    nativeDotsW = dots.w;
                }
            }

            //  LOGIC SIMPLIFICATION
            // If both Auto-Detect AND Programmed Fit are ON -> Pristine exact fit (0 offset).
            // Otherwise, calculate the physical hardware gap for the selected canvas.
            if (settings.value.isHardwareCenteringActive && !settings.value.isAutoDetectActive) {
                if (Math.abs(dots.w - nativeDotsW) > 15) {
                    renderState.autoHardwareOffsetX = Math.floor((dots.w - nativeDotsW) / 2);
                } else {
                    renderState.autoHardwareOffsetX = 0;
                }
            } else {
                renderState.autoHardwareOffsetX = 0;
            }
            // =========================================================================
            let labelBlocks = [];
            if (detectedLang === 'zpl') {
                labelBlocks = extractZplBlocks(codeString, dots.w, dots.h);
            } else {
                const lines = codeString.split(/\r?\n/);
                let activeSetup = {}; let currentBlock = [];
                for (let line of lines) {
                    let trimmed = line.trim(); if (!trimmed) continue;
                    let cmdActual = trimmed.charAt(0); 
                    let cmdUpper = cmdActual.toUpperCase();
                    
                    if (['D', 'Z', 'Q', 'q', 'O', 'I', 'S'].includes(cmdActual)) { 
                        activeSetup[cmdActual] = trimmed; 
                        currentBlock.push(trimmed); 
                    } 
                    else if (cmdUpper === 'N') { 
                        if (currentBlock.some(l => /^[ABbGWX]/i.test(l))) labelBlocks.push(currentBlock.join('\n') + '\n');
                        currentBlock = Object.values(activeSetup); currentBlock.push(trimmed); 
                    } 
                    else if (cmdUpper === 'P') { 
                        currentBlock.push(trimmed); labelBlocks.push(currentBlock.join('\n') + '\n'); currentBlock = []; 
                    } 
                    else { currentBlock.push(trimmed); }
                }
                if (currentBlock.some(l => /^[ABbGWX]/i.test(l))) labelBlocks.push(currentBlock.join('\n') + '\n');
            }

            if (renderedLabels.value.length > labelBlocks.length) {
                renderedLabels.value.splice(labelBlocks.length);
            }

            for (let i = 0; i < labelBlocks.length; i++) {
                if (!renderedLabels.value[i]) {
                    renderedLabels.value[i] = { src: null, alt: 'Loading...', loading: true, error: false, errorMsg: '' };
                } else {
                    renderedLabels.value[i].error = false;
                    renderedLabels.value[i].errorMsg = '';
                }
            }

            for (let i = 0; i < labelBlocks.length; i++) {
                if (signal.aborted) return;
                
                try {
                    let finalSrc = null;
                    
                    if (detectedLang === 'zpl' && typeof engineState.zplLibrary !== 'undefined') {
                        let apiPayload = labelBlocks[i]; 
                        const isDemoLabel = apiPayload.includes('^FX_TMS_DEMO') || apiPayload.includes(';TMS_DEMO');
                        apiPayload = apiPayload.replace(/\^AQ/gi, '^A0');
                        
                        apiPayload = apiPayload.replace(/\\&/g, '&');

                        let lhX = 0, lhY = 0;
                        let lhMatch = apiPayload.match(/\^LH\s*(-?\d+)\s*,\s*(-?\d+)/i);
                        if (lhMatch) {
                            lhX = parseInt(lhMatch[1]) || 0;
                            lhY = parseInt(lhMatch[2]) || 0;
                        }

                        apiPayload = apiPayload.replace(/\^PW\d+/gi, '');
                        apiPayload = apiPayload.replace(/\^LL\d+/gi, '');
                        apiPayload = apiPayload.replace(/\^XA/gi, `^XA\n^PW${dots.w}\n^LL${dots.h}`);

                        //  1. ZPL PRE-SCAN: Find wide labels AND measure Aztec barcodes
                        let isWideLabel = false;
                        let maxAztecDataLen = 0; 

                        let pwMatch = apiPayload.match(/\^PW\s*(\d+)/i);
                        if (pwMatch && parseInt(pwMatch[1]) > 600) isWideLabel = true;

                        // Hunt for ZPL Aztec tags (^B0) and measure the data inside the ^FD
                        let b0Matches = [...apiPayload.matchAll(/\^B0[^]*?\^FD(.*?)(?=\^FS|$)/gi)];
                        for (let m of b0Matches) {
                            let cleanData = m[1].replace('>;>8', '');
                            if (cleanData.length > maxAztecDataLen) maxAztecDataLen = cleanData.length;
                        }

                        //  2. CALCULATE DYNAMIC TEXT OFFSET ZPL
                        let textScaleOffset = 0;
                        let detectedLayer = 1; 
                        let is300Dpi = settings.value.density === '12'; 

                        let fieldsForCalib = apiPayload.split(/\^FS/i);
                        let newFields = [];
                        let zplBarcodes = []; 

                        let zplPrePassSig = null;
                        let zplHardwareRuleSig = null;
                        
                        for (let field of fieldsForCalib) {
                            let bcMatch = field.match(/\^(BX|B0|BQ|BU|BC|B2)/i);
                            if (bcMatch) {
                                let bcType = getBcType(bcMatch[1]);
                                let foMatch = field.match(/\^F[O0T]\s*(-?\d+)\s*,\s*(-?\d+)/i);
                                let startX = foMatch ? foMatch[1] : "0";
                                let startY = foMatch ? foMatch[2] : "0";
                                let sig = `${isDemoLabel ? 'DEMO_' : ''}ZPL_${bcType}_${startX}_${startY}`;
                                
                                if (!zplPrePassSig) zplPrePassSig = sig;
                                let checkRule = getCalibrationRule(sig);
                                if (checkRule && checkRule.labelSize) zplHardwareRuleSig = sig;
                            }
                        }
                        
                        let finalZplSig = zplHardwareRuleSig || zplPrePassSig;
                        if (finalZplSig && !engineState.primaryZplSignature) {
                            engineState.primaryZplSignature = finalZplSig;
                            syncUiToSignature(finalZplSig); 
                        }

                        //  FIX: Fetch the Saved Rule so it works outside Calibration Mode!
                        let zplSavedRule = getCalibrationRule(finalZplSig);
                        let isPrimary = (!isListView.value || selectedFiles.value.length <= 1);
                        let isZplPrimary = isPrimary || finalZplSig === engineState.primaryZplSignature;
                        
                        // Master Global Canvas Offset for ZPL
                        let zplMasterOffsetX = 0; 
                        let zplMasterOffsetY = 0; 

                        let globalX = zplMasterOffsetX;
                        let globalY = zplMasterOffsetY;

                        // 🎯 Strict Inheritance Logic
                        if (isCalibrationMode.value && isZplPrimary) {
                            globalX += parseInt(settings.value.offsetX || 0);
                            globalY += parseInt(settings.value.offsetY || 0);
                        } else if (zplSavedRule) {
                            globalX += parseInt(zplSavedRule.offsetX || 0);
                            globalY += parseInt(zplSavedRule.offsetY || 0);
                        }

                        for (let field of fieldsForCalib) {
                            let foMatch = field.match(/\^F[O0T]\s*(-?\d+)\s*,\s*(-?\d+)/i);
                            let fdMatch = field.match(/\^FD\s*([\s\S]*)$/i);
                            let anyBcMatch = field.match(/\^(BX|B0|BQ|BU|BC|B2)/i);

                            if (anyBcMatch && fdMatch) {
                                let rawBcData = fdMatch[1].replace('>;>8', '').trim();
                                if (rawBcData === '') {
                                    field = field.replace(/\^FD\s*([\s\S]*)$/i, '^FD0000000000');
                                    fdMatch[1] = '0000000000'; 
                                }
                            }

                            let tDm = 0, tX = 0, tY = 0, tFont = '', tFontSize = 1.0;
                            
                            if (anyBcMatch && foMatch) {
                                let sig = `${isDemoLabel ? 'DEMO_' : ''}ZPL_${getBcType(anyBcMatch[1])}_${foMatch[1]}_${foMatch[2]}`;
                                activeSignaturesForSaving.add(sig);
                                let savedRule = getCalibrationRule(sig);
                                
                                let isBcPrimary = isPrimary || sig === engineState.primaryZplSignature;
                                
                                if (savedRule && typeof savedRule === 'object') {
                                    tDm = isBcPrimary ? parseFloat(settings.value.dmOffset || 0) : parseFloat(savedRule.dmOffset || 0);
                                    tX = isBcPrimary ? parseInt(settings.value.bcMoveX || 0) : parseInt(savedRule.bcMoveX || 0);
                                    tY = isBcPrimary ? parseInt(settings.value.bcMoveY || 0) : parseInt(savedRule.bcMoveY || 0);
                                    tFont = isBcPrimary ? (settings.value.font || '') : (savedRule.font || '');
                                    tFontSize = isBcPrimary ? parseFloat(settings.value.fontSize || 1.0) : parseFloat(savedRule.fontSize || 1.0);
                                } else {
                                    tDm = isBcPrimary ? parseFloat(settings.value.dmOffset || 0) : 0;
                                    tX = isBcPrimary ? parseInt(settings.value.bcMoveX || 0) : 0;
                                    tY = isBcPrimary ? parseInt(settings.value.bcMoveY || 0) : 0;
                                    tFont = isBcPrimary ? (settings.value.font || '') : '';
                                    tFontSize = isBcPrimary ? parseFloat(settings.value.fontSize || 1.0) : 1.0;
                                }
                            }

                            //  FIX: Intercept ALL barcodes onto the Canvas so offsets work universally!
                            let interceptRegex = /\^(BX|B0|BQ|BU|BC|B2)([^\^]*)/i;
                            let interceptMatch = field.match(interceptRegex);

                            if (interceptMatch && foMatch && fdMatch) {
                                let cleanData = fdMatch[1].replace('>;>8', '');
                                if (interceptMatch[1].toUpperCase() === 'BQ') cleanData = cleanData.replace(/^[A-Z0-9]{1,3},/, '');

                                zplBarcodes.push({
                                    x: parseInt(foMatch[1]) + tX, 
                                    y: parseInt(foMatch[2]) + tY, 
                                    isFT: /\^FT/i.test(field),
                                    type: interceptMatch[1].toUpperCase(),
                                    params: interceptMatch[2] || '',
                                    data: cleanData,
                                    sizeAdjust: tDm
                                });
                                
                                let stripRegex = /\^(BX|B0|BQ|BU|BC|B2)[^\^]*/i;
                                field = field.replace(stripRegex, '').replace(/\^FD[\s\S]*/i, '');
                                
                            } else {
                                field = field.replace(/\^BX([A-Z]?),(\d+(?:\.\d+)?)/gi, (m, ori, size) => `^BX${ori},${Math.max(0.1, parseFloat(size) + tDm)}`);
                                field = field.replace(/\^BQ([A-Z]?),(\d+),(\d+(?:\.\d+)?)/gi, (m, ori, model, size) => `^BQ${ori},${model},${Math.max(0.1, parseFloat(size) + tDm)}`);
                                field = field.replace(/\^B0([A-Z]?),(\d+(?:\.\d+)?)/gi, (m, ori, size) => `^B0${ori},${Math.max(0.1, parseFloat(size) + tDm)}`);
                            }

                            if (tFont && tFont.length === 1) {
                                let zplFontChar = '0';
                                if (tFont.toLowerCase().includes('courier')) zplFontChar = 'A';
                                field = field.replace(/\^A[A-Z0-9]/gi, `^A${zplFontChar}`);
                                field = field.replace(/\^CF[A-Z0-9]/gi, `^CF${zplFontChar}`);
                            }

                            if (tFontSize !== 1.0 || textScaleOffset !== 0) {
                                field = field.replace(/\^(A|CF)([A-Z0-9]+),?(\d+)?,?(\d+)?/gi, (match, cmd, font, h, w) => {
                                    let res = `^${cmd}${font}`;
                                    let height = h ? parseInt(h) : 0;
                                    let width = w ? parseInt(w) : height; 
                                    
                                    if (height) {
                                        let finalH = Math.max(1, Math.round(height * tFontSize));
                                        res += `,${finalH}`;
                                        
                                        if (width) {
                                            let finalW = Math.max(1, Math.round((width * tFontSize) * (1 + textScaleOffset)));
                                            res += `,${finalW}`;
                                        }
                                    }
                                    return res;
                                });
                            }
                            
                            newFields.push(field);
                        }

                        if (!engineState.primaryZplSignature) syncUiToSignature(null); 

                        let strippedZpl = newFields.join('^FS');
                        let b64 = null;
                        const cacheHash = `${strippedZpl}_${dots.w}_${dots.h}_${settings.value.density}`;
                        
                        if (zplCache.has(cacheHash)) {
                            b64 = zplCache.get(cacheHash);
                        } else {
                            b64 = await engineState.zplLibrary.zplToBase64Async(strippedZpl, physicalWMm, physicalHMm, parseInt(settings.value.density));
                            zplCache.set(cacheHash, b64);
                        }
                        
                        if (signal.aborted) return;

                        //  FIX: Force the Canvas to render if the user applies a Global Offset!
                        if (zplBarcodes.length > 0 || isDeveloperMode.value || globalX !== 0 || globalY !== 0) {
                            const img = new Image();
                            img.src = `data:image/png;base64,${b64}`;
                            await new Promise(r => img.onload = r);

                            const canvas = document.createElement('canvas');
                            canvas.width = img.width; 
                            canvas.height = img.height;
                            const ctx = canvas.getContext('2d');
                            ctx.imageSmoothingEnabled = false;
                            
                            // SHIFT ENTIRE ZPL RENDER BACKGROUND
                            ctx.drawImage(img, globalX, globalY);

                            for (let bc of zplBarcodes) {
                                try {
                                    const tmpCanvas = document.createElement('canvas');
                                    let bwipId = 'datamatrix'; 
                                    let is1D = false;

                                    if (bc.type === 'BU') { bwipId = 'upca'; is1D = true; }
                                    else if (bc.type === 'BC') { bwipId = 'code128'; is1D = true; }
                                    else if (bc.type === 'B2') { bwipId = 'interleaved2of5'; is1D = true; }
                                    else if (bc.type === 'BX') { bwipId = 'datamatrix'; is1D = false; }
                                    else if (bc.type === 'B0') { bwipId = 'azteccode'; is1D = false; }
                                    else if (bc.type === 'BQ') { bwipId = 'qrcode'; is1D = false; }

                                    if (is1D) {
                                        bwipjs.toCanvas(tmpCanvas, { bcid: bwipId, text: bc.data, scaleX: 2, scaleY: 2, height: 15, includetext: false, padding: 0 });
                                        
                                        const tmpCtx = tmpCanvas.getContext('2d');
                                        const ctxScaleX = (tmpCtx.getTransform ? tmpCtx.getTransform().a : window.devicePixelRatio) || 1;
                                        
                                        let destW = tmpCanvas.style.width ? parseFloat(tmpCanvas.style.width) : (tmpCanvas.width / ctxScaleX);
                                        destW = destW * 1.1; 
                                        
                                        let targetHeight = Math.max(30, 100 + (bc.sizeAdjust * 10));
                                        let finalBcDrawY = bc.y + lhY + globalY;
                                        if (bc.isFT) finalBcDrawY -= targetHeight;
                                        // Barcode correctly tracks global shifts naturally
                                        ctx.drawImage(tmpCanvas, 0, 0, tmpCanvas.width, tmpCanvas.height, bc.x + lhX + globalX, bc.y + lhY + globalY, destW, targetHeight);
                                        
                                    } else {
                                        let pParts = bc.params.split(',');
                                        let baseMag = 3; 

                                        if (bc.type === 'BQ') { baseMag = parseFloat(pParts[2]); } 
                                        else { baseMag = parseFloat(pParts[1]); }
                                        if (isNaN(baseMag) || baseMag <= 0) baseMag = 3; 

                                        let bwipOpts = { bcid: bwipId, text: bc.data, scale: 1, padding: 0, includetext: false };

                                        if (bwipId === 'azteccode') {
                                            bwipOpts.eclevel = 23; 
                                            if (bc.data && bc.data.length < 35) {
                                                bwipOpts.format = 'compact'; 
                                            }
                                        }

                                        try {
                                            bwipjs.toCanvas(tmpCanvas, bwipOpts);
                                        } catch (err) {
                                            if (bwipOpts.format === 'compact') {
                                                try {
                                                    delete bwipOpts.format; 
                                                    bwipjs.toCanvas(tmpCanvas, bwipOpts);
                                                } catch (err2) {
                                                    continue; 
                                                }
                                            } else {
                                                continue; 
                                            }
                                        }

                                        const tmpCtx = tmpCanvas.getContext('2d');
                                        const ctxScaleX = (tmpCtx.getTransform ? tmpCtx.getTransform().a : window.devicePixelRatio) || 1;
                                        const ctxScaleY = (tmpCtx.getTransform ? tmpCtx.getTransform().d : window.devicePixelRatio) || 1;
                                        
                                        const baseModulesW = tmpCanvas.style.width ? parseFloat(tmpCanvas.style.width) : (tmpCanvas.width / ctxScaleX);
                                        const baseModulesH = tmpCanvas.style.height ? parseFloat(tmpCanvas.style.height) : (tmpCanvas.height / ctxScaleY);

                                        let finalScalar = 0.50;
                                        if (bwipId === 'azteccode') finalScalar = 0.50; 
                                        else if (bwipId === 'qrcode') finalScalar = 0.75; 

                                        let dotMultiplier = baseMag * finalScalar;
                                        dotMultiplier = Math.max(0.1, dotMultiplier + bc.sizeAdjust);

                                        let drawW = baseModulesW * dotMultiplier; 
                                        let drawH = baseModulesH * dotMultiplier;

                                        //  NEW: Segregated Master Offsets for ZPL Barcodes!
                                        let zplBcMasterX = 0;
                                        let zplBcMasterY = 0;

                                        if (bwipId === 'datamatrix') {
                                            zplBcMasterX = 0; // Positive moves ZPL DataMatrix right, negative left
                                            zplBcMasterY = 0; //  FIX: Removed the -6 custom offset!
                                        } else if (bwipId === 'azteccode') {
                                            zplBcMasterX = 0; // Positive moves ZPL Aztec right, negative left
                                            zplBcMasterY = 0; // Positive moves ZPL Aztec down, negative up
                                        }

                                        let finalBcDrawX = bc.x + lhX + globalX + zplBcMasterX;
                                        let finalBcDrawY = bc.y + lhY + globalY + zplBcMasterY;
                                        if (bc.isFT) {
                                            finalBcDrawY -= drawH; 
                                        }
                                        //  FIX: Barcode correctly tracks global shifts + isolated Master offsets
                                        ctx.drawImage(tmpCanvas, 0, 0, tmpCanvas.width, tmpCanvas.height, finalBcDrawX, finalBcDrawY, drawW, drawH);
                                    }
                                } catch (e) { console.warn("Canvas Overlay Error:", e); }
                            }

                            if (isDeveloperMode.value) {
                                ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
                                ctx.fillRect(0, canvas.height - 30, Math.max(canvas.width, 800), 30); 
                                ctx.fillStyle = '#ffffff';
                                ctx.font = 'bold 20px Consolas, monospace';
                                ctx.fillText(`ZPL DEBUG -> Len: ${maxAztecDataLen} | Layer: ${detectedLayer} | Offset: ${textScaleOffset} | Wide: ${isWideLabel} | 300DPI: ${is300Dpi}`, 10, canvas.height - 8);
                            }

                            finalSrc = canvas.toDataURL('image/png');
                        } else {
                            finalSrc = `data:image/png;base64,${b64}`;
                        }
                    } else if (detectedLang === 'epl') {
                        finalSrc = renderLabelLocally(labelBlocks[i], dots.w, dots.h, isCurrentLabelDemo.value);
                    }

                    if (!signal.aborted) {
                        if (finalSrc && renderedLabels.value[i].src !== finalSrc) {
                            renderedLabels.value[i].src = finalSrc;
                        }
                        renderedLabels.value[i].loading = false;
                    }

                } catch (e) {
                    if (e.name !== 'AbortError' && renderedLabels.value[i]) {
                        renderedLabels.value[i].error = true;
                        renderedLabels.value[i].errorMsg = e.message || "Failed to generate label image.";
                        renderedLabels.value[i].loading = false;
                    }
                }
            }
            if (detectedLang === 'epl' && !engineState.primaryEplSignature) syncUiToSignature(null);
        };

        const debounce = (f, w) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => f(...a), w); }; };
        const debouncedRender = debounce(triggerRender, 500);

        const connectQZ = () => {
            if (!window.qz) return alert("QZ Tray script is not loaded.");
            
            const fetchPrinters = () => {
                window.qz.printers.find().then((printers) => {
                    
                    // 1. Try to ONLY show known thermal/label printer brands
                    const labelBrands = ['zdesigner', 'zebra', 'sato', 'rollo', 'dymo', 'tsc', 'godex', 'citizen'];
                    let cleanList = printers.filter(p => labelBrands.some(brand => p.toLowerCase().includes(brand)));
                    
                    // 2. If no explicit label printers were found, just hide the common junk/virtual printers
                    if (cleanList.length === 0) {
                        const junkPrinters = ['pdf', 'onenote', 'fax', 'xps', 'microsoft', 'hp smart', 'deskjet', 'officejet'];
                        cleanList = printers.filter(p => !junkPrinters.some(junk => p.toLowerCase().includes(junk)));
                    }
                    
                    // 3. Absolute fallback: If the filter accidentally hid everything, show them all
                    if (cleanList.length === 0) cleanList = printers;

                    qzPrinters.value = cleanList;
                    
                    // 4. Auto-select the Zebra printer instantly
                    const autoSelectZebra = cleanList.find(p => p.toLowerCase().includes('zdesigner') || p.toLowerCase().includes('zebra'));
                    selectedPrinter.value = autoSelectZebra || (cleanList.length > 0 ? cleanList[0] : '');
                    
                    qzConnected.value = true;
                }).catch(err => alert("Could not find printers."));
            };

            if (window.qz.websocket.isActive()) fetchPrinters();
            else window.qz.websocket.connect().then(fetchPrinters).catch(err => alert("Could not connect to QZ Tray. Is the app running?"));
        };

        const printLabels = async () => {
            if (!selectedPrinter.value) return alert("Please select a printer.");
            
            let codeString = isListView.value ? getCombinedListCode() : engineState.codeEditor?.getValue();
            if (!codeString || !codeString.trim()) return alert("No code to print.");

            const detectedLang = codeString.includes('^XA') ? 'zpl' : 'epl';
            
            const dpi = settings.value.density === '12' ? 300 : 203;
            let wIn, hIn;
            if (settings.value.size === 'custom') {
                wIn = parseFloat(settings.value.customW) || 2.25; hIn = parseFloat(settings.value.customH) || 1.25;
            } else {
                const parts = settings.value.size.split('x');
                wIn = parseFloat(parts[0]); hIn = parseFloat(parts[1]);
            }
            const targetW = Math.round(wIn * dpi); 
            const targetH = Math.round(hIn * dpi);

            let labelBlocks = [];
            if (detectedLang === 'zpl') {
                let zplBlocks = codeString.match(/\^XA[\s\S]*?\^XZ/gi) || [];
                labelBlocks = zplBlocks.filter(block => block.match(/\^FD|\^B[A-Z0-9]/i));
            } else {
                const lines = codeString.split(/\r?\n/);
                let activeSetup = {}; let currentBlock = [];
                for (let line of lines) {
                    let trimmed = line.trim(); if (!trimmed) continue;
                    let cmd = trimmed.charAt(0).toUpperCase();
                    if (['D', 'Z', 'Q', 'O', 'I', 'S'].includes(cmd)) { activeSetup[trimmed.charAt(0)] = trimmed; currentBlock.push(trimmed); } 
                    else if (cmd === 'N') { currentBlock = Object.values(activeSetup); currentBlock.push(trimmed); } 
                    else if (cmd === 'P') { currentBlock.push(trimmed); labelBlocks.push(currentBlock.join('\n') + '\n'); currentBlock = []; } 
                    else { currentBlock.push(trimmed); }
                }
                if (currentBlock.length > 0 && labelBlocks.length === 0) labelBlocks.push(Object.values(activeSetup).concat(currentBlock).join('\n') + '\n');
            }

            if (labelBlocks.length === 0) return alert("Could not parse any valid labels to print.");

            let qzPayload = [];
            for (let block of labelBlocks) {
                let processedBlock = block;
                let detectedSig = null;
                
                if (detectedLang === 'zpl') {
                    const isDemo = processedBlock.includes('^FX_TMS_DEMO^FS');
                    let bcMatch = processedBlock.match(/\^(BX|B0|BQ|BU|BC|B2)/i);
                    let foMatch = processedBlock.match(/\^F[O0T]\s*(-?\d+)\s*,\s*(-?\d+)/i);
                    if (bcMatch && foMatch) {
                         detectedSig = `${isDemo ? 'DEMO_' : ''}ZPL_${getBcType(bcMatch[1])}_${foMatch[1]}_${foMatch[2]}`;
                    }
                } else {
                    const isDemo = processedBlock.includes(';TMS_DEMO');
                    let match = processedBlock.match(/^b(-?\d+),(-?\d+),([A-Z0-9]+),/im);
                    if (match) {
                         detectedSig = `${isDemo ? 'DEMO_' : ''}EPL_${getBcType(match[3])}_${match[1]}_${match[2]}`;
                    }
                }
                
                let rule = getCalibrationRule(detectedSig);
                let isPrimary = (!isListView.value || selectedFiles.value.length <= 1);
                
                let globalX = 0;
                let globalY = isPrimary ? parseInt(settings.value.offsetY || 0) : (rule && rule.offsetY !== undefined ? parseInt(rule.offsetY) : 0);

                // ====================================================================
                //  TOGGLE ENFORCEMENT: Hardware Math vs Manual Offset
                // ====================================================================
                if (settings.value.isHardwareCenteringActive) {
                    globalX = (renderState.autoHardwareOffsetX || 0);
                } else {
                    globalX = isPrimary ? parseInt(settings.value.offsetX || 0) : (rule && rule.offsetX !== undefined ? parseInt(rule.offsetX) : 0);
                }

                if (detectedLang === 'zpl') {
                    //  NEW: Master Global Canvas Offset applied to Hardware Prints!
                    let zplMasterOffsetX = 0; 
                    let zplMasterOffsetY = 0; 
                    
                    globalX += zplMasterOffsetX;
                    globalY += zplMasterOffsetY;

                    processedBlock = processedBlock.replace(/\^PW\d+/gi, '').replace(/\^LL\d+/gi, '').replace(/\^XA/gi, `^XA\n^PW${targetW}\n^LL${targetH}`);
                    
                    const isDemoLabel = processedBlock.includes('^FX_TMS_DEMO^FS');
                    
                    // 1. ISOLATED BARCODE TWEAKS
                    processedBlock = processedBlock.replace(/\^F[O0T]\s*(-?\d+)\s*,\s*(-?\d+)(.*?)\^(BX|B0|BQ|BU|BC|B2)([^\^]*)/gi, (match, x, y, between, bcType, params) => {
                        let sig = `${isDemoLabel ? 'DEMO_' : ''}ZPL_${getBcType(bcType)}_${x}_${y}`;
                        let bcRule = getCalibrationRule(sig);
                        let isBcPrimary = isPrimary && engineState.primaryZplSignature === sig;
                        
                        let tDm = isBcPrimary ? parseFloat(settings.value.dmOffset || 0) : (bcRule ? parseFloat(bcRule.dmOffset || 0) : 0);
                        let tX = isBcPrimary ? parseInt(settings.value.bcMoveX || 0) : (bcRule ? parseInt(bcRule.bcMoveX || 0) : 0);
                        let tY = isBcPrimary ? parseInt(settings.value.bcMoveY || 0) : (bcRule ? parseInt(bcRule.bcMoveY || 0) : 0);
                        
                        let newX = parseInt(x) + tX;
                        let newY = parseInt(y) + tY;
                        
                        let newParams = params;
                        let qrSize = 0;
                        
                        if (tDm !== 0) {
                            if (bcType.toUpperCase() === 'BX' || bcType.toUpperCase() === 'B0') {
                                let pArr = params.split(',');
                                if (pArr.length > 1) {
                                    pArr[1] = Math.max(1, Math.round(parseFloat(pArr[1]) + tDm));
                                    newParams = pArr.join(',');
                                }
                            } else if (bcType.toUpperCase() === 'BQ') {
                                let pArr = params.split(',');
                                if (pArr.length > 2) {
                                    pArr[2] = Math.max(1, Math.round(parseFloat(pArr[2]) + tDm));
                                    qrSize = pArr[2];
                                    newParams = pArr.join(',');
                                }
                            }
                        } else if (bcType.toUpperCase() === 'BQ') {
                            let pArr = params.split(',');
                            if (pArr.length > 2) qrSize = parseFloat(pArr[2]) || 4;
                        }

                        if (bcType.toUpperCase() === 'BQ' && qrSize > 0) {
                            let quietZoneOffset = qrSize * 4; 
                            newX = newX - quietZoneOffset;
                            newY = newY - quietZoneOffset;
                        }
                        
                        return `^FO${Math.round(newX)},${Math.round(newY)}${between}^${bcType}${newParams}`;
                    });

                    // 2. MASTER CANVAS SHIFT
                    if (globalX !== 0 || globalY !== 0) {
                        processedBlock = processedBlock.replace(/\^F([O0T])\s*(-?\d+)\s*,\s*(-?\d+)/gi, (match, cmd, x, y) => {
                            let newX = parseInt(x) + globalX;
                            let newY = parseInt(y) + globalY;
                            return `^F${cmd}${newX},${newY}`;
                        });
                    }

                    //  HARDWARE REVERSE (ZPL)
                    if (settings.value.rotation === 180) {
                        processedBlock = processedBlock.replace(/\^PO[NI]/gi, ''); // Strip existing orientations
                        processedBlock = processedBlock.replace(/\^XA/gi, '^XA\n^POI'); // Force Invert
                    }

                } else {
                    //  1. STABLE RAW PAYLOAD (No more aggressive Q/q rewriting!)
                    // We let the physical Zebra printer handle the gap sensing naturally.
                    
                    let baseOffsetX = isPrimary ? parseInt(settings.value.offsetX || 0) : (rule && rule.offsetX !== undefined ? parseInt(rule.offsetX) : 0);
                    let baseOffsetY = isPrimary ? parseInt(settings.value.offsetY || 0) : (rule && rule.offsetY !== undefined ? parseInt(rule.offsetY) : 0);

                    //  2. NO HARDWARE MATH ON PHYSICAL PRINTS!
                    // The Zebra mechanical rollers naturally handle mismatches. 
                    // We only apply the exact manual offsets from your UI sliders!
                    let finalX = baseOffsetX;
                    let finalY = baseOffsetY;
                    
                    const isDemoLabel = processedBlock.includes(';TMS_DEMO');
                    
                    // 3. ISOLATED BARCODE TWEAKS
                    processedBlock = processedBlock.replace(/^b(-?\d+),(-?\d+),([A-Z0-9]+),(.*)$/gim, (match, x, y, type, params) => {
                        let sig = `${isDemoLabel ? 'DEMO_' : ''}EPL_${getBcType(type)}_${x}_${y}`;
                        let bcRule = getCalibrationRule(sig);
                        let isBcPrimary = isPrimary && engineState.primaryEplSignature === sig;
                        
                        let tX = isBcPrimary ? parseInt(settings.value.bcMoveX || 0) : (bcRule ? parseInt(bcRule.bcMoveX || 0) : 0);
                        let tY = isBcPrimary ? parseInt(settings.value.bcMoveY || 0) : (bcRule ? parseInt(bcRule.bcMoveY || 0) : 0);
                        
                        return `b${parseInt(x) + tX},${parseInt(y) + tY},${type},${params}`;
                    });

                    // 4. MASTER CANVAS SHIFT (Only applies if user manually moves sliders)
                    if (finalX !== 0 || finalY !== 0) {
                        processedBlock = processedBlock.replace(/^([AbBX]|LE|LO|LS)(-?\d+),(-?\d+),(.*)$/gim, (match, cmd, x, y, rest) => {
                            return `${cmd}${parseInt(x) + finalX},${parseInt(y) + finalY},${rest}`;
                        });
                    }

                    // 5. HARDWARE REVERSE (EPL) - Safe to keep!
                    if (settings.value.rotation === 180) {
                        let isCurrentlyZB = /^[ \t]*ZB\r?\n/im.test(processedBlock);
                        processedBlock = processedBlock.replace(/^[ \t]*Z[TB]\r?\n/gim, ''); 
                        let invertedCmd = isCurrentlyZB ? 'ZT' : 'ZB';
                        processedBlock = `${invertedCmd}\r\n` + processedBlock; 
                    }
                }
                qzPayload.push({ type: 'raw', format: 'command', data: processedBlock });
            }
            
            try {
                const config = window.qz.configs.create(selectedPrinter.value);
                await window.qz.print(config, qzPayload);
                alert(`✅ Successfully spooled ${labelBlocks.length} label(s) to printer!`);
            } catch (e) { alert("Print Failed: " + e); }
        };

        const exportLabels = () => {
            renderedLabels.value.forEach((label, i) => {
                if (label.src && !label.error) {
                    const a = document.createElement('a'); a.href = label.src; a.download = `label_${i+1}.png`; a.click();
                }
            });
        };

    return {
        renderLabelLocally,
        renderState,
        processAutoDetectSizing,
        triggerRender,
        debounce,
        debouncedRender,
        connectQZ,
        printLabels,
        exportLabels
    };
}