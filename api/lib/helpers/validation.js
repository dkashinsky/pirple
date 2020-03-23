/*
 * Validation helper
 *
 */

// Validator class
class Validator {
    constructor(validationSchema) {
        // schema is plain object where each property is an array of validators to apply
        this.validationSchema = validationSchema;
    }

    validate(data) {
        const validationMap = new Map();
        for (const property in this.validationSchema) {
            if (this.validationSchema.hasOwnProperty(property)) {
                const validators = this.validationSchema[property];
                const [modifier] = validators;
                const value = data[property];
                const validationResult = [];

                if (modifier === optional && !modifier(value).value) {
                    validationResult.push(modifier(value))
                } else {
                    validators.forEach(validator => validationResult.push(validator(value)));
                }

                validationMap.set(property, validationResult);
            }
        }

        return new ValidationResult(validationMap);
    }
}

// ValidationResult class
class ValidationResult {
    constructor(validationMap) {
        this.validationMap = validationMap;
    }

    isValid() {
        for (const [property, results] of this.validationMap) {
            if (results.some(v => !v.isValid)) return false;
        }
        return true;
    }

    getData(transform, emitUndefined = true) {
        const data = {};
        for (const [property, results] of this.validationMap) {
            const emittedValue = results[results.length - 1].value;
            if (emitUndefined || typeof (emittedValue) !== "undefined") {
                data[property] = emittedValue;
            }
        }

        transform = transform || [];
        transform.forEach(transformation => applyTransformation(data, transformation));

        return data;
    }
}

const whenProperty = 'when';
function applyTransformation(target, transformationObject) {
    for (const propery in transformationObject) {
        if (transformationObject.hasOwnProperty(propery) && propery !== whenProperty) {
            const transformation = transformationObject[propery]
            const type = typeof transformation;
            const condition = transformationObject[whenProperty] || (() => true);

            console.log({
                transformation,
                type,
                condition
            });

            if (type === 'boolean')
                !transformation && delete target[propery];
            else if (type === 'function')
                condition(target) && (target[propery] = transformation(target));
            else
                throw new Error('Unknown transformation type');
        }
    }
}

// validation metadata helper
function getValidationMeta(rawValue, value, isValid) {
    return {
        rawValue,
        value,
        isValid
    };
}

// typeof validator
function typeOf(value, type) {
    const actual = typeof (value);
    if (actual === 'number')
        return getValidationMeta(value, value, !isNaN(value));

    return getValidationMeta(value, value, actual == type);
}

// Helpers container
const helpers = {};

// typeof helper
helpers.typeof = function (type) {
    return value => typeOf(value, type);
};

// required helper
helpers.required = function (value) {
    const type = typeof (value);
    if (type == 'string') {
        const trimmedValue = value.trim();
        return getValidationMeta(value, trimmedValue, trimmedValue.length > 0);
    }
    return getValidationMeta(value, value, !!value);
};

// optional helper
function optional(value) {
    const type = typeof (value);
    if (type == 'string') {
        const trimmedValue = value.trim();
        return getValidationMeta(value, trimmedValue, true);
    }
    return getValidationMeta(value, value, true);
}
helpers.optional = optional;

// number is in provided range
helpers.between = function ([lower, higher], inclusive = false) {
    return value => {
        const typeCheck = typeOf(value, 'number');
        if (typeCheck.isValid) {
            const inclusiveCheck = (v) => v >= lower && v <= higher;
            const exclusiveCheck = (v) => v > lower && v < higher;

            const check = inclusive ? inclusiveCheck : exclusiveCheck;
            return getValidationMeta(value, value, check(value));
        }
        else {
            return typeCheck;
        }
    };
};

// number is greater than
helpers.greaterThan = function(minValue, inclusive = false){
    return (value) => {
        const typeCheck = typeOf(value, 'number');
        if (typeCheck.isValid) {
            const inclusiveCheck = (v) => v >= minValue;
            const exclusiveCheck = (v) => v > minValue;

            const check = inclusive ? inclusiveCheck : exclusiveCheck;
            return getValidationMeta(value, value, check(value));
        }
        else {
            return typeCheck;
        }
    };
}

// min length helper
helpers.minLength = function (minLenght) {
    return value => {
        const typeCheck = typeOf(value, 'string');
        if (typeCheck.isValid) {
            const trimmedValue = value.trim();
            return getValidationMeta(value, trimmedValue, trimmedValue.length >= minLenght);
        }
        else {
            return typeCheck;
        }
    };
};

// max string length helper
helpers.maxLength = function (maxLength) {
    return value => {
        const typeCheck = typeOf(value, 'string');
        if (typeCheck.isValid) {
            const trimmedValue = value.trim();
            return getValidationMeta(value, trimmedValue, trimmedValue.length <= maxLength);
        }
        else {
            return typeCheck;
        }
    };
};

// regex helper
helpers.regex = function (regex) {
    return value => {
        const typeCheck = typeOf(value, 'string');
        if (typeCheck.isValid) {
            return getValidationMeta(value, value, regex.test(value));
        }
        else {
            return typeCheck;
        }
    };
}

// boolean value helper
helpers.bool = function (expected) {
    return value => {
        const typeCheck = typeOf(value, 'boolean');
        if (typeCheck.isValid) {
            return getValidationMeta(value, value, value === expected);
        }
        else {
            return typeCheck;
        }
    };
};

// value in range helper
helpers.from = function (range) {
    return value => getValidationMeta(value, value, range.indexOf(value) > -1);
};

// array validator helper
helpers.notEmptyArray = function (type) {
    return value => {
        const isArray = value instanceof Array && value.length > 0;
        return getValidationMeta(value, value,
            isArray && value.every(v => typeOf(v, type).isValid));
    };
};

//export class to be used outside
helpers.Validator = Validator;

// Export module
module.exports = helpers;