/*
IMPORTANT NOTICE: DO NOT REMOVE
This is a script that generates an image and saves it to the assets folder. 
You should not use this script unless the user EXPLICITLY asks you to generate an asset.
DO NOT PROACTIVELY GENERATE ASSETS FOR THE USER.

You will need to update the prompt and the options (2nd parameter of the generateImage function) depending on your use case.
options: {
  size?: "1024x1024" | "1536x1024" | "1024x1536" | "auto";
  quality?: "low" | "medium" | "high" | "auto";
  format?: "png" | "jpeg" | "webp";
  background?: undefined | "transparent";
}

If you need to generate many assets, REFACTOR THIS SCRIPT TO CONCURRENTLY GENERATE UP TO 3 ASSETS AT A TIME. If you do not, the bash tool may time out.
use npx tsx generate-asset-script.ts to run this script.
*/

import { generateImage } from "./src/api/image-generation";
import * as fs from "fs";
import * as path from "path";
import { Readable } from "stream";
import { finished } from "stream/promises";

async function downloadImage(url: string, outputPath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
  }

  const fileStream = fs.createWriteStream(outputPath);
  // @ts-ignore - Node.js types are not fully compatible with the fetch API
  await finished(Readable.fromWeb(response.body).pipe(fileStream));
  console.log(`Image downloaded successfully to ${outputPath}`);
}

async function logImageGeneration(prompt: string, imageUrl: string): Promise<void> {
  const logDir = path.join(__dirname, "logs");
  const logFile = path.join(logDir, "imageGenerationsLog");

  // Create logs directory if it doesn't exist
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const logEntry = `[${new Date().toISOString()}] Prompt: "${prompt}"\nImage URL: ${imageUrl}\n\n`;
  fs.appendFileSync(logFile, logEntry);
}

async function generateMultipleAssets() {
  const assets = [
    {
      prompt:
        "Modern minimalist app icon for 'Locker Room Talk' dating app. Clean circular design with bold 'LRT' letters in white on a vibrant red background (#FFFFFF text on red). Professional, trustworthy, and contemporary look. Simple geometric design suitable for iOS/Android app icon.",
      filename: "app-icon.png",
      size: "1024x1024" as const,
    },
    {
      prompt:
        "Horizontal logo for 'Locker Room Talk' dating insights app. Modern typography with 'LRT' prominently featured, clean white text on transparent background. Professional and trustworthy design for dark app interfaces. Minimalist style with subtle dating/conversation theme elements.",
      filename: "logo-horizontal.png",
      size: "1536x1024" as const,
    },
    {
      prompt:
        "Circular logo badge for 'Locker Room Talk' app. Bold 'LRT' letters in white on vibrant red circular background. Clean, modern design with subtle shadow effects. Perfect for profile pictures and branding elements in dark UI themes.",
      filename: "logo-circular.png",
      size: "1024x1024" as const,
    },
  ];

  const promises = assets.map(async (asset) => {
    try {
      console.log(`Generating ${asset.filename} with prompt:`, asset.prompt);
      const imageUrl = await generateImage(asset.prompt, {
        size: asset.size,
        quality: "high",
        format: "png",
        background: asset.filename.includes("horizontal") ? "transparent" : undefined,
      });

      console.log(`${asset.filename} generated successfully. URL:`, imageUrl);

      // Log the image generation
      await logImageGeneration(asset.prompt, imageUrl);

      const outputPath = path.join(__dirname, "assets", asset.filename);
      await downloadImage(imageUrl, outputPath);

      console.log(`${asset.filename} saved to:`, outputPath);
      return { filename: asset.filename, url: imageUrl, path: outputPath };
    } catch (error) {
      console.error(`Error generating ${asset.filename}:`, error);
      return null;
    }
  });

  return Promise.all(promises);
}

async function main() {
  try {
    console.log("Starting asset generation for Locker Room Talk app...");
    const results = await generateMultipleAssets();

    const successful = results.filter((result) => result !== null);
    const failed = results.filter((result) => result === null);

    console.log(`\n=== Asset Generation Complete ===`);
    console.log(`Successfully generated: ${successful.length} assets`);
    console.log(`Failed: ${failed.length} assets`);

    successful.forEach((result) => {
      console.log(`✅ ${result!.filename}: ${result!.path}`);
    });
  } catch (error) {
    console.error("Error in main process:", error);
  }
}

main();
