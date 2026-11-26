// CLI respawn skip policy for help, interactive TTY commands, and foreground Gateway runs.
import { resolveCliArgvInvocation } from "./argv-invocation.js";
import { getCommandPositionalsWithRootOptions } from "./argv.js";

const GATEWAY_RUN_BOOLEAN_FLAGS = [
  "--allow-unconfigured",
  "--claude-cli-logs",
  "--cli-backend-logs",
  "--compact",
  "--dev",
  "--force",
  "--raw-stream",
  "--reset",
  "--tailscale-reset-on-exit",
  "--verbose",
] as const;

const GATEWAY_RUN_VALUE_FLAGS = [
  "--auth",
  "--bind",
  "--password",
  "--password-file",
  "--port",
  "--raw-stream-path",
  "--tailscale",
  "--token",
  "--ws-log",
] as const;

const INTERACTIVE_TTY_COMMANDS = new Set(["tui", "terminal", "chat"]);

function isInteractiveTtyCommandArgv(argv: string[]): boolean {
  const invocation = resolveCliArgvInvocation(argv);
  return invocation.primary !== null && INTERACTIVE_TTY_COMMANDS.has(invocation.primary);
}

export function isTerminalInteractiveRespawnArgv(argv: string[]): boolean {
  const invocation = resolveCliArgvInvocation(argv);
  if (invocation.hasHelpOrVersion) {
    return false;
  }
  return invocation.primary === null || INTERACTIVE_TTY_COMMANDS.has(invocation.primary);
}

function isForegroundGatewayRunArgv(argv: string[]): boolean {
  const positionals = getCommandPositionalsWithRootOptions(argv, {
    commandPath: ["gateway"],
    booleanFlags: GATEWAY_RUN_BOOLEAN_FLAGS,
    valueFlags: GATEWAY_RUN_VALUE_FLAGS,
  });
  if (!positionals) {
    return false;
  }
  // Foreground gateway owns the terminal/process environment itself; respawning would
  // add an extra parent process around the long-lived server.
  return positionals.length === 0 || (positionals.length === 1 && positionals[0] === "run");
}

/** Returns whether CLI startup should avoid the general respawn wrapper for this argv. */
export function shouldSkipRespawnForArgv(argv: string[]): boolean {
  const invocation = resolveCliArgvInvocation(argv);
  return (
    invocation.hasHelpOrVersion ||
    isInteractiveTtyCommandArgv(argv) ||
    (invocation.primary === "gateway" && isForegroundGatewayRunArgv(argv))
  );
}

/**
 * `openclaw hooks relay` is the per-event native harness hook (Codex runs one for every tool call).
 * It must stay a single process: the harness kills the command it spawned when the hook times out,
 * and a respawned child is detached into its own process group, so it would outlive that kill as an
 * orphan. Under load those orphans (one full CLI each) exhausted a gateway container's memory.
 */
export function isNativeHookRelayArgv(argv: string[]): boolean {
  const invocation = resolveCliArgvInvocation(argv);
  return (
    invocation.primary === "hooks" &&
    invocation.commandPath[0] === "hooks" &&
    invocation.commandPath[1] === "relay"
  );
}

/** Returns whether startup-environment respawn should be skipped without suppressing TUI respawn policy. */
export function shouldSkipStartupEnvironmentRespawnForArgv(argv: string[]): boolean {
  const invocation = resolveCliArgvInvocation(argv);
  return (
    invocation.hasHelpOrVersion ||
    (invocation.primary === "gateway" && isForegroundGatewayRunArgv(argv)) ||
    isNativeHookRelayArgv(argv)
  );
}
