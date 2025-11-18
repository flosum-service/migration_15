import {
  ListBucketsCommand,
  ListDirectoryBucketsCommand,
  ListObjectsCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";

import basex from "base-x";

const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const base58 = basex(ALPHABET);

const s3 = new S3Client({ region: "us-east-2" });

function encoded(id: string): string {
  const padded = String(id).padStart(11, "0");
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
    main.CommonPrefixes.forEach((cp) => toMigrate.add(cp.Prefix));
  }

  const fit = await s3.send(
    new ListObjectsV2Command({
      Bucket: "dev-devops-us-east-2-bucket",
      Prefix: "data/fit/",
      Delimiter: "/",
    })
  );

  if (fit.CommonPrefixes) {
    fit.CommonPrefixes.forEach((cp) => toMigrate.add(cp.Prefix));
  }

  const migrations = [];

  for (const from of toMigrate.keys()) {
    const to = from.split("/");
    to[-1] = encoded(to[-1]);
    migrations.push({
      from,
      to: to.join("/"),
    });
  }

  console.log(migrations);

  console.log(toMigrate.keys());
}

main();
