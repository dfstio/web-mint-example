"use client";

import { calculateSHA512 } from "./sha512";
import { pinFile } from "./ipfs";
import {
  SimpleImageData,
  SimpleMintNFT,
  ProofOfNFT,
  sendSimpleMintCommand,
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

  const result = await sendSimpleMintCommand(nftData);
}
