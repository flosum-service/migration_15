import { S3Client } from "@aws-sdk/client-s3";

import { appendFile, mkdir, readFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { spawn } from "node:child_process";

const config = {
  region: process.env.AWS_REGION,
  bucket: process.env.AWS_BUCKET,
};

const s3 = new S3Client({ region: config.region });

async function main() {
  await mkdir("./.logs", { recursive: true });

  const migrations = await readFile("migration.json", "utf-8").then((data) =>
    JSON.parse(data)
  );

  console.log({ config });
  console.log({ migrations });

  const an = await rl.question("\n\nContinue ? (yes|no): ");

  if (an !== "yes") {
    return;
  }

  for (const { encodedId, from } of migrations) {
    console.log(`Executing: aws ${["s3", "rm", from, "--recursive"]}...`);

    await new Promise((resolve, reject) => {
      const child = spawn("aws", [
        "s3",
        "rm",
        `s3://${config.bucket}/${from}`,
        "--recursive",
      ]);

      child.stdout.on("data", async (data) => {
        process.stdout.write(data);
        await appendFile(
          `./.logs/${encodedId}.clean.stdout.log`,
          JSON.stringify({ data })
        );
      });

      child.stderr.on("data", async (data) => {
        process.stderr.write(data);
        await appendFile(
          `./.logs/${encodedId}.clean.stderr.log`,
          JSON.stringify({ data })
        );
      });

      child.on("close", (code) => {
        if (code === 0) {
          resolve(null);
        }

        reject(null);
      });
    });
  }
}

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

main().then(() => {
  rl.close();
});
