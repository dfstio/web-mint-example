"use client";
import React, { useState } from "react";
import { add } from "@/lib/add";

export default function Add() {
  const [description, setDescription] = useState<string>("");
  const [value, setValue] = useState<number>(0);

  const addButton = async () => {
    console.log("Add:", { value });
    const result = await add(value);
    setDescription(result);
  };

  return (
    <div className="bg-[#0D1117] p-8 text-white flex justify-center items-start">
      <div className="flex flex-col space-y-4">
        <div className="w-[calc(100%*9/10)]">
          <label htmlFor="value" className="block text-sm font-medium">
            Set value
          </label>
          <div className="flex items-center bg-[#161B22] border border-gray-200 border-[#30363D] rounded-md p-2 w-full dark:border-gray-800">
            <input
              id="value"
              type="text"
              placeholder="Enter a value"
              className="bg-transparent text-white w-full"
              onChange={(e) => setValue(parseInt(e.target.value))}
            />
          </div>
        </div>
        <div className="w-[calc(100%*9/10)]">
          <label htmlFor="description" className="block text-sm font-medium">
            {description}
          </label>
        </div>

        <button
          className="bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg text-sm px-5 py-2.5 text-center w-[calc(100%*9/10)] disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={addButton}
        >
          Add
        </button>
      </div>
    </div>
  );
}
