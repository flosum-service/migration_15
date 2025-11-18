import { ListBucketsCommand, S3Client } from "@aws-sdk/client-s3";

import basex from "base-x";

const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const base58 = basex(ALPHABET);

const s3 = new S3Client();

async function main() {
  const b = await s3.send(new ListBucketsCommand());
}

main();
