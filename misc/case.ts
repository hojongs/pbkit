export function snakeToCamel(snake: string): string {
  const [head, ...rest] = snake.split("_");
  return (
    head + rest.map(
      (frag) => frag[0].toUpperCase() + frag.substr(1),
    ).join("")
  );
}

export function pascalToCamel(pascal: string): string {
  return pascal[0].toLowerCase() + pascal.substr(1);
}

export function snakeToPascal(snake: string): string {
  const camel = snakeToCamel(snake);
  return camel[0].toUpperCase() + camel.substr(1);
}
