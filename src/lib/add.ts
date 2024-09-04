"use server";
import { Field } from "o1js";

export async function add(value: number): Promise<string> {
  const field = Field(value);
  const result = field.add(Field(1));
  return result.toJSON();
}
