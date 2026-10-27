/**
 * WAMP Auto-Detector
 * Detects local builds from URL and searches vhost configurations
 */

class WampDetector {
    constructor() {
    }

    /**
     * Parse URL and extract version info
     */
    parseUrl(url) {
        try {
            // Normalize URL
            if (!/^https?:\/\//i.test(url)) {
                url = 'http://' + url;
            }
            
            const urlObj = new URL(url);
            const hostname = urlObj.hostname.toLowerCase().endsWith('.local')
                ? urlObj.hostname
                : `${urlObj.hostname}.local`;
            const bare = hostname.replace(/\.local$/i, '');

            // Extract client name and the FULL version string (everything from 'v' onward)
            // Patterns:
            // - edward-v7-23-q1-2-9 -> edward, v7-23-q1-2-9, Q1
            // - boston-v7-2-2-6 -> boston, v7-2-2-6, Q2
            // - chla7-v7-3-5 -> chla7, v7-3-5, Q3
            // - southalabamaq4x-v7-4-2 -> southalabamaq4x, v7-4-2, Q4
            const splitMatch = bare.match(/^(.+?)-(v\d.*)$/i);

            if (!splitMatch) {
                throw new Error('Invalid hostname format. Expected: client-vX-Y-Z.local');
            }

            const clientName = splitMatch[1];
            const version = splitMatch[2]; // full, untruncated version string

            // Determine quarter from the version string
            let quarter = '';
            if (/q1|-23-/i.test(version)) {
                quarter = 'Q1';
            } else if (/q2/i.test(version)) {
                quarter = 'Q2';
            } else if (/q3/i.test(version)) {
                quarter = 'Q3';
            } else if (/q4/i.test(version)) {
                quarter = 'Q4';
            } else {
                // Auto-detect based on major-minor numbers (vMAJOR-MINOR-...)
                const numMatch = version.match(/^v(\d+)-(\d+)/i);
                if (numMatch) {
                    const major = parseInt(numMatch[1]);
                    const minor = parseInt(numMatch[2]);
                    if (major === 22) {
                        quarter = 'Q1';
                    } else if (major === 7 && minor === 23) {
                        quarter = 'Q1';
                    } else if (major === 7 && minor === 2) {
                        quarter = 'Q2';
                    } else if (major === 7 && minor === 3) {
                        quarter = 'Q3';
                    } else if (major === 7 && minor === 4) {
                        quarter = 'Q4';
                    }
                }
            }

            if (!quarter) {
                throw new Error('Could not determine build quarter from version');
            }

            return {
                clientName,
                version,
                quarter,
                hostname,
                buildFolderName: bare,
                isValid: true
            };

        } catch (error) {
            return {
                isValid: false,
                error: error.message
            };
        }
    }

    /**
     * Search for local build directory
     * This would normally call a system service, but we simulate the detection
     */
    async detectLocalBuild(urlInfo) {
        if (!urlInfo.isValid) {
            throw new Error(urlInfo.error);
        }

        // Simulate WAMP directory detection
        // In a real scenario, this would:
        // 1. Read Windows registry for WAMP installation
        // 2. Parse Apache vhost configuration
        // 3. Find the matching directory

        const buildPath = await this.constructBuildPath(urlInfo);
        const nextSeederNum = await this.getNextSeederNumber(buildPath);

        return {
            clientName: urlInfo.clientName,
            version: urlInfo.version,
            quarter: urlInfo.quarter,
            hostname: urlInfo.hostname,
            buildFolderName: urlInfo.buildFolderName || urlInfo.hostname.replace(/\.local$/i, ''),
            buildPath,
            nextSeederNum,
            seedersPath: `${buildPath}\\vendor\\timeless\\customers\\src\\Database\\Seeds\\ClientDataUpdates`,
            detected: true
        };
    }

    /**
     * Construct build path based on WAMP installation
     */
    async constructBuildPath(urlInfo) {
        // The browser cannot infer an absolute path; the folder picker resolves it.
        return `${urlInfo.clientName}-${urlInfo.version}`;
    }

    /**
     * Get next seeder number by reading existing seeders
     */
    async getNextSeederNumber(buildPath) {
        // This would normally scan the seeders directory
        // For now, we'll use localStorage to track this
        
        const existingSeederNumbers = JSON.parse(
            localStorage.getItem('seederNumbers') || '{}'
        );

        const buildKey = buildPath;
        const currentMax = existingSeederNumbers[buildKey] || 165; // Default starting point

        return currentMax + 1;
    }

    /**
     * Update seeder number after generation
     */
    updateSeederNumber(buildPath, newNumber) {
        const existingSeederNumbers = JSON.parse(
            localStorage.getItem('seederNumbers') || '{}'
        );
        
        existingSeederNumbers[buildPath] = newNumber;
        localStorage.setItem('seederNumbers', JSON.stringify(existingSeederNumbers));
    }

    /**
     * Validate the URL format
     */
    validateUrl(url) {
        return this.parseUrl(url).isValid;
    }
}

// Export for use in other modules
const wampDetector = new WampDetector();
