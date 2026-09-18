import { BackupFileCryptoService } from './backup-file-crypto.service';

async function main() {
  const [, , operation, inputPath, outputPath] = process.argv;
  if (!operation || !inputPath || !['encrypt', 'decrypt'].includes(operation)) {
    throw new Error('사용법: node backup-crypto-cli.js <encrypt|decrypt> <input> [output]');
  }

  const service = new BackupFileCryptoService();
  const result = operation === 'encrypt'
    ? await service.encryptFile(inputPath, outputPath, true)
    : await service.decryptFile(inputPath, outputPath, false);

  process.stdout.write(`${result}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
