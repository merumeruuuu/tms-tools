/**
 * Seeder Generator Router
 * Routes generation requests to isolated version-specific templates
 */
class SeederGenerator {
    generateSeeder(config) {
        const { seederNumber, quarter, actionType, products, buildInfo } = config;
        
        // Ensure the global namespace exists
        window.SeederTemplates = window.SeederTemplates || {};

        // Route to specific quarter, fallback to Q3 if missing
        const template = window.SeederTemplates[quarter] || window.SeederTemplates['Q3'];
        
        if (!template) {
            throw new Error(`Template for ${quarter} (or fallback Q3) not found. Check your HTML script tags.`);
        }

        const seederClass = `DATA${seederNumber}`;
        return template(seederClass, products, actionType, buildInfo);
    }
}

const seederGenerator = new SeederGenerator();