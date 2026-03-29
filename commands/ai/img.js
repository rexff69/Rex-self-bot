import fetch from "node-fetch";
import { MessageAttachment } from "discord.js-selfbot-v13";

export default {
  name: "img",
  description: "Generate an AI image based on prompt using Nvidia Stable Diffusion 3 Medium",

  async execute(message, args, client) {
    if (!args.length) {
      return message.reply({
        content: "Please provide a prompt! Example: `!img a futuristic city at sunset`"
      });
    }

    const prompt = args.join(" ");
    const apiKey = process.env.NVIDIA_NIM_API_KEY;

    if (!apiKey) {
      return message.reply({
        content: "AI_API key is missing in the .env file."
      });
    }

    let waitMsg;
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      waitMsg = await message.channel.send("ok ok");
    } catch (e) {
      console.error("Failed to send wait message:", e);
    }

    try {
      const invokeUrl =
        "https://ai.api.nvidia.com/v1/genai/stabilityai/stable-diffusion-3-medium";

      const payload = {
        prompt: prompt,
        cfg_scale: 5,
        aspect_ratio: "16:9",
        seed: 0,
        steps: 40,
        negative_prompt: "blurry, low quality, distorted, bad anatomy"
      };

      const response = await fetch(invokeUrl, {
        method: "POST",
        body: JSON.stringify(payload),
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
          "Content-Type": "application/json"
        }
      });

      if (response.status !== 200) {
        const errBody = await response.text();
        throw new Error(`API returned status ${response.status}: ${errBody}`);
      }

      const responseBody = await response.json();

      if (!responseBody.image) {
        throw new Error("No image returned from the API.");
      }

      // Convert base64 → buffer
      const buffer = Buffer.from(responseBody.image, "base64");

      const attachment = new MessageAttachment(buffer, "generated.png");

      await message.channel.send({
        files: [attachment]
      });

      if (waitMsg) {
        try {
          await waitMsg.delete();
        } catch {}
      }
    } catch (error) {
      console.error("AI Image Generation Error:", error);

      if (waitMsg) {
        try {
          await waitMsg.edit({
            content: `Failed to generate image: ${error.message}`
          });
        } catch {
          await message.channel.send({
            content: `Failed to generate image.`
          });
        }
      }
    }
  }
};
