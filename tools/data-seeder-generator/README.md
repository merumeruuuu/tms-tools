# Data Seeder Generator

**Version:** 1.0.0  
**Status:** Production Ready  
**Target Versions:** Q1-Q4 (v7.23, v7.2-v7.3, v7.3-v7.4, v7.4+)

## Overview

The **Data Seeder Generator** is a powerful Laravel seeder generation tool that automates the creation of PHP seeders for nutrition product data updates across multiple TMS application versions. It intelligently adapts seeder code based on the target build version, supporting both simple updates and complex multi-table operations.

### Key Features

✅ **Smart Build Detection** - Auto-detects local WAMP builds from URLs  
✅ **Multi-Version Support** - Generates appropriate Eloquent patterns for Q1-Q4 versions  
✅ **Three Output Methods** - Auto-write to project, download, or copy to clipboard  
✅ **Bulk CSV Import** - Process multiple products at once with CSV files  
✅ **Favorite Builds** - Save frequently used builds for quick access  
✅ **Auto-Increment Seeder Numbers** - Tracks DATA{n} numbering automatically  
✅ **Real-time Preview** - See generated PHP code before output  
✅ **Version Templates** - Pre-built patterns for each TMS version quarter  

## Supported Versions

| Quarter | Version Pattern | Eloquent Support | Raw SQL | Examples |
|---------|-----------------|------------------|---------|----------|
| Q1 | v7-23-q1-2-9 | Partial | ✅ Full | edward, promedica |
| Q2 | v7-2-2-6 to v7-2-2-9 | DB::table() | ✅ Full | boston, tampageneral |
| Q3 | v7-3-4-1 to v7-3-5 | ✅ Full (Models) | Limited | chla7, urmc |
| Q4 | v7-4-0 to v7-4-2 | ✅ Full (Advanced) | Limited | atlanta |

## Getting Started

### 1. Select Your Build

```
Step 1: Select Build Target
├─ Choose "Add Product" or "Update Product"
├─ Enter local URL: http://client-version.local/
├─ Click "Detect Build"
└─ (Optional) Save to favorites for quick access
```

**URL Format Examples:**
- `http://boston-v7-2-2-6.local/`
- `http://chla7-v7-3-5.local/`
- `http://atlanta-v7-4-2.local/`
- `http://edward-v7-23-q1-2-9.local/`

### 2. Enter Product Details

Choose one of three input methods:

#### **Manual Entry**
- Fill in product information one at a time
- Click "Add Another Product" for multiple entries
- Supports: Create, Update, Barcode Update, Batch Update

#### **CSV Bulk Import**
- Download the CSV template
- Fill in your products
- Upload and preview
- Click "Use This Data"

#### **Bulk Operations**
- Barcode Correction (mass updates)
- Batch Insert
- Batch Update
- Custom SQL

### 3. Generate & Output

Review the generated seeder code and choose output method:

- **Auto-Write to Project** - Writes directly to seeder directory
- **Download File** - Save as .php file to place manually
- **Copy to Clipboard** - Copy code for pasting anywhere

## CSV Format Guide

### Download Template
The tool provides a template CSV file. Here's the structure:

```csv
action,productName,productCode,oldProductCode,newProductCode,categoryId,productType,measurementUnit,measurementVolume,caloricValue,expirationDays,isProtected,formFactorTypeId,containerFormFactorId,unitQuantity,formFactorName,remarks
barcode-update,Enfamil NeuroPro Gentlease,493904,070074686288,070074686288,3,1,mL,59.147,20,26,0,1,4,6,Can,RTU Update
create,EleCare Jr Unflavored,70074686288,,070074686288,3,1,ml,12.5,20,26,0,1,4,6,Can,New Product
update,Similac Pro-Advance,294502,,294502,3,1,mL,59.147,20,26,0,1,4,6,Can,Quantity update
```

### Column Definitions

| Column | Type | Required | Description | Examples |
|--------|------|----------|-------------|----------|
| action | string | Yes | Type of operation | `create`, `update`, `barcode-update` |
| productName | string | Yes | Product display name | `Enfamil NeuroPro Gentlease` |
| productCode | string | For create | Barcode/UPC code | `493904`, `070074686288` |
| oldProductCode | string | For update | Original code to replace | `070074686288` |
| newProductCode | string | For update | New code value | `070074686288` |
| categoryId | number | No | Category ID (default: 3) | `3`, `4`, `5` |
| productType | number | No | Type ID (default: 1) | `1`, `2` |
| measurementUnit | string | No | Unit of measurement | `mL`, `oz`, `g` |
| measurementVolume | decimal | No | Volume value | `59.147`, `12.5` |
| caloricValue | number | No | Calories per unit | `20`, `24` |
| expirationDays | number | No | Shelf life (default: 26) | `26`, `30`, `52` |
| isProtected | boolean | No | Record protected flag | `0`, `1`, `true`, `false` |
| formFactorTypeId | number | No | Form factor type | `1`, `2`, `4` |
| containerFormFactorId | number | No | Container type | `4`, `6` |
| unitQuantity | number | No | Units per container | `6`, `12` |
| formFactorName | string | No | Form factor name | `Can`, `Case`, `Bottle` |
| remarks | string | No | Notes about change | `RTU Update`, `New Product` |

