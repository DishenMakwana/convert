import { removeBackground } from "@imgly/background-removal-node";
import type { NextRequest } from "next/server";
import path from "node:path";

export const runtime = "nodejs";

const modelPath = `file://${path.resolve(process.cwd(), "node_modules/@imgly/background-removal-node/dist")}/`;

export async function POST(request: NextRequest): Promise<Response> {
  const formData = await request.formData();
  const image = formData.get("image");

  if (!(image instanceof File)) {
    return new Response("Missing image file", { status: 400 });
  }

  const output = await removeBackground(image, {
    publicPath: modelPath,
    model: "medium",
    output: {
      format: "image/png",
      quality: 0.95
    }
  });

  return new Response(await output.arrayBuffer(), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store"
    }
  });
}
