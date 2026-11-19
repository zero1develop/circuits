import { fileURLToPath } from "url";

// `circomkit setup` creates single-contributor development keys. They are not production
// ceremony output, so setup only runs behind an explicit opt-in (see CEREMONY.md).
export function assertDevKeysAllowed(): void {
  if (process.env.ALLOW_DEV_KEYS === "1") return;
  console.error(
    "Refusing to run circomkit setup without an explicit development-key opt-in.\n" +
      "Set ALLOW_DEV_KEYS=1 to generate dev keys for circuit development (see CEREMONY.md).",
  );
  process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  assertDevKeysAllowed();
}