## Seeder Code Patterns

### Generated Seeder Structure (All Versions)

```php
<?php
namespace TMS\Customers\Database\Seeds\ClientDataUpdates;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use TMS\Customers\Database\Models\AutomatedUpdates;

class DATA166 extends Seeder
{
    public function run()
    {
        try {
            DB::beginTransaction();
            
            // Operations here
            
            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }

        // Log update
        $dataupdate = ['updateDateTime' => date('Y-m-d H:i:s'), 'updateTimestamp' => substr(strrchr(get_class(), '\\'), 1)];
        (new AutomatedUpdates())->insert($dataupdate);
    }
}
```

### Version-Specific Patterns

#### Q1 (Raw SQL Focus)
```php
DB::statement(DB::raw("UPDATE nutrition_product_types SET formtypeName = 'NewName' WHERE formtypeID = 123"));
```

#### Q2 (DB Facade)
```php
DB::table('nutrition_product_types')
    ->where('formtypeID', 123)
    ->update(['formtypeName' => 'NewName']);
```

#### Q3/Q4 (Eloquent Models)
```php
NutritionProductType::find(123)->update(['formtypeName' => 'NewName']);
```

## Favorites System

Save builds for quick access in future sessions:

```
✓ Saved Build Favorites
├─ boston-v7-2-2-6 (Q2)
├─ chla7-v7-3-5 (Q3)  
├─ atlanta-v7-4-2 (Q4)
└─ edward-v7-23-q1-2-9 (Q1)
```

Click **Use** to load a favorite, or **×** to remove it.

## File Structure

```
data-seeder-generator/
├── index.html                 # Main interface
├── css/
│   └── style.css             # Styling
└── js/
    ├── app.js                # Main application logic
    ├── wamp-detector.js      # Build detection
    ├── seeder-generator.js   # Seeder generation
    └── csv-handler.js        # CSV parsing
```

## Storage & Persistence

### Local Storage Keys

- `seederFavorites` - Saved build configurations (JSON array)
- `seederNumbers` - Tracked DATA{n} numbers by build path

## API Reference

### WampDetector

```javascript
const detector = new WampDetector();

// Parse URL and extract version info
const urlInfo = detector.parseUrl('http://boston-v7-2-2-6.local/');

// Detect build and get full info
const buildInfo = await detector.detectLocalBuild(urlInfo);

// Validate URL format
const isValid = detector.validateUrl(url);

// Update seeder tracking
detector.updateSeederNumber(buildPath, 166);
```

### SeederGenerator

```javascript
const generator = new SeederGenerator();

// Generate seeder code
const php = generator.generateSeeder({
    seederNumber: 166,
    quarter: 'Q2',
    actionType: 'create',
    products: [{...}],
    buildInfo: {...}
});
```

### CsvHandler

```javascript
const csv = new CsvHandler();

// Download template
csv.downloadTemplate();

// Parse CSV file
const products = await csv.parseFile(file);

// Validate data
const errors = csv.validate(products);
```

## Troubleshooting

### Build Not Detected

**Problem:** URL validation fails  
**Solution:** Ensure URL format is `http://client-version.local/`

### Seeder Number Not Incrementing

**Problem:** DATA number stuck at same value  
**Solution:** Clear localStorage or manually update via browser console:
```javascript
let nums = JSON.parse(localStorage.getItem('seederNumbers') || '{}');
nums['your-build-path'] = 166;
localStorage.setItem('seederNumbers', JSON.stringify(nums));
```

### CSV Upload Fails

**Problem:** CSV parsing error  
**Solution:** 
- Ensure CSV uses proper comma separation
- Check for unmatched quotes
- Verify all required columns present
- No special characters in field values

## Advanced Usage

### Custom SQL Operations

For complex operations not covered by standard templates, use the "Custom SQL (Raw)" option and paste your Illuminate\Database\Seeder-compatible SQL.

### Batch Operations

Handle multiple products efficiently:
- Use CSV for 10+ products
- Batch update operations (Q2+)
- Barcode corrections in bulk

## Development Notes

### Adding New Version Support

To add support for a new version quarter:

1. Add quarter detection to `wampDetector.parseUrl()`
2. Create new template method in `SeederGenerator`
3. Add template to `this.templates` object
4. Test with sample products

### Extending Form Fields

Edit `getFormFields()` in `app.js` to add new form fields for specific action types.

## Performance

- **CSV Parsing:** Up to 1000 rows (limited by browser)
- **Seeder Generation:** < 100ms for typical operation
- **Memory:** ~2-5MB with full favorites loaded

## Security Considerations

- ✅ All processing happens locally (no server calls)
- ✅ No credentials stored
- ✅ HIPAA-safe (local only)
- ⚠️ Build paths stored in localStorage (not encrypted)

## Version History

### v1.0.0 (Current)
- Initial release
- Q1-Q4 support
- CSV bulk import
- Favorites system
- Three output methods

## Support & Feedback

For issues or feature requests, contact the TMS development team.

---

**Last Updated:** 2026-08-20  
**Maintained By:** TMS Development Team
