const fs = require('fs');
const path = require('path');

console.log("🛡️ Running TMS Tools Deep Path Patcher...");

// 1. Fix ES Module Imports directly inside app.js
const appJsPath = path.join('tools', 'label-simulator', 'js', 'app.js');
if (fs.existsSync(appJsPath)) {
    let appJs = fs.readFileSync(appJsPath, 'utf8');
    
    // Correct absolute or broken relative paths to point strictly to ../libs/
    appJs = appJs.replace(/from\s+['"]\/libs\//g, "from '../libs/");
    appJs = appJs.replace(/from\s+['"]\.\/libs\//g, "from '../libs/");
    appJs = appJs.replace(/import\s+['"]\/libs\//g, "import '../libs/");
    appJs = appJs.replace(/import\s+['"]\.\/libs\//g, "import '../libs/");
    
    // Hard-wire bare Vue imports directly to the local dependency
    appJs = appJs.replace(/from\s+['"]vue['"]/g, "from '../libs/vue.esm-browser.prod.js'");
    appJs = appJs.replace(/import\s+['"]vue['"]/g, "import '../libs/vue.esm-browser.prod.js'");
    
    fs.writeFileSync(appJsPath, appJs);
    console.log("✅ Fixed ES Module relativity paths inside app.js");
} else {
    console.log(`⚠️ Could not find ${appJsPath}`);
}

// 2. Clean and secure sandbox.html
const sandboxPath = path.join('tools', 'label-simulator', 'sandbox.html');
if (fs.existsSync(sandboxPath)) {
    let html = fs.readFileSync(sandboxPath, 'utf8');
    
    // Strip out old script setups and failed import maps
    html = html.replace(/<script src="\.\/libs\/vue\.global\.prod\.js"><\/script>/g, '');
    html = html.replace(/<script src="\.\/js\/app\.js"><\/script>/g, '');
    html = html.replace(/<script type="module" src="\.\/js\/app\.js"><\/script>/g, '');
    html = html.replace(/<script type="importmap">[\s\S]*?<\/script>/g, '');

    // Ensure brand logo path is correctly mapped to centralized assets
    html = html.replace(/src="\.\/icon48\.png"/g, 'src="../../assets/icons/icon48.png"');

    // Inject the clean ES module execution script
    const secureScripts = `\n    <!-- 100% Local Processing Scripts -->\n    <script type="module" src="./js/app.js"></script>\n</body>`;
    html = html.replace(/<\/body>/, secureScripts);
    
    fs.writeFileSync(sandboxPath, html);
    console.log("✅ Cleaned and patched sandbox.html");
}

// 3. Fix Manifest V3 Sandbox Permissions for Vue eval compilation
const manifestPath = 'manifest.json';
if (fs.existsSync(manifestPath)) {
    try {
        let manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        if (manifest.sandbox && Array.isArray(manifest.sandbox.pages)) {
            // Update the sandbox permission to match the new nested architecture
            manifest.sandbox.pages = [
                "tools/label-simulator/sandbox.html"
            ];
            fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
            console.log("✅ Fixed Manifest V3 sandbox path to allow Vue processing.");
        }
    } catch (e) {
        console.log("⚠️ Could not parse manifest.json.");
    }
}

console.log("🎯 Patch complete! Reload your extension in Chrome.");