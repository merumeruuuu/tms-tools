window.SeederTemplates = window.SeederTemplates || {};

window.SeederTemplates.Q3 = function(className, products, action, buildInfo) {
    const T = DB_SCHEMA.TABLES;
    const C = DB_SCHEMA.COLUMNS;

    const esc = (val) => String(val ?? '').trim().replace(/'/g, "\\'");

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
            const addUnit = esc(product.additiveUnit || product.measurementUnit || 'ml');
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
                        'barcode' => '${esc(ff.barcode)}',
                        'quantity' => ${ff.quantity || 0},
                        'volume' => ${ff.volume || product.measurementVolume || 100}
                    ]`;
                });
                hierarchyStr = `[\n                    ${hArray.join(',\n                    ')}\n                ]`;
            } else {
                hierarchyStr = `[[
                    'name' => 'Bottle', 'barcode' => '${esc(product.productCode)}',
                    'quantity' => ${product.unitQuantity || 1}, 'volume' => ${product.measurementVolume || 100}
                ]]`;
            }

            return `            [
                'productName' => '${esc(product.productName)}',
                'barcode' => '${esc(product.productCode)}',
                'manufacturer' => '${esc(product.manufacturer || 'Undefined')}',
                'shortName' => '${esc(product.shortName || product.productName)}',
                'hl7Reference' => '${esc(product.hl7Reference)}',
                'productType' => ${product.productType || 1},
                'catName' => '${catName}',
                'unitName' => '${esc(product.measurementUnit || 'ml')}',
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
            $productName = trim($p['productName']);
            $barcode = trim($p['barcode']);

            $mfgId = DB::table('${T.MANUFACTURERS}')
                ->where('ManufacturerName', 'like', '%' . trim($p['manufacturer']) . '%')
                ->orWhere('ManufacturerDescription', 'like', '%' . trim($p['manufacturer']) . '%')
                ->value('ManufacturerID')
                ?? DB::table('${T.MANUFACTURERS}')->where('ManufacturerName', 'Undefined')->value('ManufacturerID') ?? 3;

            $catId = DB::table('nutrition_product_categories')
                ->where('name', 'like', '%' . $p['catName'] . '%')
                ->value('id') ?? 3;

            $product = NutritionProductType::firstOrCreate(
                ['${C.NAME}' => $productName],
                [
                    '${C.SHORT_NAME}' => trim($p['shortName']),
                    '${C.HL7_REF}' => trim($p['hl7Reference']),
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
                        '${C.FF_BARCODE}' => trim($ff['barcode']),
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

                if (!$product->wasRecentlyCreated) {
                    NutritionProductTypeHistory::create([
                        'fthistBarcode'            => $barcode,
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
                const updatedProductName = esc(product.newProductName || product.productName);
                fields.push(`'${C.NAME}' => '${updatedProductName}'`);
            }
            if (product.updateFields.includes('shortName')) fields.push(`'${C.SHORT_NAME}' => '${esc(product.shortName)}'`);
            if (product.updateFields.includes('hl7Reference')) fields.push(`'${C.HL7_REF}' => '${esc(product.hl7Reference)}'`);
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
                const addUnit = esc(product.additiveUnit || product.measurementUnit || 'ml');
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

            if (product.updateFields.includes('manufacturer')) mfgSearch = esc(product.manufacturer);
            if (product.updateFields.includes('measurementUnit')) {
                unitName = esc(product.measurementUnit || 'ml');
                fields.push(`'${C.UOM}' => '${unitName}'`);
            }

            let extraLines = [];
            if (mfgSearch) extraLines.push(`'mfgSearch' => '${mfgSearch}'`);
            if (unitName) extraLines.push(`'unitName' => '${unitName}'`);
            if (useContextConfig) extraLines.push(useContextConfig);

            return `            [
                'productName' => '${esc(product.productName)}',
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
            $targetName = trim($p['productName']);
            $product = NutritionProductType::where('${C.NAME}', $targetName)->first();

            if ($product) {
                $updateData = $p['updates'];

                if (isset($p['mfgSearch'])) {
                    $mfgSearch = trim($p['mfgSearch']);
                    $mfgId = DB::table('${T.MANUFACTURERS}')
                        ->where('ManufacturerName', 'like', '%' . $mfgSearch . '%')
                        ->orWhere('ManufacturerDescription', 'like', '%' . $mfgSearch . '%')
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

                    $this->command->info("-> Updated product: " . $targetName);
                } else {
                    $this->command->warn("-> No fields to update for: " . $targetName);
                }
            } else {
                $this->command->error("-> Skipped Update: Product not found -> " . $targetName);
            }
        }\n`;
    }

    // ==========================================
    // BLOCK 3: BARCODE UPDATES (Legacy CSV Compatibility)
    // ==========================================
    if (barcodeUpdates.length > 0) {
        let barcodeData = barcodeUpdates.map(product => {
            return `            ['old' => '${esc(product.oldProductCode)}', 'new' => '${esc(product.newProductCode)}']`;
        }).join(',\n');

        operationCode += `
        // ---------------------------------------------------------
        // BARCODE UPDATES
        // ---------------------------------------------------------
        $barcodeUpdates = [
${barcodeData}
        ];

        foreach ($barcodeUpdates as $b) {
            $oldBc = trim($b['old']);
            $newBc = trim($b['new']);

            $productRecord = NutritionProductType::where('${C.BARCODE}', $oldBc)->first();
            $itemRecord = NutritionProductTypeItem::where('${C.ITEM_CODE}', $oldBc)->first();
            $ffRecord = NutritionProductTypeFormFactor::where('${C.FF_BARCODE}', $oldBc)->first();

            $prodUpdated = NutritionProductType::where('${C.BARCODE}', $oldBc)
                ->update(['${C.BARCODE}' => $newBc]);

            $itemUpdated = NutritionProductTypeItem::where('${C.ITEM_CODE}', $oldBc)
                ->update(['${C.ITEM_CODE}' => $newBc]);

            $ffUpdated = NutritionProductTypeFormFactor::where('${C.FF_BARCODE}', $oldBc)
                ->update(['${C.FF_BARCODE}' => $newBc]);

            if ($prodUpdated || $itemUpdated || $ffUpdated) {
                $product = $productRecord ? $productRecord->fresh() : null;
                if (!$product && $itemRecord) {
                    $product = NutritionProductType::find($itemRecord->${C.ID});
                }
                if (!$product && $ffRecord) {
                    $parentItem = NutritionProductTypeItem::find($ffRecord->${C.ITEM_ID});
                    if ($parentItem) {
                        $product = NutritionProductType::find($parentItem->${C.ID});
                    }
                }

                if ($product) {
                    NutritionProductTypeHistory::create([
                        'fthistBarcode'            => $newBc,
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
                }

                $this->command->info("-> Updated Barcode: " . $oldBc . " to " . $newBc);
            } else {
                $this->command->warn("-> Skipped: Old barcode " . $oldBc . " not found.");
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
                        'barcode' => '${esc(ff.barcode)}',
                        'quantity' => ${ff.quantity || 0},
                        'volume' => ${ff.volume || 100}
                    ]`;
                });
                hierarchyStr = `[\n                    ${hArray.join(',\n                    ')}\n                ]`;
            }

            return `            [
                'productName' => '${esc(product.productName)}',
                'productCode' => '${esc(product.productCode)}',
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
            $productName = trim($p['productName']);
            $hierarchyCount = count($p['hierarchy']);

            $product = NutritionProductType::where('${C.NAME}', $productName)->first();

            if (!$product) {
                $this->command->error("-> Failed: Could not find existing product '$productName'.");
                continue;
            }

            $innerFf = $p['hierarchy'][0];
            $itemBarcode = !empty(trim($p['productCode'])) ? trim($p['productCode']) : trim($innerFf['barcode']);
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
                    '${C.FF_BARCODE}' => trim($ff['barcode']),
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

            // Insert audit record into nutrition_product_types_history
            NutritionProductTypeHistory::create([
                'fthistBarcode'            => $itemBarcode ?: $product->${C.BARCODE},
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

            if (selectedFields.includes('newProductCode') && esc(u.newProductCode)) {
                itemUpdates.push(`'${C.ITEM_CODE}' => '${esc(u.newProductCode)}'`);
            }
            if (selectedFields.includes('itemName') && esc(u.itemName)) {
                itemUpdates.push(`'formtypeitemName' => '${esc(u.itemName)}'`);
            }
            if (selectedFields.includes('leafContainerType') && u.leafContainerType) {
                leafTypeName = ffMappings[u.leafContainerType] || 'Bottle';
            }
            if (selectedFields.includes('measurementVolume')) {
                itemUpdates.push(`'${C.ITEM_VOL}' => ${parseFloat(u.measurementVolume) || 0}`);
            }
            if (selectedFields.includes('measurementUnit') && esc(u.measurementUnit)) {
                itemUpdates.push(`'${C.UOM}' => '${esc(u.measurementUnit)}'`);
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
                        'target' => '${esc(cu.target || 'leaf')}',
                        'currentBarcode' => '${esc(cu.currentBarcode)}',
                        'newTypeName' => '${esc(newTypeName)}',
                        'newBarcode' => '${esc(cu.newBarcode)}',
                        'newQuantity' => ${newQty}
                    ]`;
            }).join(',\n                    ');

            return `            [
                'productName' => '${esc(u.productName)}',
                'productCode' => '${esc(u.productCode)}',
                'lookupBarcode' => '${esc(u.lookupBarcode)}',
                'leafTypeName' => ${leafTypeName ? `'${esc(leafTypeName)}'` : 'null'},
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
            $targetProdName = trim($u['productName']);
            if (!empty($targetProdName)) {
                $productId = NutritionProductType::where('${C.NAME}', $targetProdName)->value('${C.ID}');
            }

            // 1. Resolve target NutritionProductTypeItem by Item Number or Container Barcode
            $item = null;
            $targetItemCode = trim($u['productCode']);
            $targetLookupBc = trim($u['lookupBarcode']);

            if (!empty($targetItemCode)) {
                $itemQuery = NutritionProductTypeItem::where('${C.ITEM_CODE}', $targetItemCode);
                if ($productId) {
                    $itemQuery->where('${C.ID}', $productId);
                }
                $item = $itemQuery->first();
            }

            if (!$item && !empty($targetLookupBc)) {
                $ffLookup = NutritionProductTypeFormFactor::where('${C.FF_BARCODE}', $targetLookupBc)->first();
                if ($ffLookup) {
                    $item = NutritionProductTypeItem::where('${C.ITEM_ID}', $ffLookup->${C.ITEM_ID})->first();
                }
            }

            if (!$item && !empty($u['containerUpdates'])) {
                foreach ($u['containerUpdates'] as $cu) {
                    $cuCurBc = trim($cu['currentBarcode']);
                    if (!empty($cuCurBc)) {
                        $ffLookup = NutritionProductTypeFormFactor::where('${C.FF_BARCODE}', $cuCurBc)->first();
                        if ($ffLookup) {
                            $item = NutritionProductTypeItem::where('${C.ITEM_ID}', $ffLookup->${C.ITEM_ID})->first();
                            if ($item) break;
                        }
                    }
                }
            }

            if (!$item) {
                $label = $targetItemCode ?: ($targetLookupBc ?: $targetProdName);
                $this->command->error("-> Skipped Item/FormFactor Update: Could not resolve item ($label).");
                continue;
            }

            $oldLeafTypeId = $item->${C.FF_TYPE_ID};
            $oldItemCode = $item->${C.ITEM_CODE};
            $itemUpdates = $u['itemUpdates'];
            $historyBarcode = $oldItemCode;
            $didModify = false;

            if (!empty($u['leafTypeName'])) {
                $newLeafTypeId = DB::table('nutrition_product_form_factor_types')
                    ->where('name', trim($u['leafTypeName']))
                    ->value('id');
                if ($newLeafTypeId) {
                    $itemUpdates['${C.FF_TYPE_ID}'] = $newLeafTypeId;
                }
            }

            // 2. Apply Item-level updates
            if (!empty($itemUpdates)) {
                $item->update($itemUpdates);
                $item = $item->fresh();
                $didModify = true;
                $historyBarcode = $item->${C.ITEM_CODE};

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
                $didModify = true;
            }

            // 4. Apply Container-level updates
            foreach ($u['containerUpdates'] as $cu) {
                $cuCurBc = trim($cu['currentBarcode']);
                $targetFf = null;
                if ($cu['target'] === 'leaf') {
                    $targetFf = $leafFf;
                } elseif ($cu['target'] === 'outer') {
                    $targetFf = !empty($cuCurBc)
                        ? $itemFormFactors->firstWhere('${C.FF_BARCODE}', $cuCurBc)
                        : $outerFf;
                } elseif (!empty($cuCurBc)) {
                    $targetFf = $itemFormFactors->firstWhere('${C.FF_BARCODE}', $cuCurBc)
                        ?? NutritionProductTypeFormFactor::where('${C.FF_BARCODE}', $cuCurBc)->first();
                }

                if (!$targetFf) {
                    $this->command->warn("-> Warning: Target container not found for item " . $item->${C.ITEM_CODE});
                    continue;
                }

                $ffUpdates = [];
                if (!empty($cu['newTypeName'])) {
                    $mappedTypeId = DB::table('nutrition_product_form_factor_types')
                        ->where('name', trim($cu['newTypeName']))
                        ->value('id');
                    if ($mappedTypeId) {
                        $ffUpdates['${C.FF_TYPE_ID}'] = $mappedTypeId;
                    }
                }
                if (!empty(trim($cu['newBarcode']))) {
                    $ffUpdates['${C.FF_BARCODE}'] = trim($cu['newBarcode']);
                }
                if ($cu['newQuantity'] !== null) {
                    $ffUpdates['${C.FF_QTY}'] = $cu['newQuantity'];
                }

                if (!empty($ffUpdates)) {
                    $targetFf->update($ffUpdates);
                    $didModify = true;
                    if (isset($ffUpdates['${C.FF_BARCODE}'])) {
                        $historyBarcode = $ffUpdates['${C.FF_BARCODE}'];
                    }

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

            // 6. Insert audit record into nutrition_product_types_history when item/form factor changed
            if ($didModify) {
                $product = NutritionProductType::find($item->${C.ID});
                if ($product) {
                    NutritionProductTypeHistory::create([
                        'fthistBarcode'            => $historyBarcode ?: $product->${C.BARCODE},
                        'fthistFormulaID'          => $product->${C.ID},
                        'fthistAction'             => 9001,
                        'fthistDateTime'           => Carbon::now(),
                        'fthistUser'               => 1,
                        'fthistName'               => $product->${C.NAME},
                        'fthistOrder'              => $product->${C.ORDER} ?? $product->${C.ID},
                        'fthistType'               => $product->${C.TYPE},
                        'fthistCategoryID'         => $product->${C.CATEGORY},
                        'fthistMeasurementUnit'    => $item->${C.UOM} ?: $product->${C.UOM},
                        'fthistOpenExpirationDate' => $product->${C.EXP_OPEN},
                        'fhistBaseCaloricValue'    => $product->${C.BASE_CAL},
                        'fthistDisplacement'       => $product->${C.DISPLACEMENT},
                    ]);
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
            return `            ['name' => '${esc(m.manufacturerName)}', 'description' => '${esc(m.manufacturerDescription)}']`;
        }).join(',\n');

        operationCode += `
        // ---------------------------------------------------------
        // ADD NEW MANUFACTURERS
        // ---------------------------------------------------------
        $addManufacturers = [
${mfgData}
        ];

        foreach ($addManufacturers as $m) {
            $mfgName = trim($m['name']);
            $mfgDesc = trim($m['description']);
            $exists = DB::table('nutrition_product_types_manufacturer')
                ->where('ManufacturerName', $mfgName)
                ->orWhere('ManufacturerDescription', $mfgDesc)
                ->exists();

            if (!$exists) {
                DB::table('nutrition_product_types_manufacturer')->insert([
                    'ManufacturerName' => substr($mfgName, 0, 20),
                    'ManufacturerDescription' => $mfgDesc,
                    'ManufacturerStatus' => 1,
                    'created_at' => Carbon::now(),
                    'updated_at' => Carbon::now()
                ]);
                $this->command->info("-> Added new Manufacturer: " . $mfgName);
            } else {
                $this->command->warn("-> Skipped: Manufacturer " . $mfgName . " already exists.");
            }
        }\n`;
    }

    // ==========================================
    // BLOCK 6: ADD UNITS
    // ==========================================
    if (units.length > 0) {
        let unitData = units.map(u => {
            return `            [
                'name' => '${esc(u.unitName)}', 
                'adt' => '${esc(u.unitADT)}',
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
            $unitName = trim($u['name']);
            $exists = DB::table('units')->where('unitName', $unitName)->exists();

            if (!$exists) {
                DB::table('units')->insert([
                    'unitName' => $unitName,
                    'unitADTReference' => trim($u['adt']),
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
                $this->command->info("-> Added new Unit: " . $unitName);
            } else {
                $this->command->warn("-> Skipped: Unit " . $unitName . " already exists.");
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
        Schema::disableForeignKeyConstraints();
        DB::beginTransaction();

        try {
            $this->command->info("Starting ${className} Seeder...");
${operationCode}
            AutomatedUpdates::insert([
                'updateDateTime'  => Carbon::now(),
                'updateTimestamp' => class_basename($this)
            ]);

            DB::commit();

            $this->command->info("========================================");
            $this->command->info("${className} SEEDER COMPLETED SUCCESSFULLY");
            $this->command->info("========================================");

        } catch (\\Exception $e) {
            DB::rollBack();
            $this->command->error("SEEDER FAILED: " . $e->getMessage());
            throw $e;
        } finally {
            Schema::enableForeignKeyConstraints();
        }
    }
}
`;
};