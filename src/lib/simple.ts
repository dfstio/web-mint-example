"use client";

import { calculateSHA512 } from "./sha512";
import { pinFile } from "./ipfs";
import {
  SimpleImageData,
  SimpleMintNFT,
  ProofOfNFT,
  prepareTransaction,
  sendTransaction,
} from "./send";

export async function getAccount(): Promise<string | undefined> {
  const accounts = await (window as any)?.mina?.requestAccounts();
  console.log("Accounts", accounts);
  let address: string | undefined = undefined;
  if (accounts?.code === undefined && accounts?.length > 0) {
    address = accounts[0];
    console.log("Address", address);
  }
  return address;
}

export async function simpleMintNFT(params: {
  name: string;
  image: File;
  collection: string;
  description: string;
  price: number;
  keys: ProofOfNFT[];
  developer: string;
  repo: string;
}) {
  const { name, image, price, collection, description, keys, developer, repo } =
    params;

  const owner = await getAccount();
  if (owner === undefined) {
    console.error("Owner address is undefined");
    return;
  }

  if (name === undefined || name === "") {
    console.error("NFT name is undefined");
    return;
  }

  if (image === undefined) {
    console.error("Image is undefined");
    return;
  }

  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  if (contractAddress === undefined) {
    console.error("Contract address is undefined");
    return;
  }

  const chain = "devnet";

  const ipfsPromise = pinFile({
    file: image,
    keyvalues: {
      name,
      owner,
      contractAddress,
      chain,
      developer,
      repo,
    },
  });

  const sha3_512 = await calculateSHA512(image);
  console.log("image sha3_512", sha3_512);

  const ipfs = await ipfsPromise;
  console.log("image ipfs", ipfs);

  const imageData: SimpleImageData = {
    filename: image.name.substring(0, 30),
    size: image.size,
    mimeType: image.type.substring(0, 30),
    sha3_512,
    storage: `i:${ipfs}`,
  } as SimpleImageData;

  const nftData: SimpleMintNFT = {
    contractAddress,
    chain,
    name,
    description,
    collection,
    price,
    owner,
    image: imageData,
    keys,
  } as SimpleMintNFT;

  const {
    isPrepared,
    transaction,
    fee,
    memo,
    serializedTransaction,
    mintParams,
  } = await prepareTransaction(nftData);
  if (
    !isPrepared ||
    transaction === undefined ||
    fee === undefined ||
    memo === undefined ||
    serializedTransaction === undefined ||
    mintParams === undefined
  ) {
    console.error("Failed to prepare transaction");
    return;
  }

  const payload = {
    transaction,
    onlySign: true,
    feePayer: {
      fee: fee,
      memo: memo,
    },
  };
  console.timeEnd("prepared tx");
  console.timeEnd("ready to sign");
  const txResult = await (window as any).mina?.sendTransaction(payload);
  console.log("Transaction result", txResult);
  console.time("sent transaction");
  const signedData = txResult?.signedData;
  if (signedData === undefined) {
    console.log("No signed data");
    return undefined;
  }

  const sentTx = await sendTransaction({
    serializedTransaction,
    signedData,
    mintParams,
    contractAddress,
    name,
  });
  console.timeEnd("sent transaction");
  console.log("Sent transaction", sentTx);
}
