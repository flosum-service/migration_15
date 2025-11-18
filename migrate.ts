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

function encoded(id: number): string {
  const padded = id.toString().padStart(11, "0");
  return base58.encode(Buffer.from(padded));
}

async function main() {
  const { Contents } = await s3.send(
    new ListObjectsV2Command({
      Bucket: "dev-devops-us-east-2-bucket",
    })
  );

  if (!Contents) {
    throw new Error("No Content");
  }

  for (const { Key } of Contents) {
    if (!Key) {
      continue;
    }

    const path = Key.split("/");

    if (path[0] === "data") {
      console.log(`tenantId: ${path[1]}`);
    }
  }

  //   console.log(b);
}
