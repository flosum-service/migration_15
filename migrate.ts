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
  const keys = new Set();

  const { Contents } = await s3.send(
    new ListObjectsV2Command({
      Bucket: "dev-devops-us-east-2-bucket",
      Prefix: "data/",
      Delimiter: "/",
    })
  );

  if (Contents) {
    Contents.forEach((obj) => keys.add(obj.Key));
  }

  console.log(keys.keys());
}

main();
