window.SeederTemplates = window.SeederTemplates || {};

window.SeederTemplates.Q3 = function(className, products, action, buildInfo) {
    const T = DB_SCHEMA.TABLES;
    const C = DB_SCHEMA.COLUMNS;

    const ffMappings = {
        '1': 'Bottle',
        '2': 'Carton',
        '3': 'Can',
        '4': 'Case',
        '5': 'Vial',
        '6': 'Packet',
        '7': 'Pack',
        '8': 'Sachet',
        '9': 'Tub',
        '10': 'Tetra Pak',
        '11': 'Tetra Prisma',
        '12': 'Tetra Brik',
        '13': 'Pouch',
        '14': 'Bag',
        '15': 'Box',
        '16': 'Cup',
        '17': 'Stick'
    };

    const getContexts = (product) => {
        if (Array.isArray(product.useContexts) && product.useContexts.length > 0) {
            return product.useContexts;
        }
        if (product.productUse === 'fortifier') return ['additive'];
        if (product.productUse === 'modular') return ['additive', 'modular'];
        return ['feed-base'];
    };

    let operationCode = '';

    // 1. Separate the products by their individual actions
    const creates = products.filter(p => p.action === 'create');
    const updates = products.filter(p => p.action === 'update');
    const barcodeUpdates = products.filter(p => p.action === 'barcode-update');
    const formFactorAdditions = products.filter(p => p.action === 'add-form-factor');
    const formFactorUpdates = products.filter(p => p.action === 'update-form-factor');
    const manufacturers = products.filter(p => p.action === 'add-manufacturer');
    const units = products.filter(p => p.action === 'add-unit');

    // ==========================================
    // BLOCK 1: CREATE PRODUCTS
    // ==========================================
    if (creates.length > 0) {
        let createData = creates.map(product => {
            const contexts = getContexts(product);
            const canBeBase = contexts.includes('feed-base') ? 1 : 0;
            const canBeFortifier = contexts.includes('additive') ? 1 : 0;
            const canBeModular = contexts.includes('modular') ? 1 : 0;
            const addUnit = (product.additiveUnit || product.measurementUnit || 'ml').replace(/'/g, "\\'");
            const atomicUnits = parseFloat(product.atomicUnits) || 1;
            const decimalPlaces = product.decimalPlaces !== undefined
                ? (parseInt(product.decimalPlaces, 10) || 0)
                : (addUnit === 'g' ? 1 : 0);
            const expPrepared = canBeFortifier
                ? (parseFloat(product.expirationPrepared) || 48)
                : (parseFloat(product.expirationPrepared) || 0);

            let catName = 'Formula';
            if (product.categoryId == 5) catName = 'Additive';
            else if (product.categoryId == 1) catName = 'EHM';
            else if (product.categoryId == 2) catName = 'DHM';

            let hierarchyStr = '[]';
            if (product.hierarchy && product.hierarchy.length > 0) {
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
                'displacement' => ${product.displacement || 0.00},
                'canBeBase' => ${canBeBase},
                'canBeFortifier' => ${canBeFortifier},
                'canBeModular' => ${canBeModular},
                'additiveUnit' => '${addUnit}',
                'atomicUnits' => ${atomicUnits},
                'decimalPlaces' => ${decimalPlaces},
                'expirationPrepared' => ${expPrepared},
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

                // Sync Use Contexts pivot table dynamically based on actual schema columns
                if (Schema::hasTable('${T.USE_CONTEXTS}')) {
                    $ucCols = array_values(array_diff(
                        Schema::getColumnListing('${T.USE_CONTEXTS}'),
                        ['id', 'created_at', 'updated_at']
                    ));
                    $ucProdCol = collect($ucCols)->first(function ($c) {
                        return stripos($c, 'formtype') !== false || stripos($c, 'product') !== false;
                    }) ?? ($ucCols[0] ?? 'formtypeID');
                    $ucCtxCol = collect($ucCols)->first(function ($c) use ($ucProdCol) {
                        return $c !== $ucProdCol && (stripos($c, 'context') !== false || stripos($c, 'use') !== false);
                    }) ?? ($ucCols[1] ?? 'useContextID');

                    $contextMap = [];
                    $ctxLookupTable = Schema::hasTable('nutrition_product_use_contexts')
                        ? 'nutrition_product_use_contexts'
                        : (Schema::hasTable('use_contexts') ? 'use_contexts' : null);
                    if ($ctxLookupTable) {
                        $lCols = Schema::getColumnListing($ctxLookupTable);
                        $lIdCol = in_array('id', $lCols) ? 'id' : (collect($lCols)->first(fn($c) => stripos($c, 'id') !== false) ?? $lCols[0]);
                        $lNameCol = in_array('name', $lCols) ? 'name' : (collect($lCols)->first(fn($c) => stripos($c, 'name') !== false || stripos($c, 'desc') !== false) ?? ($lCols[1] ?? $lIdCol));
                        foreach (DB::table($ctxLookupTable)->get() as $row) {
                            $rowArr = (array) $row;
                            if (isset($rowArr[$lNameCol], $rowArr[$lIdCol])) {
                                $contextMap[strtolower(trim($rowArr[$lNameCol]))] = $rowArr[$lIdCol];
                            }
                        }
                    }

                    $baseCtxId = $contextMap['feed base'] ?? $contextMap['base'] ?? 1;
                    $addCtxId = $contextMap['additive'] ?? $contextMap['fortifier'] ?? 2;

                    if ($p['canBeBase']) {
                        DB::table('${T.USE_CONTEXTS}')->updateOrInsert([
                            $ucProdCol => $product->${C.ID},
                            $ucCtxCol => $baseCtxId
                        ]);
                    }
                    if ($p['canBeFortifier']) {
                        DB::table('${T.USE_CONTEXTS}')->updateOrInsert([
                            $ucProdCol => $product->${C.ID},
                            $ucCtxCol => $addCtxId
                        ]);
                    }
                }

                // Populate Additive Context Information when Additive is checked
                if ($p['canBeFortifier']) {
                    $addUnitName = $p['additiveUnit'] ?? $p['unitName'];
                    $addUnitId = DB::table('nutrition_product_measurement_units')
                        ->where('singularName', 'like', $addUnitName . '%')
                        ->value('id') ?? ($addUnitName === 'g' ? 2 : 1);

                    DB::table('${T.ADDITIVE_CONTEXT}')->updateOrInsert(
                        ['productID' => $product->${C.ID}],
                        [
                            'measurementUnitID' => $addUnitId,
                            'atomicUnitsPerMeasurementUnit' => $p['atomicUnits'] ?? 1,
                            'decimalPlacesDisplayed' => $p['decimalPlaces'] ?? ($addUnitName === 'g' ? 1 : 0)
                        ]
                    );
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
            let useContextConfig = null;

            if (product.updateFields.includes('productName')) {
                const updatedProductName = (product.newProductName || product.productName || '').replace(/'/g, "\\'");
                fields.push(`'${C.NAME}' => '${updatedProductName}'`);
            }
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

            if (product.updateFields.includes('useContexts') || product.updateFields.includes('productUse')) {
                const contexts = getContexts(product);
                const canBeBase = contexts.includes('feed-base') ? 1 : 0;
                const canBeFortifier = contexts.includes('additive') ? 1 : 0;
                const canBeModular = contexts.includes('modular') ? 1 : 0;
                const addUnit = (product.additiveUnit || product.measurementUnit || 'ml').replace(/'/g, "\\'");
                const atomicUnits = parseFloat(product.atomicUnits) || 1;
                const decimalPlaces = product.decimalPlaces !== undefined
                    ? (parseInt(product.decimalPlaces, 10) || 0)
                    : (addUnit === 'g' ? 1 : 0);

                fields.push(`'${C.IS_BASE}' => ${canBeBase}`);
                fields.push(`'${C.IS_FORT}' => ${canBeFortifier}`);
                fields.push(`'${C.IS_MOD}' => ${canBeModular}`);

                if (canBeFortifier && product.expirationPrepared && !product.updateFields.includes('expirationPrepared')) {
                    fields.push(`'${C.EXP_PREP}' => ${parseFloat(product.expirationPrepared) || 48}`);
                }

                useContextConfig = `'useContextConfig' => [
                    'canBeBase' => ${canBeBase},
                    'canBeFortifier' => ${canBeFortifier},
                    'additiveUnit' => '${addUnit}',
                    'atomicUnits' => ${atomicUnits},
                    'decimalPlaces' => ${decimalPlaces}
                ]`;
            }

            if (product.updateFields.includes('manufacturer')) mfgSearch = (product.manufacturer || '').replace(/'/g, "\\'");
            if (product.updateFields.includes('measurementUnit')) {
                unitName = (product.measurementUnit || 'ml');
                fields.push(`'${C.UOM}' => '${unitName}'`);
            }

            let extraLines = [];
            if (mfgSearch) extraLines.push(`'mfgSearch' => '${mfgSearch}'`);
            if (unitName) extraLines.push(`'unitName' => '${unitName}'`);
            if (useContextConfig) extraLines.push(useContextConfig);

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

                if (isset($p['mfgSearch'])) {
                    $mfgId = DB::table('${T.MANUFACTURERS}')
                        ->where('ManufacturerName', 'like', '%' . $p['mfgSearch'] . '%')
                        ->orWhere('ManufacturerDescription', 'like', '%' . $p['mfgSearch'] . '%')
                        ->value('ManufacturerID') ?? DB::table('${T.MANUFACTURERS}')->where('ManufacturerName', 'Undefined')->value('ManufacturerID') ?? 3;
                    $updateData['${C.MFG_ID}'] = $mfgId;
                }

                if (!empty($updateData)) {
                    $product->update($updateData);
                    $product = $product->fresh();

                    // Sync Use Contexts & Additive Context Information when updated
                    if (isset($p['useContextConfig'])) {
                        $uc = $p['useContextConfig'];

                        if (Schema::hasTable('${T.USE_CONTEXTS}')) {
                            $ucCols = array_values(array_diff(
                                Schema::getColumnListing('${T.USE_CONTEXTS}'),
                                ['id', 'created_at', 'updated_at']
                            ));
                            $ucProdCol = collect($ucCols)->first(function ($c) {
                                return stripos($c, 'formtype') !== false || stripos($c, 'product') !== false;
                            }) ?? ($ucCols[0] ?? 'formtypeID');
                            $ucCtxCol = collect($ucCols)->first(function ($c) use ($ucProdCol) {
                                return $c !== $ucProdCol && (stripos($c, 'context') !== false || stripos($c, 'use') !== false);
                            }) ?? ($ucCols[1] ?? 'useContextID');

                            $contextMap = [];
                            $ctxLookupTable = Schema::hasTable('nutrition_product_use_contexts')
                                ? 'nutrition_product_use_contexts'
                                : (Schema::hasTable('use_contexts') ? 'use_contexts' : null);
                            if ($ctxLookupTable) {
                                $lCols = Schema::getColumnListing($ctxLookupTable);
                                $lIdCol = in_array('id', $lCols) ? 'id' : (collect($lCols)->first(fn($c) => stripos($c, 'id') !== false) ?? $lCols[0]);
                                $lNameCol = in_array('name', $lCols) ? 'name' : (collect($lCols)->first(fn($c) => stripos($c, 'name') !== false || stripos($c, 'desc') !== false) ?? ($lCols[1] ?? $lIdCol));
                                foreach (DB::table($ctxLookupTable)->get() as $row) {
                                    $rowArr = (array) $row;
                                    if (isset($rowArr[$lNameCol], $rowArr[$lIdCol])) {
                                        $contextMap[strtolower(trim($rowArr[$lNameCol]))] = $rowArr[$lIdCol];
                                    }
                                }
                            }

                            $baseCtxId = $contextMap['feed base'] ?? $contextMap['base'] ?? 1;
                            $addCtxId = $contextMap['additive'] ?? $contextMap['fortifier'] ?? 2;

                            if (!empty($uc['canBeBase'])) {
                                DB::table('${T.USE_CONTEXTS}')->updateOrInsert([
                                    $ucProdCol => $product->${C.ID},
                                    $ucCtxCol => $baseCtxId
                                ]);
                            } else {
                                DB::table('${T.USE_CONTEXTS}')
                                    ->where($ucProdCol, $product->${C.ID})
                                    ->where($ucCtxCol, $baseCtxId)
                                    ->delete();
                            }

                            if (!empty($uc['canBeFortifier'])) {
                                DB::table('${T.USE_CONTEXTS}')->updateOrInsert([
                                    $ucProdCol => $product->${C.ID},
                                    $ucCtxCol => $addCtxId
                                ]);
                            } else {
                                DB::table('${T.USE_CONTEXTS}')
                                    ->where($ucProdCol, $product->${C.ID})
                                    ->where($ucCtxCol, $addCtxId)
                                    ->delete();
                            }
                        }

                        if (!empty($uc['canBeFortifier'])) {
                            $addUnitName = $uc['additiveUnit'] ?: ($product->${C.UOM} ?: 'ml');
                            $addUnitId = DB::table('nutrition_product_measurement_units')
                                ->where('singularName', 'like', $addUnitName . '%')
                                ->value('id') ?? ($addUnitName === 'g' ? 2 : 1);

                            DB::table('${T.ADDITIVE_CONTEXT}')->updateOrInsert(
                                ['productID' => $product->${C.ID}],
                                [
                                    'measurementUnitID' => $addUnitId,
                                    'atomicUnitsPerMeasurementUnit' => $uc['atomicUnits'] ?? 1,
                                    'decimalPlacesDisplayed' => $uc['decimalPlaces'] ?? ($addUnitName === 'g' ? 1 : 0)
                                ]
                            );
                        } else {
                            DB::table('${T.ADDITIVE_CONTEXT}')
                                ->where('productID', $product->${C.ID})
                                ->delete();
                        }
                    }

                    if (isset($p['unitName'])) {
                        $unitName = $p['unitName'];
                        $unitId = DB::table('nutrition_product_measurement_units')->where('singularName', 'like', $unitName . '%')->value('id') ?? ($unitName === 'g' ? 2 : 1);

                        DB::table('${T.ADDITIVE_CONTEXT}')->where('productID', $product->${C.ID})->update([
                            'measurementUnitID' => $unitId,
                            'decimalPlacesDisplayed' => $unitName === 'g' ? 1 : 0
                        ]);
                    }

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
    // BLOCK 3: BARCODE UPDATES (Legacy CSV Compatibility)
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

    // ==========================================
    // BLOCK 4: ADD FORM FACTOR TO EXISTING
    // ==========================================
    if (formFactorAdditions.length > 0) {
        let addFfData = formFactorAdditions.map(product => {
            let hierarchyStr = '[]';
            if (product.hierarchy && product.hierarchy.length > 0) {
                let hArray = product.hierarchy.map(ff => {
                    return `[
                        'name' => '${ffMappings[ff.containerId] || 'Bottle'}',
                        'barcode' => '${(ff.barcode || '').replace(/'/g, "\\'")}',
                        'quantity' => ${ff.quantity || 0},
                        'volume' => ${ff.volume || 100}
                    ]`;
                });
                hierarchyStr = `[\n                    ${hArray.join(',\n                    ')}\n                ]`;
            }

            return `            [
                'productName' => '${(product.productName || '').replace(/'/g, "\\'")}',
                'productCode' => '${(product.productCode || '').replace(/'/g, "\\'")}',
                'hierarchy' => ${hierarchyStr}
            ]`;
        }).join(',\n');

        operationCode += `
        // ---------------------------------------------------------
        // ADD FORM FACTORS TO EXISTING PRODUCTS
        // ---------------------------------------------------------
        $addFormFactors = [
${addFfData}
        ];

        foreach ($addFormFactors as $p) {
            $productName = $p['productName'];
            $hierarchyCount = count($p['hierarchy']);

            $product = NutritionProductType::where('${C.NAME}', $productName)->first();

            if (!$product) {
                $this->command->error("-> Failed: Could not find existing product '$productName'.");
                continue;
            }

            $innerFf = $p['hierarchy'][0];
            $itemBarcode = !empty($p['productCode']) ? $p['productCode'] : $innerFf['barcode'];
            $innerFfId = DB::table('nutrition_product_form_factor_types')->where('name', $innerFf['name'])->value('id') ?? 1;

            $nptItem = NutritionProductTypeItem::create([
                '${C.ID}' => $product->${C.ID},
                '${C.ITEM_CODE}' => $itemBarcode,
                '${C.FF_TYPE_ID}' => $innerFfId,
                '${C.UOM}' => $product->${C.UOM},
                '${C.ITEM_VOL}' => $innerFf['volume'],
                'formtypeitemName' => $productName,
                '${C.IS_PROTECTED}' => 1,
                'formtypeitemActive' => 1
            ]);

            $parentId = null;
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

            $this->command->info("-> Attached new item $itemBarcode to product $productName.");
        }\n`;
    }

    // ==========================================
    // BLOCK 4B: UPDATE ITEMS & FORM FACTORS
    // ==========================================
    if (formFactorUpdates.length > 0) {
        let updateFfData = formFactorUpdates.map(u => {
            const selectedFields = Array.isArray(u.updateItemFields) ? u.updateItemFields : [];
            const itemUpdates = [];
            let leafTypeName = null;

            if (selectedFields.includes('newProductCode') && u.newProductCode) {
                itemUpdates.push(`'${C.ITEM_CODE}' => '${u.newProductCode.replace(/'/g, "\\'")}'`);
            }
            if (selectedFields.includes('itemName') && u.itemName) {
                itemUpdates.push(`'formtypeitemName' => '${u.itemName.replace(/'/g, "\\'")}'`);
            }
            if (selectedFields.includes('leafContainerType') && u.leafContainerType) {
                leafTypeName = ffMappings[u.leafContainerType] || 'Bottle';
            }
            if (selectedFields.includes('measurementVolume')) {
                itemUpdates.push(`'${C.ITEM_VOL}' => ${parseFloat(u.measurementVolume) || 0}`);
            }
            if (selectedFields.includes('measurementUnit') && u.measurementUnit) {
                itemUpdates.push(`'${C.UOM}' => '${u.measurementUnit.replace(/'/g, "\\'")}'`);
            }
            if (selectedFields.includes('itemActive') && u.itemActive !== undefined && u.itemActive !== '') {
                itemUpdates.push(`'formtypeitemActive' => ${parseInt(u.itemActive, 10) ? 1 : 0}`);
            }

            const containersStr = (Array.isArray(u.containerUpdates) ? u.containerUpdates : []).map(cu => {
                const newTypeName = cu.newContainerType ? (ffMappings[cu.newContainerType] || '') : '';
                const newQty = (cu.newQuantity !== undefined && cu.newQuantity !== null && cu.newQuantity !== '')
                    ? parseInt(cu.newQuantity, 10)
                    : 'null';
                return `[
                        'target' => '${(cu.target || 'leaf').replace(/'/g, "\\'")}',
                        'currentBarcode' => '${(cu.currentBarcode || '').replace(/'/g, "\\'")}',
                        'newTypeName' => '${newTypeName.replace(/'/g, "\\'")}',
                        'newBarcode' => '${(cu.newBarcode || '').replace(/'/g, "\\'")}',
                        'newQuantity' => ${newQty}
                    ]`;
            }).join(',\n                    ');

            return `            [
                'productName' => '${(u.productName || '').replace(/'/g, "\\'")}',
                'productCode' => '${(u.productCode || '').replace(/'/g, "\\'")}',
                'lookupBarcode' => '${(u.lookupBarcode || '').replace(/'/g, "\\'")}',
                'leafTypeName' => ${leafTypeName ? `'${leafTypeName.replace(/'/g, "\\'")}'` : 'null'},
                'itemUpdates' => [
                    ${itemUpdates.join(',\n                    ')}
                ],
                'containerUpdates' => [
                    ${containersStr}
                ]
            ]`;
        }).join(',\n');

        operationCode += `
        // ---------------------------------------------------------
        // UPDATE EXISTING ITEMS & FORM FACTORS
        // ---------------------------------------------------------
        $updateFormFactors = [
${updateFfData}
        ];

        foreach ($updateFormFactors as $u) {
            $productId = null;
            if (!empty($u['productName'])) {
                $productId = NutritionProductType::where('${C.NAME}', $u['productName'])->value('${C.ID}');
            }

            // 1. Resolve target NutritionProductTypeItem by Item Number or Container Barcode
            $item = null;
            if (!empty($u['productCode'])) {
                $itemQuery = NutritionProductTypeItem::where('${C.ITEM_CODE}', $u['productCode']);
                if ($productId) {
                    $itemQuery->where('${C.ID}', $productId);
                }
                $item = $itemQuery->first();
            }

            if (!$item && !empty($u['lookupBarcode'])) {
                $ffLookup = NutritionProductTypeFormFactor::where('${C.FF_BARCODE}', $u['lookupBarcode'])->first();
                if ($ffLookup) {
                    $item = NutritionProductTypeItem::where('${C.ITEM_ID}', $ffLookup->${C.ITEM_ID})->first();
                }
            }

            if (!$item && !empty($u['containerUpdates'])) {
                foreach ($u['containerUpdates'] as $cu) {
                    if (!empty($cu['currentBarcode'])) {
                        $ffLookup = NutritionProductTypeFormFactor::where('${C.FF_BARCODE}', $cu['currentBarcode'])->first();
                        if ($ffLookup) {
                            $item = NutritionProductTypeItem::where('${C.ITEM_ID}', $ffLookup->${C.ITEM_ID})->first();
                            if ($item) break;
                        }
                    }
                }
            }

            if (!$item) {
                $label = $u['productCode'] ?: ($u['lookupBarcode'] ?: $u['productName']);
                $this->command->error("-> Skipped Item/FormFactor Update: Could not resolve item ($label).");
                continue;
            }

            $oldLeafTypeId = $item->${C.FF_TYPE_ID};
            $oldItemCode = $item->${C.ITEM_CODE};
            $itemUpdates = $u['itemUpdates'];

            if (!empty($u['leafTypeName'])) {
                $newLeafTypeId = DB::table('nutrition_product_form_factor_types')
                    ->where('name', $u['leafTypeName'])
                    ->value('id');
                if ($newLeafTypeId) {
                    $itemUpdates['${C.FF_TYPE_ID}'] = $newLeafTypeId;
                }
            }

            // 2. Apply Item-level updates
            if (!empty($itemUpdates)) {
                $item->update($itemUpdates);
                $item = $item->fresh();

                // Keep parent product barcode aligned if it mirrored the old item code
                if (isset($itemUpdates['${C.ITEM_CODE}']) && $oldItemCode !== $itemUpdates['${C.ITEM_CODE}']) {
                    NutritionProductType::where('${C.ID}', $item->${C.ID})
                        ->where('${C.BARCODE}', $oldItemCode)
                        ->update(['${C.BARCODE}' => $itemUpdates['${C.ITEM_CODE}']]);
                }
            }

            // 3. Resolve Leaf and Outer containers for this Item
            $itemFormFactors = NutritionProductTypeFormFactor::where('${C.ITEM_ID}', $item->${C.ITEM_ID})->get();
            $parentIds = $itemFormFactors->pluck('${C.FF_PARENT}')->filter()->all();
            $leafFf = $itemFormFactors->first(function ($ff) use ($parentIds) {
                return !in_array($ff->id, $parentIds);
            }) ?? $itemFormFactors->sortByDesc('id')->first();
            $outerFf = $itemFormFactors->first(function ($ff) {
                return is_null($ff->${C.FF_PARENT});
            });

            // Sync leaf container type if Item's Leaf Form Factor Type changed
            if ($leafFf && isset($itemUpdates['${C.FF_TYPE_ID}'])) {
                $leafFf->update(['${C.FF_TYPE_ID}' => $itemUpdates['${C.FF_TYPE_ID}']]);
            }

            // 4. Apply Container-level updates
            foreach ($u['containerUpdates'] as $cu) {
                $targetFf = null;
                if ($cu['target'] === 'leaf') {
                    $targetFf = $leafFf;
                } elseif ($cu['target'] === 'outer') {
                    $targetFf = !empty($cu['currentBarcode'])
                        ? $itemFormFactors->firstWhere('${C.FF_BARCODE}', $cu['currentBarcode'])
                        : $outerFf;
                } elseif (!empty($cu['currentBarcode'])) {
                    $targetFf = $itemFormFactors->firstWhere('${C.FF_BARCODE}', $cu['currentBarcode'])
                        ?? NutritionProductTypeFormFactor::where('${C.FF_BARCODE}', $cu['currentBarcode'])->first();
                }

                if (!$targetFf) {
                    $this->command->warn("-> Warning: Target container not found for item " . $item->${C.ITEM_CODE});
                    continue;
                }

                $ffUpdates = [];
                if (!empty($cu['newTypeName'])) {
                    $mappedTypeId = DB::table('nutrition_product_form_factor_types')
                        ->where('name', $cu['newTypeName'])
                        ->value('id');
                    if ($mappedTypeId) {
                        $ffUpdates['${C.FF_TYPE_ID}'] = $mappedTypeId;
                    }
                }
                if (!empty($cu['newBarcode'])) {
                    $ffUpdates['${C.FF_BARCODE}'] = $cu['newBarcode'];
                }
                if ($cu['newQuantity'] !== null) {
                    $ffUpdates['${C.FF_QTY}'] = $cu['newQuantity'];
                }

                if (!empty($ffUpdates)) {
                    $targetFf->update($ffUpdates);

                    // Keep Item's leaf form factor type synchronized if the leaf container type was updated directly
                    if ($leafFf && $targetFf->id === $leafFf->id && isset($ffUpdates['${C.FF_TYPE_ID}'])) {
                        $item->update(['${C.FF_TYPE_ID}' => $ffUpdates['${C.FF_TYPE_ID}']]);
                        $item = $item->fresh();
                    }
                }
            }

            // 5. Synchronize nutrition_product_types__applicable_form_factor_types when leaf type changes
            $finalLeafTypeId = $item->${C.FF_TYPE_ID};
            if ($finalLeafTypeId && $oldLeafTypeId !== $finalLeafTypeId) {
                $appExists = DB::table('${T.APPLICABLE_FF}')
                    ->where('productTypeID', $item->${C.ID})
                    ->where('formFactorTypeID', $finalLeafTypeId)
                    ->exists();

                if (!$appExists) {
                    DB::table('${T.APPLICABLE_FF}')->insert([
                        'productTypeID' => $item->${C.ID},
                        'formFactorTypeID' => $finalLeafTypeId
                    ]);
                }

                $oldTypeStillUsed = NutritionProductTypeItem::where('${C.ID}', $item->${C.ID})
                    ->where('${C.FF_TYPE_ID}', $oldLeafTypeId)
                    ->exists();

                if (!$oldTypeStillUsed) {
                    DB::table('${T.APPLICABLE_FF}')
                        ->where('productTypeID', $item->${C.ID})
                        ->where('formFactorTypeID', $oldLeafTypeId)
                        ->delete();
                }
            }

            $this->command->info("-> Updated Item / Form Factors for: " . ($item->formtypeitemName ?: $item->${C.ITEM_CODE}));
        }\n`;
    }

    // ==========================================
    // BLOCK 5: ADD MANUFACTURER
    // ==========================================
    if (manufacturers.length > 0) {
        let mfgData = manufacturers.map(m => {
            return `            ['name' => '${(m.manufacturerName || '').replace(/'/g, "\\'")}', 'description' => '${(m.manufacturerDescription || '').replace(/'/g, "\\'")}']`;
        }).join(',\n');

        operationCode += `
        // ---------------------------------------------------------
        // ADD NEW MANUFACTURERS
        // ---------------------------------------------------------
        $addManufacturers = [
${mfgData}
        ];

        foreach ($addManufacturers as $m) {
            $exists = DB::table('nutrition_product_types_manufacturer')
                ->where('ManufacturerName', $m['name'])
                ->orWhere('ManufacturerDescription', $m['description'])
                ->exists();

            if (!$exists) {
                DB::table('nutrition_product_types_manufacturer')->insert([
                    'ManufacturerName' => substr($m['name'], 0, 20),
                    'ManufacturerDescription' => $m['description'],
                    'ManufacturerStatus' => 1,
                    'created_at' => Carbon::now(),
                    'updated_at' => Carbon::now()
                ]);
                $this->command->info("-> Added new Manufacturer: " . $m['name']);
            } else {
                $this->command->warn("-> Skipped: Manufacturer " . $m['name'] . " already exists.");
            }
        }\n`;
    }

    // ==========================================
    // BLOCK 6: ADD UNITS
    // ==========================================
    if (units.length > 0) {
        let unitData = units.map(u => {
            return `            [
                'name' => '${(u.unitName || '').replace(/'/g, "\\'")}', 
                'adt' => '${(u.unitADT || '').replace(/'/g, "\\'")}',
                'order' => ${u.unitOrder || 1},
                'bmVol' => ${u.bmMaxVolume || 0},
                'formVol' => ${u.formulaMaxVolume || 0},
                'waterVol' => ${u.waterMaxVolume || 0},
                'bmCycle' => ${u.bmPrepCycle || 24},
                'formCycle' => ${u.formulaPrepCycle || 24}
            ]`;
        }).join(',\n');

        operationCode += `
        // ---------------------------------------------------------
        // ADD NEW UNITS
        // ---------------------------------------------------------
        $addUnits = [
${unitData}
        ];

        foreach ($addUnits as $u) {
            $exists = DB::table('units')->where('unitName', $u['name'])->exists();

            if (!$exists) {
                DB::table('units')->insert([
                    'unitName' => $u['name'],
                    'unitADTReference' => $u['adt'],
                    'unitOrder' => $u['order'],
                    'unitCanReceiveDonorMilk' => 1,
                    'unitHospital' => 1,
                    'unitHoursOfFeedsPrepared' => $u['bmCycle'],
                    'unitHoursOfFeedsPreparedFormula' => $u['formCycle'],
                    'unitBatchVolumeBreastmilk' => $u['bmVol'],
                    'unitBatchVolumeFormula' => $u['formVol'],
                    'unitBatchVolumeSterileWater' => $u['waterVol'],
                    'unitActive' => 1,
                    'created_at' => Carbon::now(),
                    'updated_at' => Carbon::now()
                ]);
                $this->command->info("-> Added new Unit: " . $u['name']);
            } else {
                $this->command->warn("-> Skipped: Unit " . $u['name'] . " already exists.");
            }
        }\n`;
    }

    return `<?php

namespace TMS\\Customers\\Database\\Seeds\\ClientDataUpdates;

use Illuminate\\Database\\Seeder;
use Illuminate\\Support\\Facades\\DB;
use Illuminate\\Support\\Facades\\Schema;
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