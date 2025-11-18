import {
  ListBucketsCommand,
  ListObjectsCommand,
  S3Client,
} from "@aws-sdk/client-s3";

import basex from "base-x";

const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const base58 = basex(ALPHABET);

const s3 = new S3Client({ region: "us-east-2" });

async function main() {
  const { Contents } = await s3.send(
    new ListObjectsCommand({ Bucket: "dev-devops-us-east-2-bucket" })
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

main();
