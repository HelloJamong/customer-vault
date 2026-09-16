const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const repoRoot = path.resolve(__dirname, '..', '..');
const entrypointPath = path.join(repoRoot, 'backend', 'docker-entrypoint.sh');

function serviceBlock(composeText, serviceName) {
  const pattern = new RegExp(`^  ${serviceName}:\\n([\\s\\S]*?)(?=^  [A-Za-z0-9_-]+:|^networks:|^volumes:|\\z)`, 'm');
  const match = composeText.match(pattern);
  assert.ok(match, `expected ${serviceName} service to exist`);
  return `  ${serviceName}:\n${match[1]}`;
}

function shellDoubleQuoted(value) {
  return value.replace(/(["\\$`])/g, '\\$1');
}

function makeMockNpx(binDir) {
  const mock = path.join(binDir, 'npx');
  fs.writeFileSync(mock, `#!/bin/sh
set -u
printf '%s\\n' "$*" >> "$MOCK_COMMAND_LOG"
case "$*" in
  "prisma generate")
    exit 0
    ;;
  "prisma migrate deploy")
    count_file="$MOCK_STATE_DIR/deploy-count"
    count=0
    if [ -f "$count_file" ]; then
      count=$(cat "$count_file")
    fi
    count=$((count + 1))
    printf '%s' "$count" > "$count_file"
    case "$MOCK_MIGRATE_SCENARIO" in
      success)
        echo "deploy ok"
        exit 0
        ;;
      fail)
        echo "unexpected migration failure" >&2
        exit 42
        ;;
      p3005)
        if [ "$count" -eq 1 ]; then
          echo "Error: P3005 database schema is not empty" >&2
          exit 1
        fi
        echo "deploy ok after resolve"
        exit 0
        ;;
    esac
    echo "unknown scenario: $MOCK_MIGRATE_SCENARIO" >&2
    exit 98
    ;;
  "prisma migrate resolve --applied 20260106000000_init")
    exit 0
    ;;
  "prisma db push")
    echo "db push should not run when migrations exist" >&2
    exit 97
    ;;
  "prisma db execute --stdin")
    exit 0
    ;;
  *)
    echo "unexpected npx command: $*" >&2
    exit 99
    ;;
esac
`);
  fs.chmodSync(mock, 0o755);
}

function runEntrypointScenario(scenario, includeInitialMigration = true) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'customer-vault-entrypoint-'));
  const binDir = path.join(tmp, 'bin');
  const stateDir = path.join(tmp, 'state');
  const migrationsDir = path.join(tmp, 'prisma', 'migrations');
  fs.mkdirSync(binDir);
  fs.mkdirSync(stateDir);
  fs.mkdirSync(migrationsDir, { recursive: true });
  if (includeInitialMigration) {
    const initialMigrationDir = path.join(migrationsDir, '20260106000000_init');
    fs.mkdirSync(initialMigrationDir, { recursive: true });
    fs.writeFileSync(path.join(initialMigrationDir, 'migration.sql'), '-- migration exists\n');
  } else {
    fs.writeFileSync(path.join(migrationsDir, 'unexpected-file.txt'), 'not a migration directory\n');
  }
  makeMockNpx(binDir);

  const script = fs.readFileSync(entrypointPath, 'utf8').replace(
    'MIGRATIONS_DIR="/app/prisma/migrations"',
    `MIGRATIONS_DIR="${shellDoubleQuoted(migrationsDir)}"`,
  );
  const scriptPath = path.join(tmp, 'docker-entrypoint.sh');
  fs.writeFileSync(scriptPath, script);
  fs.chmodSync(scriptPath, 0o755);

  const commandLog = path.join(tmp, 'commands.log');
  const result = spawnSync(scriptPath, ['/bin/true'], {
    cwd: tmp,
    env: {
      ...process.env,
      DATABASE_URL: 'mysql://user:pass@db:3306/customer_db',
      MOCK_COMMAND_LOG: commandLog,
      MOCK_MIGRATE_SCENARIO: scenario,
      MOCK_STATE_DIR: stateDir,
      PATH: `${binDir}${path.delimiter}${process.env.PATH}`,
    },
    encoding: 'utf8',
  });

  const commands = fs.existsSync(commandLog)
    ? fs.readFileSync(commandLog, 'utf8').trim().split('\n').filter(Boolean)
    : [];

  fs.rmSync(tmp, { recursive: true, force: true });
  return { ...result, commands };
}

test('backend service is not published to host in online and offline compose files', () => {
  for (const file of ['docker-compose.yml', 'docker-compose.offline.yml']) {
    const compose = fs.readFileSync(path.join(repoRoot, file), 'utf8');
    const backend = serviceBlock(compose, 'backend');
    const proxy = serviceBlock(compose, 'proxy');

    assert.doesNotMatch(backend, /\n    ports:\n/, `${file} backend must not publish host ports`);
    assert.match(backend, /\n    expose:\n      - "5000"\n/, `${file} backend should document internal port 5000`);
    assert.match(proxy, /\n    ports:\n      - "\$\{PROXY_PORT:-2082\}:80"\n/, `${file} proxy remains the host entrypoint`);
  }
});

test('nginx proxy reaches backend through the internal compose network', () => {
  const nginx = fs.readFileSync(path.join(repoRoot, 'proxy', 'nginx.conf'), 'utf8');
  assert.match(nginx, /upstream backend_api \{\n\s*server backend:5000;\n\s*\}/);
});

test('entrypoint preserves successful migrate deploy exit status', () => {
  const result = runEntrypointScenario('success');
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.deepEqual(result.commands, [
    'prisma generate',
    'prisma migrate deploy',
    'prisma db execute --stdin',
  ]);
  assert.match(result.stdout, /deploy ok/);
  assert.match(result.stdout, /Starting application/);
});

test('entrypoint exits on non-P3005 migrate deploy failure', () => {
  const result = runEntrypointScenario('fail');
  assert.notEqual(result.status, 0, 'unexpected migration failure must fail the container startup');
  assert.deepEqual(result.commands, [
    'prisma generate',
    'prisma migrate deploy',
  ]);
  assert.match(result.stdout, /unexpected migration failure/);
  assert.match(result.stdout, /Migration failed with unexpected error/);
  assert.doesNotMatch(result.stdout, /Starting application/);
});

test('entrypoint preserves P3005 fallback resolve and retry path', () => {
  const result = runEntrypointScenario('p3005');
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.deepEqual(result.commands, [
    'prisma generate',
    'prisma migrate deploy',
    'prisma migrate resolve --applied 20260106000000_init',
    'prisma migrate deploy',
    'prisma db execute --stdin',
  ]);
  assert.match(result.stdout, /P3005/);
  assert.match(result.stdout, /Retrying migration deployment/);
  assert.match(result.stdout, /deploy ok after resolve/);
  assert.match(result.stdout, /Starting application/);
});

test('entrypoint fails closed when P3005 has no migration to resolve', () => {
  const result = runEntrypointScenario('p3005', false);
  assert.notEqual(result.status, 0, 'P3005 recovery must fail without an initial migration');
  assert.deepEqual(result.commands, [
    'prisma generate',
    'prisma migrate deploy',
  ]);
  const output = `${result.stdout}${result.stderr}`;
  assert.match(output, /no initial migration directory found/i);
  assert.doesNotMatch(output, /Starting application/);
});
