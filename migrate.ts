import AWS from "aws-sdk";

const s3 = new AWS.S3();

async function main() {
  const b = s3.listObjects();
}

main();
