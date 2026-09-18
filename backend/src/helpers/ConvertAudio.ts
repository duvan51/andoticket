import ffmpeg from "fluent-ffmpeg";
import path from "path";
import fs from "fs";

try {
  const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
  if (ffmpegPath) {
    ffmpeg.setFfmpegPath(ffmpegPath);
  }
} catch (e) {
  if (fs.existsSync("/usr/bin/ffmpeg")) {
    ffmpeg.setFfmpegPath("/usr/bin/ffmpeg");
  }
}

export const convertToOgg = (inputPath: string): Promise<string> => {
  return new Promise((resolve) => {
    const ext = path.extname(inputPath).toLowerCase();
    const isOgg = ext === ".ogg";
    const outputPath = isOgg
      ? inputPath.replace(/\.ogg$/i, "_converted.ogg")
      : inputPath.replace(/\.[^/.]+$/, "") + ".ogg";

    ffmpeg(inputPath)
      .toFormat("ogg")
      .audioCodec("libopus")
      .audioChannels(1)
      .audioFrequency(48000)
      .outputOptions([
        "-vn",
        "-b:a 32k",
        "-vbr on",
        "-compression_level 10",
        "-frame_duration 60",
        "-application voip",
        "-avoid_negative_ts make_zero"
      ])
      .on("end", () => {
        if (isOgg && fs.existsSync(outputPath)) {
          try {
            fs.unlinkSync(inputPath);
            fs.renameSync(outputPath, inputPath);
            return resolve(inputPath);
          } catch (e) {
            return resolve(outputPath);
          }
        }
        resolve(outputPath);
      })
      .on("error", (err: Error) => {
        console.error("Error converting audio to OGG Opus:", err);
        if (isOgg && fs.existsSync(outputPath)) {
          try {
            fs.unlinkSync(outputPath);
          } catch (e) {}
        }
        // Fallback: If conversion fails, return original input path so flow doesn't break
        resolve(inputPath);
      })
      .save(outputPath);
  });
};

export const convertToMp3 = (inputPath: string): Promise<string> => {
  return new Promise((resolve) => {
    const ext = path.extname(inputPath).toLowerCase();
    if (ext === ".mp3") {
      return resolve(inputPath);
    }

    const outputPath = inputPath.replace(/\.[^/.]+$/, "") + ".mp3";

    ffmpeg(inputPath)
      .toFormat("mp3")
      .audioCodec("libmp3lame")
      .audioBitrate("128k")
      .on("end", () => {
        resolve(outputPath);
      })
      .on("error", (err: Error) => {
        console.error("Error converting audio to MP3:", err);
        // Fallback: If conversion fails, return original input path
        resolve(inputPath);
      })
      .save(outputPath);
  });
};
