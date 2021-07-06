import {
  EnumField,
  MapField,
  MessageField,
  NormalField,
  OneofField,
  OptionalField,
  RepeatedField,
  RequiredField,
  Schema,
} from "../../core/schema/model.ts";
import { CodeEntry } from "../index.ts";
import { Enum, Message } from "../../core/schema/model.ts";
import { ScalarValueTypePath } from "../../core/runtime/scalar.ts";
import { snakeToCamel, snakeToPascal } from "../../misc/case.ts";

import { StringReader } from "https://deno.land/std@0.98.0/io/mod.ts";

function buildFilePathFromPackageName(packageName: string) {
  return `${packageName.split(".").join("/")}.kt`;
}

function genEnum(typeName: string, type: Enum): string {
  const fields = Object.entries<EnumField>({
    "0": { description: "", name: "UNSPECIFIED", options: {} },
    ...type.fields,
  });

  return `public enum class ${typeName}(val value: Int) {\n${
    fields.map(([fieldValue, { name }]) => `  ${name}(${fieldValue}),`).join(
      "\n",
    )
  }
}`;
}

type ScalarToCodeTable = { [typePath in ScalarValueTypePath]: string };
const scalarTypeMapping: ScalarToCodeTable = {
  ".double": "Double",
  ".float": "Float",
  ".int32": "Int",
  ".int64": "Long",
  ".uint32": "UInt",
  ".uint64": "ULong",
  ".sint32": "Int",
  ".sint64": "Long",
  ".fixed32": "UInt",
  ".fixed64": "ULong",
  ".sfixed32": "Int",
  ".sfixed64": "Long",
  ".bool": "Boolean",
  ".string": "String",
  ".bytes": "ByteArray",
};

function genMessage(typeName: string, type: Message): string {
  const fields = Object.entries<MessageField>(type.fields);

  const requiredAndNormalFields = fields
    .filter(([, { kind }]) => kind === "normal" || kind === "required") as [
      string,
      RequiredField | NormalField,
    ][];

  const optionalFields = fields.filter(
    ([, { kind }]) => kind === "optional",
  ) as [string, OptionalField][];

  const repeatedFields = fields.filter(([, { kind }]) =>
    kind === "repeated"
  ) as [string, RepeatedField][];

  const mapFields = fields.filter(([, { kind }]) => kind === "map") as [
    string,
    MapField,
  ][];

  const oneofFields = fields.filter(([, { kind }]) => kind === "oneof") as [
    string,
    OneofField,
  ][];

  const groupedOneofFieldsMap: Map<string, OneofField[]> = new Map();
  oneofFields.forEach(([, field]) => {
    const key = field.oneof;
    const collection = groupedOneofFieldsMap.get(key);
    if (!collection) {
      groupedOneofFieldsMap.set(key, [field]);
    } else {
      collection.push(field);
    }
  });

  const groupedOneofFields = Array.from(groupedOneofFieldsMap);

  const value = `public data class ${typeName} (\n${
    [
      ...requiredAndNormalFields.map(([, { name, typePath }]) =>
        `  var ${snakeToCamel(name)}: ${pbTypeToKtType(typePath)},`
      ),
      ...optionalFields.map(([, { name, typePath }]) =>
        `  var ${snakeToCamel(name)}: ${pbTypeToKtType(typePath)}?,`
      ),
      ...repeatedFields.map(([, { name, typePath }]) =>
        `  var ${snakeToCamel(name)}: List<${pbTypeToKtType(typePath)}>,`
      ),
      ...mapFields.map(([, { name, keyTypePath, valueTypePath }]) =>
        `  var ${snakeToCamel(name)}: MutableMap<${
          pbTypeToKtType(keyTypePath)
        }, ${pbTypeToKtType(valueTypePath)}>`
      ),
      ...groupedOneofFields.map(([oneof]) =>
        `  var ${snakeToCamel(oneof)}: ${snakeToPascal(oneof)}`
      ),
    ].join("\n")
  }
) {\n${
    [
      ...groupedOneofFields.map(([oneof, fields]) =>
        `  sealed class ${snakeToPascal(oneof)} {\n${
          fields.map(({ name, typePath }) =>
            `    class ${snakeToCamel(name)}(var value: ${
              pbTypeToKtType(typePath)
            }): ${snakeToPascal(oneof)}()`
          ).join("\n")
        }
  }`
      ),
    ].join("\n")
  }
}`;

  return value;

  // TODO: map custom types
  function pbTypeToKtType(typePath?: string) {
    if (!typePath) return "Any";
    if (typePath in scalarTypeMapping) {
      return scalarTypeMapping[typePath as keyof typeof scalarTypeMapping];
    }
    return "Any";
  }
}

export default async function* gen(
  schema: Schema,
): AsyncGenerator<CodeEntry> {
  const files = schema.files;

  for (const filename in files) {
    const file = files[filename];
    // TODO: packageName이 비었을 때 처리
    const packageName = file.options.java_package;
    if (typeof packageName !== "string") {
      console.log("Java package not found!");
      continue;
    }

    const packageString = `package ${packageName}`;

    const typePaths = file.typePaths;
    const typeString = typePaths.map((typePath) => {
      const type = schema.types[typePath];
      const typeName = typePath.split(".").slice(-1)[0];

      switch (type.kind) {
        case "enum":
          return genEnum(typeName, type);
        case "message":
          return genMessage(typeName, type);
        default:
          console.error("Unknown type");
          throw Error("Undefined type");
      }
    }).join("\n\n");

    yield [
      buildFilePathFromPackageName(packageName),
      new StringReader([
        packageString,
        "",
        typeString,
      ].join("\n")),
    ];
  }
}
