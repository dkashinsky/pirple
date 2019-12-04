/*
 * Validation helper
 *
 */

// Validator class
class Validator {
    constructor(validationSchema){
        // schema is plain object where each property is an array of validators to apply
        this.validationSchema = validationSchema;
    }

    validate(data){
        const validationMap = new Map();
        for (const property in this.validationSchema){
            if (this.validationSchema.hasOwnProperty(property)){
                const validators = this.validationSchema[property];
                const validationResult = [];
                validators.forEach(validator => validationResult.push(validator(data[property])));
                validationMap.set(property, validationResult);
            }
        }

        return new ValidationResult(validationMap);
    }
}

// ValidationResult class
class ValidationResult{
    constructor(validationMap){
        this.validationMap = validationMap;
    }

    isValid(){
        for (const [property, results] of this.validationMap){
            if (results.some(v => !v.isValid)) return false;
        }
        return true;
    }

    getData(){
        const data = {};
        for (const [property, results] of this.validationMap){
            data[property] = results[results.length - 1].value;
        }
        return data;
    }
}

// validation metadata helper
function getValidationMeta(rawValue, value, isValid){
    return {
        rawValue,
        value,
        isValid
    };
}

// typeof validator
function typeOf(value, type){
    return getValidationMeta(value, value, typeof (value) == type);
}

// Helpers container
const helpers = {};

 // typeof helper
helpers.typeof = function(type){
    return value => typeOf(value, type);
};

 // required helper
 helpers.required = function(value) {
    const type = typeof (value);
    if (type == 'string'){
        const trimmedValue = value.trim();
        return getValidationMeta(value, trimmedValue, trimmedValue.length > 0);
    }
    return getValidationMeta(value, value, !!value);
};

 // min length helper
helpers.minLength = function(minLenght){
    return value => {
        const typeCheck = typeOf(value, 'string');
        if (typeCheck.isValid){
            const trimmedValue = value.trim();
            return getValidationMeta(value, trimmedValue, trimmedValue.length >= minLenght);
        }
        else {
            return typeCheck;
        }
    };
};

// regex helper
helpers.regex = function(regex){
    return value => {
        const typeCheck = typeOf(value, 'string');
        if (typeCheck.isValid){
            return getValidationMeta(value, value, regex.test(value));
        }
        else {
            return typeCheck;
        }
    };
}

// boolean value helper
helpers.bool = function(expected){
    return value => {
        const typeCheck = typeOf(value, 'boolean');
        if (typeCheck.isValid){
            return getValidationMeta(value, value, value === expected);
        }
        else {
            return typeCheck;
        }
    };
};

//export class to be used outside
helpers.Validator = Validator;

 // Export module
 module.exports = helpers;