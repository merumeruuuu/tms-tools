window.SeederTemplates = window.SeederTemplates || {};

window.SeederTemplates.Q3 = function(className, products, action, buildInfo) {
    const T = DB_SCHEMA.TABLES;
    const C = DB_SCHEMA.COLUMNS;

    let operationCode = '';

    if (action === 'create') {
        operationCode = products.map(product => {
            const canBeBase = product.productUse === 'base' ? 1 : 0;
            const canBeFortifier = product.productUse === 'fortifier' ? 1 : 0;
            const canBeModular = product.productUse === 'modular' ? 1 : 0;
            
            // Map the Javascript category ID back to its string name for the dynamic lookup
            let catName = 'Formula';
            if (product.categoryId == 5) catName = 'Additive';
            else if (product.categoryId == 1) catName = 'EHM'; // Or EBM
            else if (product.categoryId == 2) catName = 'DHM';

            // Generate the dynamic hierarchy form factors
            let formFactorCode = '';
            if (product.hierarchy && product.hierarchy.length > 0) {
                const ffMappings = { '1': 'Bottle', '2': 'Carton', '3': 'Can', '4': 'Case', '6': 'Packet', '10': 'Tetra Pak' };
                
                // The innermost unit is always index 0
                const innerFfName = ffMappings[product.hierarchy[0].containerId] || 'Bottle';
                
                formFactorCode = `
                $innerFfId = DB::table('nutrition_product_form_factor_types')->where('name', '${innerFfName}')->value('id') ?? 1;

                $nptItem = NutritionProductTypeItem::create([
                    '${C.ID}' => $product->${C.ID},
                    '${C.ITEM_CODE}' => $barcode,
                    '${C.FF_TYPE_ID}' => $innerFfId,
                    '${C.UOM}' => $unitName,
                    '${C.ITEM_VOL}' => ${product.hierarchy[0].volume || product.measurementVolume || 100},
                    'formtypeitemName' => $productName,
                    '${C.IS_PROTECTED}' => 1,
                    'formtypeitemActive' => 1
                ]);

                $parentId = null;`;

                // Loop the array BACKWARDS (from outermost container to innermost container)
                for (let i = product.hierarchy.length - 1; i >= 0; i--) {
                    const ff = product.hierarchy[i];
                    const ffName = ffMappings[ff.containerId] || 'Bottle';
                    
                    formFactorCode += `
                $ffType_${i} = DB::table('nutrition_product_form_factor_types')->where('name', '${ffName}')->value('id') ?? 1;
                
                $ff_${i} = NutritionProductTypeFormFactor::create([
                    '${C.FF_TYPE_ID}' => $ffType_${i},
                    '${C.ITEM_ID}' => $nptItem->${C.ITEM_ID},
                    '${C.FF_PARENT}' => $parentId,
                    '${C.FF_BARCODE}' => '${ff.barcode}',
                    '${C.FF_QTY}' => ${ff.quantity},
                    '${C.IS_PROTECTED}' => 1,
                    'formfactorActive' => 1,
                    'created_at' => Carbon::now() 
                ]);
                $parentId = $ff_${i}->id; // The inner container will use this as its parent
                `;
                }
                
            } else {
                // Fallback for missing hierarchy data
                const fallbackFfName = 'Bottle'; 
                formFactorCode = `
                $fallbackFfId = DB::table('nutrition_product_form_factor_types')->where('name', '${fallbackFfName}')->value('id') ?? 1;

                $nptItem = NutritionProductTypeItem::create([
                    '${C.ID}' => $product->${C.ID},
                    '${C.ITEM_CODE}' => $barcode,
                    '${C.FF_TYPE_ID}' => $fallbackFfId,
                    '${C.UOM}' => $unitName,
                    '${C.ITEM_VOL}' => ${product.measurementVolume || 100},
                    'formtypeitemName' => $productName,
                    '${C.IS_PROTECTED}' => 1,
                    'formtypeitemActive' => 1
                ]);

                NutritionProductTypeFormFactor::create([
                    '${C.FF_TYPE_ID}' => $fallbackFfId,
                    '${C.ITEM_ID}' => $nptItem->${C.ITEM_ID},
                    '${C.FF_PARENT}' => null,
                    '${C.FF_BARCODE}' => $barcode,
                    '${C.FF_QTY}' => ${product.unitQuantity || 1},
                    '${C.IS_PROTECTED}' => 1,
                    'formfactorActive' => 1,
                    'created_at' => Carbon::now() 
                ]);
                `;
            }

            return `
            $productName = '${product.productName.replace(/'/g, "\\'")}';
            $barcode = '${product.productCode}';

            $product = NutritionProductType::where('${C.NAME}', $productName)->first();

            if (!$product) {
                // Dynamic lookups to prevent hardcoded ID mismatches
                $mfgSearch = '${(product.manufacturer || 'Undefined').replace(/'/g, "\\'")}';
                
                // Search both Name and Description columns, fallback to 3 (Undefined)
                $mfgId = DB::table('${T.MANUFACTURERS}')
                    ->where('ManufacturerName', 'like', '%' . $mfgSearch . '%')
                    ->orWhere('ManufacturerDescription', 'like', '%' . $mfgSearch . '%')
                    ->value('ManufacturerID') 
                    ?? DB::table('${T.MANUFACTURERS}')->where('ManufacturerName', 'Undefined')->value('ManufacturerID') ?? 3;

                $catId = DB::table('nutrition_product_categories')
                    ->where('name', 'like', '%${catName}%')
                    ->value('id') ?? 3;

                $unitName = '${product.measurementUnit || 'ml'}';
                // Find numeric ID for context tables
                $unitId = DB::table('nutrition_product_measurement_units')
                    ->where('singularName', 'like', $unitName . '%')
                    ->value('id') ?? ($unitName === 'g' ? 2 : 1);

                $product = NutritionProductType::create([
                    '${C.NAME}' => $productName,
                    '${C.SHORT_NAME}' => '${(product.shortName || product.productName).replace(/'/g, "\\'")}',
                    '${C.HL7_REF}' => '${product.hl7Reference || ''}',
                    '${C.MFG_ID}' => $mfgId,
                    'formtypeSupportsDirectScanning' => 1,
                    '${C.TYPE}' => ${product.productType || 1},
                    '${C.CATEGORY}' => $catId,
                    '${C.UOM}' => $unitName,
                    '${C.EXP_OPEN}' => ${product.expirationOpened || 48},
                    '${C.BASE_CAL}' => ${product.caloricValue || 20},
                    '${C.DISPLACEMENT}' => ${product.displacement || 1.00},
                    '${C.IS_BASE}' => ${canBeBase},
                    '${C.IS_FORT}' => ${canBeFortifier},
                    '${C.IS_MOD}' => ${canBeModular},
                    'formtypeWaterDisplacement' => 0.00,
                    'formtypeBreastmilkDisplacement' => 0.00,
                    '${C.CAL_PER_OZ}' => ${product.caloricValue || 20},
                    'formtypeCalPerGram' => 0.00,
                    '${C.EXP_PREP}' => ${product.expirationPrepared || 48},
                    '${C.BARCODE}' => $barcode,
                    '${C.ACTIVE}' => 1,
                    'useAsDbm' => 0
                ]);

                $product->update(['${C.ORDER}' => $product->${C.ID}]);

                DB::table('${T.ADDITIVE_CONTEXT}')->insert([
                    "productID" => $product->${C.ID},
                    "measurementUnitID" => $unitId,
                    "atomicUnitsPerMeasurementUnit" => 1,
                    "decimalPlacesDisplayed" => $unitName === 'g' ? 1 : 0
                ]);

                ${formFactorCode}

                $exists = DB::table('${T.APPLICABLE_FF}')
                    ->where('productTypeID', $product->${C.ID})
                    ->where('formFactorTypeID', $nptItem->${C.FF_TYPE_ID})
                    ->exists();

                if (!$exists) {
                    DB::table('${T.APPLICABLE_FF}')->insert([
                        "productTypeID" => $product->${C.ID},
                        "formFactorTypeID" => $nptItem->${C.FF_TYPE_ID}
                    ]);
                }

                NutritionProductTypeHistory::create([
                    'fthistBarcode'            => $barcode,
                    'fthistFormulaID'          => $product->${C.ID},
                    'fthistAction'             => 9000,
                    'fthistDateTime'           => Carbon::now(),
                    'fthistUser'               => 1,
                    'fthistName'               => $productName,
                    'fthistOrder'              => $product->${C.ORDER} ?? $product->${C.ID},
                    'fthistType'               => $product->${C.TYPE},
                    'fthistCategoryID'         => $catId,
                    'fthistMeasurementUnit'    => $unitName,
                    'fthistOpenExpirationDate' => $product->${C.EXP_OPEN},
                    'fhistBaseCaloricValue'    => $product->${C.BASE_CAL},
                    'fthistDisplacement'       => $product->${C.DISPLACEMENT},
                ]);

            } else {
                $this->command->warn("-> Skipped: $productName already exists.");
            }`;
        }).join('\n\n');
    } else if (action === 'barcode-update') {
        operationCode = products.map(product => {
            return `
            NutritionProductTypeItem::where('${C.ITEM_CODE}', '${product.oldProductCode}')
                ->update(['${C.ITEM_CODE}' => '${product.newProductCode}']);
            
            NutritionProductTypeFormFactor::where('${C.FF_BARCODE}', '${product.oldProductCode}')
                ->update(['${C.FF_BARCODE}' => '${product.newProductCode}']);`;
        }).join('\n\n');
    }

    return `<?php

namespace TMS\\Customers\\Database\\Seeds\\ClientDataUpdates;

use Illuminate\\Database\\Seeder;
use Illuminate\\Support\\Facades\\DB;
use TMS\\Customers\\Database\\Models\\AutomatedUpdates;
use App\\Models\\NutritionProductType;
use App\\Models\\NutritionProductTypeItem;
use App\\Models\\NutritionProductTypeFormFactor;
use App\\Models\\NutritionProductTypeHistory;
use Carbon\\Carbon;

class ${className} extends Seeder
{
    public function run()
    {
        try {
            DB::statement('SET FOREIGN_KEY_CHECKS=0;');
            DB::beginTransaction();

            $this->command->info("Starting ${className} Seeder...");
${operationCode}

            AutomatedUpdates::insert([
                'updateDateTime'  => Carbon::now(),
                'updateTimestamp' => class_basename($this)
            ]);

            DB::statement('SET FOREIGN_KEY_CHECKS=1;');
            DB::commit();

            $this->command->info("========================================");
            $this->command->info("${className} SEEDER COMPLETED SUCCESSFULLY");
            $this->command->info("========================================");

        } catch (\\Exception $e) {
            DB::statement('SET FOREIGN_KEY_CHECKS=1;');
            DB::rollBack();
            $this->command->error("SEEDER FAILED: " . $e->getMessage());
            throw $e;
        }
    }
}
`;
};