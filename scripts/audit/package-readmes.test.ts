import { describe, expect, it } from "bun:test";
import { extractH2Headings, validatePackageReadme } from "./package-readmes.ts";

describe("extractH2Headings", () => {
  it("extracts and lowercases H2 headings", () => {
    const markdown = `
# Title
## What this is
Some text.
## InSTaLl
More text.
### Not an H2
## See also
`;
    expect(extractH2Headings(markdown)).toEqual(["what this is", "install", "see also"]);
  });
});

describe("validatePackageReadme", () => {
  it("passes public tier when all required sections are present", () => {
    const content = `
## What this is
## Install
## Quickstart
## See also
## License
`;
    expect(validatePackageReadme(content, "public", "test.md")).toBeNull();
  });

  it("fails public tier on missing section", () => {
    const content = `
## What this is
## Install
## Quickstart
## License
`;
    const error = validatePackageReadme(content, "public", "test.md");
    expect(error).toContain("Missing required section in 'test.md': '## See also'");
    expect(error).toContain("What this is, Install, Quickstart, See also, License");
  });

  it("passes internal tier", () => {
    const content = `
## What this is
## See also
## License
`;
    expect(validatePackageReadme(content, "internal", "test.md")).toBeNull();
  });

  it("fails internal tier on missing section", () => {
    const content = `
## What this is
## License
`;
    const error = validatePackageReadme(content, "internal", "test.md");
    expect(error).toContain("Missing required section in 'test.md': '## See also'");
    expect(error).toContain("What this is, See also, License");
  });
});
