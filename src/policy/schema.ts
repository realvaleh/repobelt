export type RiskAction = 'require_review';

export interface RepoBeltPolicy {
  version: 1;
  protectedPaths: string[];
  riskyPaths: Record<string, RiskAction>;
  requiredChecks: string[];
  allowlist: {
    paths: string[];
  };
}

export interface RawRepoBeltPolicy {
  version?: unknown;
  protected_paths?: unknown;
  risky_paths?: unknown;
  required_checks?: unknown;
  allowlist?: unknown;
}
