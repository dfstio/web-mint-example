"use client";
import axios from "axios";

export async function pinFile(params: {
  file: File;
  keyvalues: { [key: string]: string };
}): Promise<string | undefined> {
  const { file, keyvalues } = params;
  try {
    const formData = new FormData();
    const metadata = {
      name: file.name,
      keyvalues: {
        ...keyvalues,
        mimeType: file.type,
        size: file.size.toString(),
        filename: file.name ?? "",
      },
    };
    formData.append("file", file);
    formData.append("pinataMetadata", JSON.stringify(metadata));
    formData.append("pinataOptions", JSON.stringify({ cidVersion: 1 }));
    const endpoint = process.env.NEXT_PUBLIC_IPFS_URL;
    if (endpoint === undefined) throw new Error("IPFS URL is undefined");
    const key = process.env.NEXT_PUBLIC_PINATA_JWT;
    if (key === undefined) throw new Error("IPFS Key is undefined");
    const headers = {
      "Content-Type": `multipart/form-data`,
      Authorization: "Bearer " + key,
    };
    console.log("pinFile", { endpoint, key, metadata, headers, formData });

    const response = await axios.post(endpoint, formData, {
      maxBodyLength: Infinity,
      headers,
    });
    if (response && response.data && response.data.IpfsHash) {
      console.log("pinFile response", response.data);
      return response.data.IpfsHash;
    } else {
      console.error("pinFile error 1", response.data.error);
      return undefined;
    }
  } catch (err) {
    console.error("pinFile error 2 - catch", err);
    return undefined;
  }
}
