"use client";

import axios from "axios";

export interface ProofOfNFT {
  key: string;
  value: string;
  isPublic: boolean;
}

export interface SimpleImageData {
  filename: string;
  size: number;
  mimeType: string;
  sha3_512: string;
  storage: string;
}
export interface SimpleMintNFT {
  contractAddress: string;
  chain: string;
  name: string;
  description: string;
  collection: string;
  price: number;
  owner: string;
  image: SimpleImageData;
  keys: ProofOfNFT[];
}

export async function sendTransaction(params: {
  serializedTransaction: string;
  signedData: string;
  mintParams: string;
  contractAddress: string;
  name: string;
}): Promise<{ isSent: boolean; hash: string }> {
  const {
    serializedTransaction,
    signedData,
    contractAddress,
    mintParams,
    name,
  } = params;
  console.log("sendTransaction", {
    serializedTransaction,
    signedData,
    contractAddress,
    mintParams,
  });

  let args = JSON.stringify({
    contractAddress,
  });

  const transaction = JSON.stringify(
    {
      serializedTransaction,
      signedData,
      mintParams,
    },
    null,
    2
  );

  let answer = await zkCloudWorkerRequest({
    command: "execute",
    transactions: [transaction],
    task: "mint",
    args,
    metadata: `mint NFT @${name}`,
    mode: "async",
  });

  console.log(`zkCloudWorker answer:`, answer);
  const jobId = answer.jobId;
  console.log(`jobId:`, jobId);
  let result;
  while (result === undefined && answer.jobStatus !== "failed") {
    await sleep(5000);
    answer = await zkCloudWorkerRequest({
      command: "jobResult",
      jobId,
    });
    console.log(`jobResult api call result:`, answer);
    result = answer.result;
    if (result !== undefined) console.log(`jobResult result:`, result);
  }
  if (answer.jobStatus === "failed") {
    return { isSent: false, hash: result };
  } else if (result === undefined) {
    return { isSent: false, hash: "job error" };
  } else return { isSent: true, hash: result };
}

export async function prepareTransaction(params: SimpleMintNFT): Promise<{
  isPrepared: boolean;
  transaction?: string;
  fee?: number;
  memo?: string;
  serializedTransaction?: string;
  mintParams?: string;
}> {
  const { contractAddress } = params;
  console.log("sendSimpleMintCommand", params);

  let args = JSON.stringify({
    contractAddress,
  });

  const transaction = JSON.stringify(params, null, 2);

  let answer = await zkCloudWorkerRequest({
    command: "execute",
    transactions: [transaction],
    task: "prepare",
    args,
    metadata: `mint`,
    mode: "async",
  });

  console.log(`zkCloudWorker answer:`, answer);
  const jobId = answer.jobId;
  console.log(`jobId:`, jobId);
  let result;
  while (result === undefined && answer.jobStatus !== "failed") {
    await sleep(5000);
    answer = await zkCloudWorkerRequest({
      command: "jobResult",
      jobId,
    });
    console.log(`jobResult api call result:`, answer);
    result = answer.result;
    if (result !== undefined) console.log(`jobResult result:`, result);
  }
  if (answer.jobStatus === "failed") {
    return { isPrepared: false };
  } else if (result === undefined) {
    return { isPrepared: false };
  } else return { isPrepared: true, ...JSON.parse(result) };
}

async function zkCloudWorkerRequest(params: any) {
  const { command, task, transactions, args, metadata, mode, jobId } = params;
  const chain = process.env.NEXT_PUBLIC_CHAIN;
  if (chain === undefined) throw new Error("Chain is undefined");
  const apiData = {
    auth: process.env.NEXT_PUBLIC_ZKCW_AUTH,
    command: command,
    jwtToken: process.env.NEXT_PUBLIC_ZKCW_JWT,
    data: {
      task,
      transactions: transactions ?? [],
      args,
      repo: "mint-worker",
      developer: "DFST",
      metadata,
      mode: mode ?? "sync",
      jobId,
    },
    chain,
  };
  const endpoint = process.env.NEXT_PUBLIC_ZKCW_ENDPOINT + chain;

  const response = await axios.post(endpoint, apiData);
  return response.data;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
