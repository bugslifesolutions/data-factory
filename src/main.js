/**
 * @name data-factory
 * @module
 * @author [@reactioncommerce]{@link https://github.com/reactioncommerce}
 * @see https://github.com/reactioncommerce/data-factory
 */

import get from "lodash.get";
import set from "lodash.set";
import { faker } from "@faker-js/faker";
import RandExp from "randexp";

const randomName = faker.person.fullName(); // Rowan Nikolaus
const randomEmail = faker.internet.email(); // Kassandra.Haley@erich.biz
import SimpleSchema from "simpl-schema";

SimpleSchema.extendOptions(["mockValue"]);

/**
 * @const {Object} Factory - Factory object will hold scehma factory utils
 * for creating mock data based on the attached schema
 */
export const Factory = {};

/**
 *
 * @name createMock
 * @function
 * @summary Creates a mock object of [faker]{@link https://github.com/marak/Faker.js} values based on a provided schema.
 * This function is heavely based on [simpl-schema-mockdoc]{@link https://github.com/CambridgeSoftwareLtd/simpl-schema-mockdoc} `getMockDoc` function.
 * @param {SimpleSchema} schema - A [SimpleSchema]{@link https://github.com/aldeed/simple-schema-js} instance.
 * @param {String} prefix - Mock value prefix.
 * @param {Boolean} addId - True to add `_id` to mock object.
 * @return {Object} - Mock object based on provided schema.
 */
const createMock = (schema, prefix, addId) => {
  const docPrefix = prefix || "mock";
  const mockDoc = {};
  const model = schema._schema;

  Object.keys(model).forEach((key) => {
    let fieldValue = null;

    // If field defined by parent
    const currentMockValue = get(mockDoc, `${key.replace(".$", ".0")}`);
    if (currentMockValue !== undefined) {
      return;
    }

    const defField = get(model[key], "type.definitions[0]") || model[key];

    try {
      if (model[key].mockValue !== undefined) {
        fieldValue = model[key].mockValue;
      } else if (model[key].defaultValue !== undefined) {
        fieldValue = model[key].defaultValue;
      } else if (model[key].autoValue !== undefined) {
        fieldValue = model[key].autoValue.call({ operator: null });
      } else if (Array.isArray(defField.allowedValues)) {
        fieldValue = defField.allowedValues[0]; // eslint-disable-line
      } else {
        throw new Error("Invalid");
      }
    } catch (err) {
      // Need 'defField' for field like: `key: Boolean`
      const fieldType = defField.type || defField;

      switch (fieldType) {
        case Date:
          fieldValue = faker.date.anytime();
          break;

        case SimpleSchema.Integer:
          fieldValue = defField.min || defField.max || faker.number.int({min:0, max: Math.pow(2,31)});
          break;

        case Number:
          fieldValue = defField.min || defField.max || faker.number.int();
          break;

        case String:
          fieldValue = `${docPrefix}${key.replace(/^\w/, (char) =>
            char.toUpperCase())}`;
          if (defField.regEx) {
              fieldValue = new RandExp(defField.regEx).gen();
          }
          break;

        case Boolean:
          fieldValue =
            defField.defaultValue !== undefined
              ? defField.defaultValue
              : faker.datatype.boolean(0.5);
          break;

        case Object: {
          fieldValue = {};
          break;
        }

        case Array:
          fieldValue = [];
          break;

        default:
          if (SimpleSchema.isSimpleSchema(fieldType)) {
            fieldValue = createMock(fieldType, prefix);
          }
          break;
      }
    }

    set(mockDoc, key.replace(".$", ".0"), fieldValue);
  });

  if (addId) {
    mockDoc._id = faker.string.alphanumeric(17);
  }

  return mockDoc;
};

/**
 * @name createFactoryForSchema
 * @function
 * @summary Creates Factory[propName] for building fake documents with the given schema.
 * @param {String} propName - The property name to add to the `Factory` object. This should match the
 *   schema variable's name.
 * @param {SimpleSchema} schema - A [SimpleSchema]{@link https://github.com/aldeed/simple-schema-js} instance.
 * @return {undefined} - No return.
 */
export function createFactoryForSchema(propName, schema) {
  // eslint-disable-next-line
  if (Factory.hasOwnProperty(propName)) {
    throw new Error(`Factory already has a "${propName}" property`);
  }

  Factory[propName] = {
    makeOne(props = {}, index) {
      const doc = createMock(schema, "mock", true);
      Object.keys(props).forEach((key) => {
        const value = props[key];
        if (typeof value === "function") {
          doc[key] = value(index);
        } else {
          doc[key] = value;
        }
      });
      return doc;
    },
    makeMany(length, props) {
      return Array.from({ length }).map((value, index) =>
        this.makeOne(props, index));
    }
  };
}
