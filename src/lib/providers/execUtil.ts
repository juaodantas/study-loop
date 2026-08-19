import { execFile } from "node:child_process";

export function runExecFile(file: string, args: string[], timeout: number): Promise<{ stdout: string }> {
  return new Promise((resolve, reject) => {
    const child = execFile(file, args, { timeout, maxBuffer: 10 * 1024 * 1024 }, (error, stdout) => {
      if (error) reject(error);
      else resolve({ stdout });
    });
    child.stdin?.end(); // motivo: sem isso o stdin fica aberto e o processo filho trava esperando EOF quando invocado fora de um TTY (fora de execFileSync/spawn interativo)
  });
}
