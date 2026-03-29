export function slugify(input: string) {
  return input
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function createRandomSuffix() {
  return Math.random().toString(36).slice(2, 8);
}
