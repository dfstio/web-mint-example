"use client";

import { calculateSHA512 } from "./sha512";
import { pinFile } from "./ipfs";
import type { blockchain, MintParams } from "minanft";
import { serializeTransaction } from "./transaction";
import { sendTransaction } from "./send";

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
export interface ProofOfNFT {
  key: string;
  value: string;
  isPublic: boolean;
}

export async function mintNFT(params: {
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

  const {
    Field,
    PrivateKey,
    PublicKey,
    UInt64,
    Mina,
    AccountUpdate,
    Signature,
  } = await import("o1js");
  const {
    MinaNFT,
    NFTContractV2,
    NameContractV2,
    RollupNFT,
    MinaNFTNameServiceV2,
    FileData,
    initBlockchain,
    MINANFT_NAME_SERVICE_V2,
    VERIFICATION_KEY_HASH_V2,
    VERIFICATION_KEY_V2,
    wallet,
    fetchMinaAccount,
    api,
    serializeFields,
    MintParams,
  } = await import("minanft");
  const contractAddress = MINANFT_NAME_SERVICE_V2;
  console.log("contractAddress", contractAddress);
  const chain: blockchain = "devnet";
  const nftPrivateKey = PrivateKey.random();
  const address = nftPrivateKey.toPublicKey();
  const net = await initBlockchain(chain);
  const sender = PublicKey.fromBase58(owner);

  const nft = new RollupNFT({
    name,
    address,
    external_url: net.network.explorerAccountUrl + address.toBase58(),
  });
  const pinataJWT = process.env.NEXT_PUBLIC_PINATA_JWT!;
  const arweaveKey = undefined;
  const jwt = process.env.NEXT_PUBLIC_MINANFT_JWT!;
  if (jwt === undefined) {
    console.error("JWT is undefined");
    return;
  }
  const minanft = new api(jwt);
  const reserved = await minanft.reserveName({
    name,
    publicKey: owner,
    chain: "devnet",
    contract: contractAddress,
    version: "v2",
    developer: "DFST",
    repo: "web-mint-example",
  });
  console.log("Reserved", reserved);
  if (
    reserved === undefined ||
    reserved.isReserved !== true ||
    reserved.signature === undefined ||
    reserved.signature === "" ||
    reserved.price === undefined ||
    (reserved.price as any)?.price === undefined
  ) {
    console.error("Name is not reserved");
    return {
      success: false,
      error: "Name is not reserved",
      reason: reserved.reason,
    };
  }
  const signature = Signature.fromBase58(reserved.signature);
  if (signature === undefined) {
    console.error("Signature is undefined");
    return;
  }

  if (pinataJWT === undefined) {
    console.error("pinataJWT is undefined");
    return;
  }

  if (collection !== undefined && collection !== "")
    nft.update({ key: `collection`, value: collection });

  if (description !== undefined && description !== "")
    nft.updateText({
      key: `description`,
      text: description,
    });

  for (const item of keys) {
    const { key, value, isPublic } = item;
    nft.update({ key, value, isPrivate: isPublic === false });
  }

  nft.update({ key: "rarity", value: "70%" });

  const ipfs = await pinFile({
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

  console.log("image ipfs", ipfs);
  const sha3_512 = await calculateSHA512(image);
  console.log("image sha3_512", sha3_512);

  const imageData = new FileData({
    fileRoot: Field(0),
    height: 0,
    filename: image.name.substring(0, 30),
    size: image.size,
    mimeType: image.type.substring(0, 30),
    sha3_512,
    storage: `i:${ipfs}`,
  });

  console.log("imageData", imageData);
  nft.updateFileData({ key: `image`, type: "image", data: imageData });

  await nft.prepareCommitData({ pinataJWT });

  if (nft.storage === undefined) throw new Error("Storage is undefined");
  if (nft.metadataRoot === undefined) throw new Error("Metadata is undefined");
  const json = JSON.stringify(
    nft.toJSON({
      includePrivateData: true,
    }),
    null,
    2
  );
  console.log("json", json);
  /*
  console.time("compiled");
  const verificationKey = (await NFTContractV2.compile()).verificationKey;
  if (verificationKey.hash.toBigInt() !== VERIFICATION_KEY_V2.hash.toBigInt()) {
    console.error(
      "Verification key mismatch",
      verificationKey,
      VERIFICATION_KEY_V2
    );
    return;
  }
  const nameVK = (await NameContractV2.compile()).verificationKey;
  console.log("Name verification key", nameVK.hash.toJSON());
  if (nameVK.hash.toJSON() !== VERIFICATION_KEY_HASH_V2) {
    console.error("Name verification key mismatch", nameVK.hash.toJSON());
    return;
  }
  console.timeEnd("compiled");
  */

  const zkAppAddress = PublicKey.fromBase58(MINANFT_NAME_SERVICE_V2);
  const zkApp = new NameContractV2(zkAppAddress);
  const mintParams: MintParams = {
    name: MinaNFT.stringToField(nft.name!),
    address,
    price: UInt64.from(BigInt(price * 1e9)),
    fee: UInt64.from(BigInt((reserved.price as any)?.price * 1_000_000_000)),
    feeMaster: wallet,
    verificationKey: VERIFICATION_KEY_V2,
    signature,
    metadataParams: {
      metadata: nft.metadataRoot,
      storage: nft.storage!,
    },
  };

  const fee = Number((await MinaNFT.fee()).toBigInt());
  const memo = "mint";
  await fetchMinaAccount({ publicKey: sender });
  await fetchMinaAccount({ publicKey: zkAppAddress });
  const tx = await Mina.transaction({ sender, fee, memo }, async () => {
    AccountUpdate.fundNewAccount(sender!);
    await zkApp.mint(mintParams);
  });

  tx.sign([nftPrivateKey]);
  const serializedTransaction = serializeTransaction(tx);
  const transaction = tx.toJSON();
  console.log("Transaction", transaction);
  const payload = {
    transaction,
    onlySign: true,
    feePayer: {
      fee: fee,
      memo: memo,
    },
  };
  //console.log("Payload", payload);
  const txResult = await (window as any).mina?.sendTransaction(payload);
  console.log("Transaction result", txResult);
  const signedData = txResult?.signedData;
  if (signedData === undefined) {
    console.log("No signed data");
    return undefined;
  }

  const sentTx = await sendTransaction({
    serializedTransaction,
    signedData,
    mintParams: serializeFields(MintParams.toFields(mintParams)),
    contractAddress,
  });
  console.log("Sent transaction", sentTx);
  /*
  const signedJson = JSON.parse(signedData);
  console.log("Signed JSON", signedJson);
  console.log("Signed JSON 1", {
    a1: signedJson.zkappCommand.feePayer.authorization,
    a2: signedJson.zkappCommand.accountUpdates[0].authorization.signature,
    a3: signedJson.zkappCommand.accountUpdates[2].authorization.signature,
    a4: signedJson.zkappCommand.accountUpdates[3].authorization.signature,
  });
  tx.transaction.feePayer.authorization =
    signedJson.zkappCommand.feePayer.authorization;
  tx.transaction.accountUpdates[0].authorization.signature =
    signedJson.zkappCommand.accountUpdates[0].authorization.signature;
  tx.transaction.accountUpdates[2].authorization.signature =
    signedJson.zkappCommand.accountUpdates[2].authorization.signature;
  tx.transaction.accountUpdates[3].authorization.signature =
    signedJson.zkappCommand.accountUpdates[3].authorization.signature;

  console.time("proved");
  await tx.prove();
  console.timeEnd("proved");
  const txSent = await tx.send();
  console.log("Transaction sent", { hash: txSent.hash, txSent });
  */
}
