export function splitListInput(input: string) {
  return input
    .split(/\r?\n|,/g)
    .map((item) => item.trim())
    .filter(Boolean);
}
