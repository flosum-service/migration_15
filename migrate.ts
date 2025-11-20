import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";

import basex from "base-x";
import { appendFile, writeFile, mkdir } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { spawn } from "node:child_process";
import chunk from "chunk";

const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const base58 = basex(ALPHABET);

const config = {
  region: process.env.AWS_REGION,
  bucket: process.env.AWS_BUCKET,
};

console.log({ config });

const s3 = new S3Client({ region: config.region });

function encoded(id: number): string {
  const padded = id.toString().padStart(11, "0");
  return base58.encode(Buffer.from(padded));
}

async function main() {
  await mkdir("./.logs", { recursive: true });

  const toMigrate = new Set<string>();

  const main = await s3.send(
    new ListObjectsV2Command({
      Bucket: config.bucket,
      Prefix: "data/",
      Delimiter: "/",
    })
  );

  if (main.CommonPrefixes) {
    main.CommonPrefixes.forEach((cp) => {
      if (cp.Prefix) {
        toMigrate.add(cp.Prefix);
      }
    });
  }

  const fit = await s3.send(
    new ListObjectsV2Command({
      Bucket: config.bucket,
      Prefix: "data/fit/",
      Delimiter: "/",
    })
  );

  if (fit.CommonPrefixes) {
    fit.CommonPrefixes.forEach((cp) => {
      if (cp.Prefix) {
        toMigrate.add(cp.Prefix);
      }
    });
  }

  const migrations = [];

  for (const from of toMigrate.keys()) {
    const to = from.slice(0, -1).split("/");

    const id = parseInt(to[to.length - 1]);

    if (!id) {
      continue;
    }

    to.slice();
    const encodedId = encoded(id);
    to[to.length - 1] = encodedId;

    migrations.push({
      encodedId,
      from: `${from.slice(0, -1)}`,
      to: `${to.join("/")}`,
      cmd: `aws ${["s3", "sync", from, `${to.join("/")}`, "--delete"].join(
        " "
      )}`,
    });
  }

  await writeFile("migration.json", JSON.stringify(migrations));

  console.log({ config });
  console.log({ migrations });

  const an = await rl.question("\n\nContinue ? (yes|no): ");

  if (an !== "yes") {
    return;
  }

  const promises = [];

  for (const ch of chunk(migrations, migrations.length / 5)) {
    let promise = Promise.resolve();

    for (const { encodedId, from, to } of ch) {
      console.log(
        `Executing: aws ${["s3", "sync", from, to, "--delete"].join(" ")}...`
      );

      promise = promise.then(async () => {
        await new Promise((resolve, reject) => {
          const child = spawn("aws", [
            "s3",
            "sync",
            `s3://${config.bucket}/${from}`,
            `s3://${config.bucket}/${to}`,
            "--delete",
          ]);

          child.stdout.on("data", async (data) => {
            process.stdout.write(data);
            await appendFile(
              `./.logs/${encodedId}.migrate.stdout.log`,
              JSON.stringify({ data })
            );
          });

          child.stderr.on("data", async (data) => {
            process.stderr.write(data);
            await appendFile(
              `./.logs/${encodedId}.migrate.stderr.log`,
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
      });
    }

    promises.push(promise);
  }

  await Promise.all(promises);
}

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

main().then(() => {
  rl.close();
});
