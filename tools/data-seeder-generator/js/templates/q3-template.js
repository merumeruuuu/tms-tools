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

            return `
            $productName = '${product.productName.replace(/'/g, "\\'")}';
            $barcode = '${product.productCode}';

            $product = NutritionProductType::where('${C.NAME}', $productName)->first();

            if (!$product) {
                $mfgId = DB::table('${T.MANUFACTURERS}')
                    ->where('ManufacturerName', 'like', '%${(product.manufacturer || 'Undefined').replace(/'/g, "\\'")}%')
                    ->value('ManufacturerID') ?? 3;

                $product = NutritionProductType::create([
                    '${C.NAME}' => $productName,
                    '${C.SHORT_NAME}' => '${(product.shortName || product.productName).replace(/'/g, "\\'")}',
                    '${C.HL7_REF}' => '${product.hl7Reference || ''}',
                    '${C.MFG_ID}' => $mfgId,
                    'formtypeSupportsDirectScanning' => 1,
                    '${C.TYPE}' => ${product.productType || 1},
                    '${C.CATEGORY}' => ${product.categoryId || 3},
                    '${C.UOM}' => '${product.measurementUnit || 'ml'}',
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
                    "measurementUnitID" => '${product.measurementUnit}' === 'ml' ? 1 : 2,
                    "atomicUnitsPerMeasurementUnit" => 1,
                    "decimalPlacesDisplayed" => '${product.measurementUnit}' === 'g' ? 1 : 0
                ]);

                $ffTypeId = ${product.containerType || 1}; 

                $exists = DB::table('${T.APPLICABLE_FF}')
                    ->where('productTypeID', $product->${C.ID})
                    ->where('formFactorTypeID', $ffTypeId)
                    ->exists();

                if (!$exists) {
                    DB::table('${T.APPLICABLE_FF}')->insert([
                        "productTypeID" => $product->${C.ID},
                        "formFactorTypeID" => $ffTypeId
                    ]);
                }

                $nptItem = NutritionProductTypeItem::create([
                    '${C.ID}' => $product->${C.ID},
                    '${C.ITEM_CODE}' => $barcode,
                    '${C.FF_TYPE_ID}' => $ffTypeId,
                    '${C.UOM}' => '${product.measurementUnit || 'ml'}',
                    '${C.ITEM_VOL}' => ${product.measurementVolume || 100},
                    'formtypeitemName' => $productName,
                    '${C.IS_PROTECTED}' => 1,
                    'formtypeitemActive' => 1
                ]);

                NutritionProductTypeFormFactor::create([
                    '${C.FF_TYPE_ID}' => $ffTypeId,
                    '${C.ITEM_ID}' => $nptItem->${C.ITEM_ID},
                    '${C.FF_PARENT}' => null,
                    '${C.FF_BARCODE}' => $barcode,
                    '${C.FF_QTY}' => ${product.unitQuantity || 1},
                    '${C.IS_PROTECTED}' => 1,
                    'formfactorActive' => 1,
                    'created_at' => Carbon::now() 
                ]);

                NutritionProductTypeHistory::create([
                    'fthistBarcode'            => $barcode,
                    'fthistFormulaID'          => $product->${C.ID},
                    'fthistAction'             => 9000,
                    'fthistDateTime'           => Carbon::now(),
                    'fthistUser'               => 1,
                    'fthistName'               => $productName,
                    'fthistOrder'              => $product->${C.ORDER} ?? $product->${C.ID},
                    'fthistType'               => $product->${C.TYPE},
                    'fthistCategoryID'         => $product->${C.CATEGORY},
                    'fthistMeasurementUnit'    => $product->${C.UOM},
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