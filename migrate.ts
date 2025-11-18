import {
  CopyObjectCommand,
  ListBucketsCommand,
  ListDirectoryBucketsCommand,
  ListObjectsCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";

import basex from "base-x";
import { writeFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";

const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const base58 = basex(ALPHABET);

const s3 = new S3Client({ region: "us-east-2" });

function encoded(id: number): string {
  const padded = id.toString().padStart(11, "0");
  return base58.encode(Buffer.from(padded));
}

async function main() {
  const toMigrate = new Set<string>();

  const main = await s3.send(
    new ListObjectsV2Command({
      Bucket: "dev-devops-us-east-2-bucket",
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
      Bucket: "dev-devops-us-east-2-bucket",
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
    const to = from.split("/");

    const id = parseInt(to[to.length - 2]);

    if (!id) {
      continue;
    }

    to[to.length - 2] = encoded(id);

    migrations.push({
      from,
      to: to.join("/"),
    });
  }

  await writeFile("migration.json", JSON.stringify(migrations));

  console.log(migrations);

  const an = await rl.question("\n\nContinue ? (yes|no): ");

  if (an !== "yes") {
    return;
  }

  //   await s3.send(CopyObjectCommand());

  console.log(toMigrate.keys());
}

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

main().then(() => {
  rl.close();
});
