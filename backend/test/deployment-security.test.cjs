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
        echo "Error: P3005 database schema is not empty" >&2
        exit 1
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
      NODE_ENV: 'production',
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

function runOfflineUpgradeDryRun(version) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'customer-vault-offline-upgrade-'));
  const appDir = path.join(tmp, 'app');
  const packageDir = path.join(tmp, 'package');
  const binDir = path.join(tmp, 'bin');
  fs.mkdirSync(appDir);
  fs.mkdirSync(packageDir);
  fs.mkdirSync(binDir);

  const envFile = path.join(appDir, '.env');
  fs.writeFileSync(envFile, [
    'VERSION=26.8.0',
    `JWT_SECRET=${'j'.repeat(64)}`,
    `ENCRYPTION_KEY=${'a'.repeat(64)}`,
    `BACKUP_ENCRYPTION_KEY=${'b'.repeat(64)}`,
    '',
  ].join('\n'));
  fs.writeFileSync(path.join(appDir, 'docker-compose.yml'), 'services: {}\n');
  fs.writeFileSync(path.join(packageDir, 'docker-compose.yml'), `services:
  backend:
    image: igor0670/customer-storage-backend:\${VERSION:-latest}
  frontend:
    image: igor0670/customer-storage-frontend:\${VERSION:-latest}
`);
  fs.writeFileSync(path.join(packageDir, `customer-vault-images-${version}.tar.gz`), 'fixture');

  const dockerLog = path.join(tmp, 'docker.log');
  const mockDocker = path.join(binDir, 'docker');
  fs.writeFileSync(mockDocker, `#!/bin/sh
set -eu
printf '%s|%s\\n' "\${VERSION:-}" "$*" >> "$MOCK_DOCKER_LOG"
if [ "$1" = "compose" ] && [ "$2" = "version" ]; then
  exit 0
fi
case "$*" in
  *"config --images")
    printf '%s\\n' \\
      "igor0670/customer-storage-backend:\${VERSION:-latest}" \\
      "igor0670/customer-storage-frontend:\${VERSION:-latest}" \\
      "mariadb:10.11" \\
      "nginx:alpine" \\
      "clamav/clamav:1.4.6"
    exit 0
    ;;
esac
echo "unexpected docker command: $*" >&2
exit 99
`);
  fs.chmodSync(mockDocker, 0o755);

  const result = spawnSync('bash', [
    path.join(repoRoot, 'scripts', 'offline-upgrade.sh'),
    '--app-dir', appDir,
    '--package-dir', packageDir,
    '--version', version,
    '--dry-run',
  ], {
    env: {
      ...process.env,
      MOCK_DOCKER_LOG: dockerLog,
      PATH: `${binDir}${path.delimiter}${process.env.PATH}`,
    },
    encoding: 'utf8',
  });

  const dockerCommands = fs.readFileSync(dockerLog, 'utf8');
  const persistedEnv = fs.readFileSync(envFile, 'utf8');
  fs.rmSync(tmp, { recursive: true, force: true });
  return { ...result, dockerCommands, persistedEnv };
}

test('backend service is not published to host in online and offline compose files', () => {
  for (const file of ['docker-compose.yml', 'docker-compose.offline.yml']) {
    const compose = fs.readFileSync(path.join(repoRoot, file), 'utf8');
    const backend = serviceBlock(compose, 'backend');
    const proxy = serviceBlock(compose, 'proxy');

    assert.doesNotMatch(backend, /\n {4}ports:\n/, `${file} backend must not publish host ports`);
    assert.match(backend, /\n {4}expose:\n {6}- "5000"\n/, `${file} backend should document internal port 5000`);
    assert.match(proxy, /\n {4}ports:\n {6}- "\$\{PROXY_PORT:-2082\}:80"\n/, `${file} proxy remains the host entrypoint`);
  }
});

