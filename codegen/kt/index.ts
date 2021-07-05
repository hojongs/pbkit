import { Schema } from "../../core/schema/model.ts";
import { CodeEntry } from "../index.ts";

import { StringReader } from "https://deno.land/std@0.98.0/io/mod.ts";

function buildFilePathFromPackageName(packageName: string) {
  return `${packageName.split(".").join("/")}.kt`;
}

export default async function* gen(
  schema: Schema,
): AsyncGenerator<CodeEntry> {
  const files = schema.files;

  for (const filename in files) {
    console.log(files[filename]);
    const packageName = files[filename].options.java_package;
    if (typeof packageName !== "string") {
      console.log("Java package not found!");
      continue;
    }

    const packageString = `package ${packageName}`;

    yield [
      buildFilePathFromPackageName(packageName),
      new StringReader([packageString].join("\n")),
    ];
  }
}
