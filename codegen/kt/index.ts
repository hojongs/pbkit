import { EnumField, Schema } from "../../core/schema/model.ts";
import { CodeEntry } from "../index.ts";
import { Enum, Message } from "../../core/schema/model.ts";

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

function genMessage(typeName: string, type: Message): string {
  return `// MSG_${typeName}_UNIMPL`;
}

export default async function* gen(
  schema: Schema,
): AsyncGenerator<CodeEntry> {
  const files = schema.files;

  for (const filename in files) {
    const file = files[filename];
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
