/**
 * Global Database Schema Constants
 * Maps directly to TMS database architecture for easy global updates.
 */
const DB_SCHEMA = {
    TABLES: {
        PRODUCTS: 'nutrition_product_types',
        ITEMS: 'nutrition_product_type_items',
        FORM_FACTORS: 'nutrition_product_type_form_factors',
        HISTORY: 'nutrition_product_types_history',
        MANUFACTURERS: 'nutrition_product_types_manufacturer',
        APPLICABLE_FF: 'nutrition_product_types__applicable_form_factor_types',
        ADDITIVE_CONTEXT: 'nutrition_product_types__additive_context_units',
        USE_CONTEXTS: 'nutrition_product_types__use_contexts'
    },
    COLUMNS: {
        // Products
        ID: 'formtypeID',
        NAME: 'formtypeName',
        SHORT_NAME: 'formtypeShortName',
        HL7_REF: 'formtypeHL7Reference',
        HL7_FORT: 'formtypeFortifierHL7Reference',
        MFG_ID: 'formtypeManufacturerID',
        TYPE: 'formtypeType',
        CATEGORY: 'formtypeCategoryID',
        UOM: 'formtypeMeasurementUnit',
        BASE_CAL: 'formtypeBaseCaloricValue',
        CAL_PER_OZ: 'formtypeCalPerOz',
        DISPLACEMENT: 'formtypeDisplacement',
        EXP_OPEN: 'formtypeOpenExpirationDate',
        EXP_PREP: 'formtypeExpirationHour',
        BARCODE: 'formtypeProductBarcode',
        IS_BASE: 'formtypeCanBeBase',
        IS_FORT: 'formtypeCanBeFortifier',
        IS_MOD: 'formtypeCanBeModular',
        ACTIVE: 'formtypeActive',
        ORDER: 'formtypeOrder',
        
        // Items
        ITEM_ID: 'formtypeitemID',
        ITEM_CODE: 'formtypeProductCode',
        ITEM_VOL: 'formtypeMeasurementVolume',
        IS_PROTECTED: 'isRecordProtected',
        
        // Form Factors
        FF_TYPE_ID: 'formfactortypeID',
        FF_BARCODE: 'formfactorBarcode',
        FF_QTY: 'formfactorUnitQuantity',
        FF_PARENT: 'formfactorParentID'
    }
};