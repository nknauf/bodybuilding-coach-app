import { describe, expect, it } from "vitest";
import { evaluateAuditPolicy } from "../../scripts/lib/audit-policy.mjs";

type Via =
  string | { url: string; severity: string; name: string; dependency: string };
type Vulnerability = {
  name: string;
  severity: string;
  via: Via[];
  nodes: string[];
};
type Report = {
  metadata: { vulnerabilities: Record<string, number> };
  vulnerabilities: Record<string, Vulnerability>;
};
type AuditOptions = {
  full?: unknown;
  production?: Report;
  exceptions?: unknown;
  lock?: unknown;
  now?: number;
};

const paths = [
  "node_modules/@next/eslint-plugin-next",
  "node_modules/@shadcn/registry",
  "node_modules/@ts-morph/common",
  "node_modules/braces",
  "node_modules/eslint-config-next",
  "node_modules/@shadcn/registry/node_modules/fast-glob",
  "node_modules/@ts-morph/common/node_modules/fast-glob",
  "node_modules/fast-glob",
  "node_modules/shadcn/node_modules/fast-glob",
  "node_modules/micromatch",
  "node_modules/shadcn",
  "node_modules/ts-morph",
];
const exception = {
  schemaVersion: 1,
  advisory: "GHSA-vfj7-8cjw-p6xm",
  package: "braces",
  severity: "high",
  reason: "dev-only braces chain",
  approvedBy: "nknauf",
  approvedAt: "2026-10-20T02:17:37.000Z",
  expiresAt: "2026-11-03T02:17:37.000Z",
  paths,
};
const lock = {
  lockfileVersion: 3,
  packages: Object.fromEntries(
    paths.map((path) => [
      path,
      {
        name: path.slice(path.lastIndexOf("node_modules/") + 13),
        version: path.endsWith("/braces") ? "3.0.3" : "1.0.0",
        dev: true,
      },
    ]),
  ),
};
const braces: Vulnerability = {
  name: "braces",
  severity: "high",
  via: [
    {
      url: "https://github.com/advisories/GHSA-vfj7-8cjw-p6xm",
      severity: "high",
      name: "braces",
      dependency: "braces",
    },
  ],
  nodes: ["node_modules/braces"],
};
const report = (vulnerabilities: Record<string, Vulnerability>): Report => {
  const counts = {
    info: 0,
    low: 0,
    moderate: 0,
    high: 0,
    critical: 0,
    total: Object.keys(vulnerabilities).length,
  };
  for (const item of Object.values(vulnerabilities))
    counts[item.severity as keyof typeof counts]++;
  return { metadata: { vulnerabilities: counts }, vulnerabilities };
};
const clean = report({});
const full = report({ braces });
const now = Date.parse("2026-10-20T02:17:37.000Z");
const run = (opts: AuditOptions = {}) =>
  evaluateAuditPolicy({
    full,
    production: clean,
    lock,
    exceptions: [exception],
    now,
    ...opts,
  });
const inherited = (name: string, via: Via[], node: string): Vulnerability => ({
  name,
  severity: "high",
  via,
  nodes: [node],
});

describe("security audit policy", () => {
  it("allows only the approved advisory and inherited chain", () => {
    const extended = report({
      braces,
      micromatch: inherited(
        "micromatch",
        ["braces"],
        "node_modules/micromatch",
      ),
    });
    expect(run({ full: extended }).ok).toBe(true);
  });

  it("allows clean audits even after the exception expires", () => {
    expect(
      run({
        full: clean,
        exceptions: [],
        now: Date.parse("2027-01-01T00:00:00.000Z"),
      }).ok,
    ).toBe(true);
  });

  it("rejects new findings at every severity and unknown advisory leaves", () => {
    for (const severity of ["low", "moderate", "high", "critical"]) {
      const added = report({
        braces,
        other: {
          ...inherited(
            "other",
            [
              {
                url: "https://github.com/advisories/GHSA-new",
                severity: "high",
                name: "other",
                dependency: "other",
              },
            ],
            "node_modules/braces",
          ),
          severity,
        },
      });
      expect(() => run({ full: added })).toThrow(/unapproved/);
    }
    const unexpectedLeaf = report({
      braces: {
        ...braces,
        via: [
          {
            ...(braces.via[0] as Exclude<Via, string>),
            url: "https://github.com/advisories/GHSA-new",
          },
        ],
      },
    });
    expect(() => run({ full: unexpectedLeaf })).toThrow(/unexpected advisory/);
  });

  it("rejects missing nodes, cycles, empty via, null via, and unexpected paths", () => {
    expect(() =>
      run({
        full: report({
          braces,
          micromatch: inherited(
            "micromatch",
            ["missing"],
            "node_modules/micromatch",
          ),
        }),
      }),
    ).toThrow(/missing via/);
    expect(() =>
      run({ full: report({ braces: { ...braces, via: ["braces"] } }) }),
    ).toThrow(/cyclic via/);
    expect(() =>
      run({ full: report({ braces: { ...braces, via: [] } }) }),
    ).toThrow(/empty via/);
    expect(() =>
      run({
        full: report({ braces: { ...braces, via: [null as unknown as Via] } }),
      }),
    ).toThrow(/unexpected advisory/);
    expect(() =>
      run({
        exceptions: [{ ...exception, paths: [...paths, "node_modules/other"] }],
      }),
    ).toThrow(/unknown or non-dev/);
  });

  it("rejects expiry renewal, production exposure, invalid reports, and inconsistent metadata", () => {
    expect(() =>
      run({
        exceptions: [{ ...exception, expiresAt: "2026-11-04T02:17:37.000Z" }],
      }),
    ).toThrow(/immutable approval/);
    expect(() => run({ production: full })).toThrow(/production/);
    expect(() => run({ full: "{bad json" })).toThrow(/invalid JSON/);
    expect(() =>
      run({
        full: {
          ...full,
          metadata: {
            vulnerabilities: { ...full.metadata.vulnerabilities, total: 9 },
          },
        },
      }),
    ).toThrow(/metadata/);
    expect(() => run({ now: Number.NaN })).toThrow(/current time/);
    expect(() =>
      run({ full: { ...full, vulnerabilities: [] } as unknown as Report }),
    ).toThrow(/invalid npm audit schema/);
    expect(() =>
      run({
        full: { ...clean, error: { code: "EUNKNOWN" } } as unknown as Report,
      }),
    ).toThrow(/invalid npm audit schema/);
    expect(() => run({ lock: { packages: lock.packages } })).toThrow(
      /lockfile schema/,
    );
    expect(() =>
      run({
        exceptions: [
          {
            ...exception,
            approvedAt: "2026-10-21T02:17:37.000Z",
            expiresAt: "2026-11-04T02:17:37.000Z",
          },
        ],
      }),
    ).toThrow(/immutable approval/);
  });
});
