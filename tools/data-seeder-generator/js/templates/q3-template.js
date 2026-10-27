window.SeederTemplates = window.SeederTemplates || {};

window.SeederTemplates.Q3 = function(className, products, action, buildInfo) {
    const T = DB_SCHEMA.TABLES;
    const C = DB_SCHEMA.COLUMNS;

    let operationCode = '';

    // 1. Separate the products by their individual actions
    const creates = products.filter(p => p.action === 'create');
    const updates = products.filter(p => p.action === 'update');
    const barcodeUpdates = products.filter(p => p.action === 'barcode-update');

    // ==========================================
    // BLOCK 1: CREATE PRODUCTS
    // ==========================================
    if (creates.length > 0) {
        let createData = creates.map(product => {
            const canBeBase = product.productUse === 'base' ? 1 : 0;
            const canBeFortifier = product.productUse === 'fortifier' ? 1 : 0;
            const canBeModular = product.productUse === 'modular' ? 1 : 0;
            
            let catName = 'Formula';
            if (product.categoryId == 5) catName = 'Additive';
            else if (product.categoryId == 1) catName = 'EHM'; 
            else if (product.categoryId == 2) catName = 'DHM';

            let hierarchyStr = '[]';
            if (product.hierarchy && product.hierarchy.length > 0) {
                const ffMappings = { '1': 'Bottle', '2': 'Carton', '3': 'Can', '4': 'Case', '6': 'Packet', '10': 'Tetra Pak' };
                let hArray = product.hierarchy.map(ff => {
                    return `[
                        'name' => '${ffMappings[ff.containerId] || 'Bottle'}',
                        'barcode' => '${(ff.barcode || '').replace(/'/g, "\\'")}',
                        'quantity' => ${ff.quantity || 0},
                        'volume' => ${ff.volume || product.measurementVolume || 100}
                    ]`;
                });
                hierarchyStr = `[\n                    ${hArray.join(',\n                    ')}\n                ]`;
            } else {
                hierarchyStr = `[[
                    'name' => 'Bottle', 'barcode' => '${(product.productCode || '').replace(/'/g, "\\'")}',
                    'quantity' => ${product.unitQuantity || 1}, 'volume' => ${product.measurementVolume || 100}
                ]]`;
            }

            return `            [
                'productName' => '${(product.productName || '').replace(/'/g, "\\'")}',
                'barcode' => '${(product.productCode || '').replace(/'/g, "\\'")}',
                'manufacturer' => '${(product.manufacturer || 'Undefined').replace(/'/g, "\\'")}',
                'shortName' => '${(product.shortName || product.productName || '').replace(/'/g, "\\'")}',
                'hl7Reference' => '${(product.hl7Reference || '').replace(/'/g, "\\'")}',
                'productType' => ${product.productType || 1},
                'catName' => '${catName}',
                'unitName' => '${product.measurementUnit || 'ml'}',
                'expirationOpened' => ${product.expirationOpened || 48},
                'caloricValue' => ${product.caloricValue || 20},
                'displacement' => ${product.displacement || 1.00},
                'canBeBase' => ${canBeBase},
                'canBeFortifier' => ${canBeFortifier},
                'canBeModular' => ${canBeModular},
                'expirationPrepared' => ${product.expirationPrepared || 48},
                'hierarchy' => ${hierarchyStr}
            ]`;
        }).join(',\n');

        operationCode += `
        // ---------------------------------------------------------
        // CREATE PRODUCTS
        // ---------------------------------------------------------
        $createProducts = [
${createData}
        ];

        foreach ($createProducts as $p) {
            $productName = $p['productName'];
            $barcode = $p['barcode'];

            $mfgId = DB::table('${T.MANUFACTURERS}')
                ->where('ManufacturerName', 'like', '%' . $p['manufacturer'] . '%')
                ->orWhere('ManufacturerDescription', 'like', '%' . $p['manufacturer'] . '%')
                ->value('ManufacturerID') 
                ?? DB::table('${T.MANUFACTURERS}')->where('ManufacturerName', 'Undefined')->value('ManufacturerID') ?? 3;

            $catId = DB::table('nutrition_product_categories')
                ->where('name', 'like', '%' . $p['catName'] . '%')
                ->value('id') ?? 3;

            $unitId = DB::table('nutrition_product_measurement_units')
                ->where('singularName', 'like', $p['unitName'] . '%')
                ->value('id') ?? ($p['unitName'] === 'g' ? 2 : 1);

            $product = NutritionProductType::firstOrCreate(
                ['${C.NAME}' => $productName],
                [
                    '${C.SHORT_NAME}' => $p['shortName'],
                    '${C.HL7_REF}' => $p['hl7Reference'],
                    '${C.MFG_ID}' => $mfgId,
                    'formtypeSupportsDirectScanning' => 1,
                    '${C.TYPE}' => $p['productType'],
                    '${C.CATEGORY}' => $catId,
                    '${C.UOM}' => $p['unitName'],
                    '${C.EXP_OPEN}' => $p['expirationOpened'],
                    '${C.BASE_CAL}' => $p['caloricValue'],
                    '${C.DISPLACEMENT}' => $p['displacement'],
                    '${C.IS_BASE}' => $p['canBeBase'],
                    '${C.IS_FORT}' => $p['canBeFortifier'],
                    '${C.IS_MOD}' => $p['canBeModular'],
                    'formtypeWaterDisplacement' => 0.00,
                    'formtypeBreastmilkDisplacement' => 0.00,
                    '${C.CAL_PER_OZ}' => $p['caloricValue'],
                    'formtypeCalPerGram' => 0.00,
                    '${C.EXP_PREP}' => $p['expirationPrepared'],
                    '${C.BARCODE}' => $barcode,
                    '${C.ACTIVE}' => 1,
                    'useAsDbm' => 0
                ]
            );

            if ($product->wasRecentlyCreated) {
                $product->update(['${C.ORDER}' => $product->${C.ID}]);

                DB::table('${T.ADDITIVE_CONTEXT}')->insert([
                    "productID" => $product->${C.ID},
                    "measurementUnitID" => $unitId,
                    "atomicUnitsPerMeasurementUnit" => 1,
                    "decimalPlacesDisplayed" => $p['unitName'] === 'g' ? 1 : 0
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
                    'fthistCategoryID'         => $catId,
                    'fthistMeasurementUnit'    => $p['unitName'],
                    'fthistOpenExpirationDate' => $product->${C.EXP_OPEN},
                    'fhistBaseCaloricValue'    => $product->${C.BASE_CAL},
                    'fthistDisplacement'       => $product->${C.DISPLACEMENT},
                ]);
            }

            $itemExists = NutritionProductTypeItem::where('${C.ID}', $product->${C.ID})
                ->where('${C.ITEM_CODE}', $barcode)
                ->exists();

            if (!$itemExists) {
                $hierarchyCount = count($p['hierarchy']);
                $parentId = null;
                $nptItem = null;

                $innerFf = $p['hierarchy'][0];
                $innerFfId = DB::table('nutrition_product_form_factor_types')->where('name', $innerFf['name'])->value('id') ?? 1;

                $nptItem = NutritionProductTypeItem::create([
                    '${C.ID}' => $product->${C.ID},
                    '${C.ITEM_CODE}' => $barcode,
                    '${C.FF_TYPE_ID}' => $innerFfId,
                    '${C.UOM}' => $p['unitName'],
                    '${C.ITEM_VOL}' => $innerFf['volume'],
                    'formtypeitemName' => $productName,
                    '${C.IS_PROTECTED}' => 1,
                    'formtypeitemActive' => 1
                ]);

                for ($i = $hierarchyCount - 1; $i >= 0; $i--) {
                    $ff = $p['hierarchy'][$i];
                    $ffTypeId = DB::table('nutrition_product_form_factor_types')->where('name', $ff['name'])->value('id') ?? 1;

                    $newFf = NutritionProductTypeFormFactor::create([
                        '${C.FF_TYPE_ID}' => $ffTypeId,
                        '${C.ITEM_ID}' => $nptItem->${C.ITEM_ID},
                        '${C.FF_PARENT}' => $parentId,
                        '${C.FF_BARCODE}' => $ff['barcode'],
                        '${C.FF_QTY}' => $ff['quantity'],
                        '${C.IS_PROTECTED}' => 1,
                        'formfactorActive' => 1,
                        'created_at' => Carbon::now()
                    ]);
                    $parentId = $newFf->id; 
                }

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
                
                $this->command->info("-> Attached item $barcode to product $productName.");
            } else {
                $this->command->warn("-> Skipped: Item $barcode already exists for $productName.");
            }
        }\n`;
    }

    // ==========================================
    // BLOCK 2: UPDATE PRODUCTS
    // ==========================================
    if (updates.length > 0) {
        let updateData = updates.map(product => {
            let fields = [];
            let mfgSearch = null;
            let unitName = null;

            if (product.updateFields.includes('shortName')) fields.push(`'${C.SHORT_NAME}' => '${(product.shortName || '').replace(/'/g, "\\'")}'`);
            if (product.updateFields.includes('hl7Reference')) fields.push(`'${C.HL7_REF}' => '${(product.hl7Reference || '').replace(/'/g, "\\'")}'`);
            if (product.updateFields.includes('productType')) fields.push(`'${C.TYPE}' => ${product.productType}`);
            if (product.updateFields.includes('categoryId')) fields.push(`'${C.CATEGORY}' => ${product.categoryId}`);
            
            if (product.updateFields.includes('caloricValue')) {
                fields.push(`'${C.BASE_CAL}' => ${product.caloricValue}`);
                fields.push(`'${C.CAL_PER_OZ}' => ${product.caloricValue}`);
            }
            if (product.updateFields.includes('displacement')) fields.push(`'${C.DISPLACEMENT}' => ${product.displacement}`);
            if (product.updateFields.includes('expirationOpened')) fields.push(`'${C.EXP_OPEN}' => ${product.expirationOpened}`);
            if (product.updateFields.includes('expirationPrepared')) fields.push(`'${C.EXP_PREP}' => ${product.expirationPrepared}`);
            
            if (product.updateFields.includes('productUse')) {
                fields.push(`'${C.IS_BASE}' => ${product.productUse === 'base' ? 1 : 0}`);
                fields.push(`'${C.IS_FORT}' => ${product.productUse === 'fortifier' ? 1 : 0}`);
                fields.push(`'${C.IS_MOD}' => ${product.productUse === 'modular' ? 1 : 0}`);
            }

            if (product.updateFields.includes('manufacturer')) mfgSearch = (product.manufacturer || '').replace(/'/g, "\\'");
            if (product.updateFields.includes('measurementUnit')) {
                unitName = (product.measurementUnit || 'ml');
                fields.push(`'${C.UOM}' => '${unitName}'`);
            }

            let extraLines = [];
            if (mfgSearch) extraLines.push(`'mfgSearch' => '${mfgSearch}'`);
            if (unitName) extraLines.push(`'unitName' => '${unitName}'`);

            return `            [
                'productName' => '${(product.productName || '').replace(/'/g, "\\'")}',
                ${extraLines.length ? extraLines.join(',\n                ') + ',' : ''}
                'updates' => [
                    ${fields.join(',\n                    ')}
                ]
            ]`;
        }).join(',\n');

        operationCode += `
        // ---------------------------------------------------------
        // UPDATE EXISTING PRODUCTS
        // ---------------------------------------------------------
        $updateProducts = [
${updateData}
        ];

        foreach ($updateProducts as $p) {
            $product = NutritionProductType::where('${C.NAME}', $p['productName'])->first();
            
            if ($product) {
                $updateData = $p['updates'];

                // 2a. Dynamic Manufacturer Lookup if requested
                if (isset($p['mfgSearch'])) {
                    $mfgId = DB::table('${T.MANUFACTURERS}')
                        ->where('ManufacturerName', 'like', '%' . $p['mfgSearch'] . '%')
                        ->orWhere('ManufacturerDescription', 'like', '%' . $p['mfgSearch'] . '%')
                        ->value('ManufacturerID') ?? DB::table('${T.MANUFACTURERS}')->where('ManufacturerName', 'Undefined')->value('ManufacturerID') ?? 3;
                    $updateData['${C.MFG_ID}'] = $mfgId;
                }

                // 2b. Execute the payload
                if (!empty($updateData)) {
                    $product->update($updateData);
                    
                    // Fetch the freshly updated model to grab accurate history values
                    $product = $product->fresh();
                    
                    // 2c. Update special context tables if Measurement Unit changed
                    if (isset($p['unitName'])) {
                        $unitName = $p['unitName'];
                        $unitId = DB::table('nutrition_product_measurement_units')->where('singularName', 'like', $unitName . '%')->value('id') ?? ($unitName === 'g' ? 2 : 1);
                        
                        DB::table('${T.ADDITIVE_CONTEXT}')->where('productID', $product->${C.ID})->update([
                            'measurementUnitID' => $unitId,
                            'decimalPlacesDisplayed' => $unitName === 'g' ? 1 : 0
                        ]);
                    }

                    // 2d. INSERT UPDATE HISTORY (Action 9001)
                    NutritionProductTypeHistory::create([
                        'fthistBarcode'            => $product->${C.BARCODE},
                        'fthistFormulaID'          => $product->${C.ID},
                        'fthistAction'             => 9001,
                        'fthistDateTime'           => Carbon::now(),
                        'fthistUser'               => 1,
                        'fthistName'               => $product->${C.NAME},
                        'fthistOrder'              => $product->${C.ORDER} ?? $product->${C.ID},
                        'fthistType'               => $product->${C.TYPE},
                        'fthistCategoryID'         => $product->${C.CATEGORY},
                        'fthistMeasurementUnit'    => $product->${C.UOM},
                        'fthistOpenExpirationDate' => $product->${C.EXP_OPEN},
                        'fhistBaseCaloricValue'    => $product->${C.BASE_CAL},
                        'fthistDisplacement'       => $product->${C.DISPLACEMENT},
                    ]);

                    $this->command->info("-> Updated product: " . $p['productName']);
                } else {
                    $this->command->warn("-> No fields to update for: " . $p['productName']);
                }
            } else {
                $this->command->error("-> Skipped Update: Product not found -> " . $p['productName']);
            }
        }\n`;
    }

    // ==========================================
    // BLOCK 3: BARCODE UPDATES
    // ==========================================
    if (barcodeUpdates.length > 0) {
        let barcodeData = barcodeUpdates.map(product => {
            return `            ['old' => '${(product.oldProductCode || '').replace(/'/g, "\\'")}', 'new' => '${(product.newProductCode || '').replace(/'/g, "\\'")}']`;
        }).join(',\n');

        operationCode += `
        // ---------------------------------------------------------
        // BARCODE UPDATES
        // ---------------------------------------------------------
        $barcodeUpdates = [
${barcodeData}
        ];

        foreach ($barcodeUpdates as $b) {
            $itemUpdated = NutritionProductTypeItem::where('${C.ITEM_CODE}', $b['old'])
                ->update(['${C.ITEM_CODE}' => $b['new']]);
            
            $ffUpdated = NutritionProductTypeFormFactor::where('${C.FF_BARCODE}', $b['old'])
                ->update(['${C.FF_BARCODE}' => $b['new']]);

            if ($itemUpdated || $ffUpdated) {
                $this->command->info("-> Updated Barcode: " . $b['old'] . " to " . $b['new']);
            } else {
                $this->command->warn("-> Skipped: Old barcode " . $b['old'] . " not found.");
            }
        }\n`;
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