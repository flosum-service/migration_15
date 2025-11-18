import {
  CopyObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";

import basex from "base-x";
import { writeFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";

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
    to[to.length - 1] = encoded(id);

    console.log(to);

    migrations.push({
      from: `s3://${config.bucket}/${from.slice(0, -1)}`,
      to: `s3://${config.bucket}/${to.join("/")}`,
    });
  }

  await writeFile("migration.json", JSON.stringify(migrations));

  console.log({ config });
  console.log({ migrations });

  const an = await rl.question("\n\nContinue ? (yes|no): ");

  if (an !== "yes") {
    return;
  }

  for (const { from, to } of migrations) {
    await s3.send(
      new CopyObjectCommand({
        Bucket: config.bucket,
        CopySource: from,
        Key: to,
      })
    );
  }
}

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

main().then(() => {
  rl.close();
});