test('nginx proxy reaches backend through the internal compose network', () => {
  const nginx = fs.readFileSync(path.join(repoRoot, 'proxy', 'nginx.conf'), 'utf8');
  assert.match(nginx, /upstream backend_api \{\n\s*server backend:5000;\n\s*\}/);
});

test('compose waits for frontend and proxy HTTP readiness on slow offline hosts', () => {
  for (const file of ['docker-compose.yml', 'docker-compose.offline.yml']) {
    const compose = fs.readFileSync(path.join(repoRoot, file), 'utf8');
    const frontend = serviceBlock(compose, 'frontend');
    const proxy = serviceBlock(compose, 'proxy');

    assert.match(frontend, /healthcheck:[\s\S]*http:\/\/localhost\//, `${file} frontend needs an HTTP healthcheck`);
    assert.match(proxy, /frontend:\n {8}condition: service_healthy/, `${file} proxy must wait for frontend health`);
    assert.match(proxy, /backend:\n {8}condition: service_healthy/, `${file} proxy must wait for backend health`);
    assert.match(proxy, /healthcheck:[\s\S]*http:\/\/localhost\/api\/health/, `${file} proxy needs an API healthcheck`);
  }
});

test('database passwords have no public fallback in compose files', () => {
  for (const file of ['docker-compose.yml', 'docker-compose.offline.yml']) {
    const compose = fs.readFileSync(path.join(repoRoot, file), 'utf8');
    assert.match(compose, /DB_ROOT_PASSWORD:\?DB_ROOT_PASSWORD must be set/);
    assert.match(compose, /DB_PASSWORD:\?DB_PASSWORD must be set/);
    assert.doesNotMatch(compose, /rootpassword|customerpass/);
  }
});

test('both compose files configure the internal ClamAV scanner without publishing its port', () => {
  for (const file of ['docker-compose.yml', 'docker-compose.offline.yml']) {
    const compose = fs.readFileSync(path.join(repoRoot, file), 'utf8');
    const clamav = serviceBlock(compose, 'clamav');
    const backend = serviceBlock(compose, 'backend');

    assert.match(clamav, /image: clamav\/clamav:1\.4\.6/);
    assert.match(clamav, /- "3310"/);
    assert.doesNotMatch(clamav, /\n {4}ports:\n/);
    assert.match(backend, /CLAMAV_ENABLED: \$\{CLAMAV_ENABLED:-true\}/);
    assert.match(backend, /CLAMAV_HOST: \$\{CLAMAV_HOST:-clamav\}/);
  }
});

test('both compose files require a separate backup encryption key', () => {
  for (const file of ['docker-compose.yml', 'docker-compose.offline.yml']) {
    const compose = fs.readFileSync(path.join(repoRoot, file), 'utf8');
    const backend = serviceBlock(compose, 'backend');
    assert.match(backend, /BACKUP_ENCRYPTION_KEY: \$\{BACKUP_ENCRYPTION_KEY:\?BACKUP_ENCRYPTION_KEY must be set/);
    assert.match(compose, /BACKUP_ENCRYPTION_KEY/);
  }
  const example = fs.readFileSync(path.join(repoRoot, '.env.example'), 'utf8');
  assert.match(example, /BACKUP_ENCRYPTION_KEY=/);
});

test('backup downloads are restricted to encrypted files and audited', () => {
  const backupService = fs.readFileSync(
    path.join(repoRoot, 'backend', 'src', 'backup', 'backup.service.ts'),
    'utf8',
  );
  const backupController = fs.readFileSync(
    path.join(repoRoot, 'backend', 'src', 'backup', 'backup.controller.ts'),
    'utf8',
  );
  assert.match(backupService, /resolvedPath\.endsWith\('\.enc'\)/);
  assert.match(backupService, /realPath\.endsWith\('\.enc'\)/);
  assert.match(backupController, /암호화 백업 파일 다운로드/);
});

test('production images require committed Prisma migrations', () => {
  const migrationDir = path.join(repoRoot, 'backend', 'prisma', 'migrations');
  const migrations = fs.readdirSync(migrationDir).filter((entry) =>
    fs.existsSync(path.join(migrationDir, entry, 'migration.sql')),
  );
  assert.ok(migrations.length > 0, 'at least one baseline migration must be committed');
  assert.ok(fs.existsSync(path.join(repoRoot, 'backend', 'prisma', 'migration_lock.toml')));

  const entrypoint = fs.readFileSync(entrypointPath, 'utf8');
  assert.match(entrypoint, /NODE_ENV.*production/);
  assert.match(entrypoint, /refusing to run db push/i);

  const upgradeScript = fs.readFileSync(path.join(repoRoot, 'scripts', 'offline-upgrade.sh'), 'utf8');
  assert.match(upgradeScript, /run_migration_preflight/);
  assert.match(upgradeScript, /migrate resolve --applied/);

  const createMigrationScript = fs.readFileSync(path.join(repoRoot, 'scripts', 'create-migration.sh'), 'utf8');
  assert.match(createMigrationScript, /-v .*backend\/prisma:\/app\/prisma/);
  assert.match(createMigrationScript, /--entrypoint npx/);
});

test('offline upgrade dry run resolves compose image variables with the target version', () => {
  const result = runOfflineUpgradeDryRun('26.9.4');
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /Resolved backend image: igor0670\/customer-storage-backend:26\.9\.4/);
  assert.match(result.stdout, /Resolved frontend image: igor0670\/customer-storage-frontend:26\.9\.4/);
  assert.match(result.stdout, /Dry run passed/);
  assert.match(result.dockerCommands, /26\.9\.4\|compose .*config --images/);
  assert.match(result.persistedEnv, /^VERSION=26\.8\.0$/m, 'dry run must not modify the existing environment');
});

test('offline upgrade recovers the known existing-schema baseline migration failure idempotently', () => {
  const upgradeScript = fs.readFileSync(path.join(repoRoot, 'scripts', 'offline-upgrade.sh'), 'utf8');

  assert.match(upgradeScript, /P3018/);
  assert.match(upgradeScript, /1050|already exists/i);
  assert.match(upgradeScript, /migrate resolve --applied/);
  assert.match(upgradeScript, /P3008/);
  assert.match(upgradeScript, /migrate deploy/);
});

test('offline upgrade retries transient proxy startup failures before rollback', () => {
  const upgradeScript = fs.readFileSync(path.join(repoRoot, 'scripts', 'offline-upgrade.sh'), 'utf8');

  assert.match(upgradeScript, /PROXY_CONTAINER=/);
  assert.match(upgradeScript, /PROXY_HEALTHY=0/);
  assert.match(upgradeScript, /for _ in \$\(seq 1 300\)/);
  assert.match(upgradeScript, /\.State\.Health/);
  assert.match(upgradeScript, /sleep 2/);
  assert.match(upgradeScript, /if \[\[ "\$PROXY_HEALTHY" != 1 \]\]/);
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
  assert.match(`${result.stdout}${result.stderr}`, /Migration failed\. Resolve an existing database baseline explicitly/i);
  assert.doesNotMatch(result.stdout, /Starting application/);
});

test('entrypoint fails closed on P3005 until an explicit baseline is resolved', () => {
  const result = runEntrypointScenario('p3005');
  assert.notEqual(result.status, 0);
  assert.deepEqual(result.commands, [
    'prisma generate',
    'prisma migrate deploy',
  ]);
  assert.match(`${result.stdout}${result.stderr}`, /Resolve an existing database baseline explicitly/i);
  assert.doesNotMatch(result.stdout, /Starting application/);
});

test('entrypoint refuses production startup when migrations are missing', () => {
  const result = runEntrypointScenario('p3005', false);
  assert.notEqual(result.status, 0, 'production must not fall back to db push');
  assert.deepEqual(result.commands, ['prisma generate']);
  const output = `${result.stdout}${result.stderr}`;
  assert.match(output, /No Prisma migrations found.*refusing to run db push/i);
  assert.doesNotMatch(output, /Starting application/);
});
