#!/usr/bin/env node

import fs from "node:fs";
import { Decoder, Encoder } from "@typeberry/lib/codec";
import { type ChainSpec, fullChainSpec, tinyChainSpec } from "@typeberry/lib/config";
import * as fuzz_proto from "@typeberry/lib/fuzz-proto";
import { tryAsU8, tryAsU32 } from "@typeberry/lib/numbers";
import { CURRENT_VERSION } from "@typeberry/lib/utils";
import { parseArgs } from "./args.js";
import { Capture } from "./capture.js";
import { getBinFiles, processFile } from "./files.js";
import packageJson from "./package.json" with { type: "json" };
import { Socket } from "./socket.js";
import { Stats } from "./stats.js";
import { parseStfVector } from "./stf-trace.js";

const { PeerInfo, MessageType, Version, messageCodec } = fuzz_proto.v1;

const APP_NAME = "picofuzz";
const APP_VERSION = packageJson.version;
const GP_VERSION = CURRENT_VERSION;

main().catch((e) => {
  console.error(e);
  process.exit(-1);
});

async function main() {
  const args = parseArgs();
  const socket = await Socket.connect(args.socket);
  const spec = args.flavour === "tiny" ? tinyChainSpec : fullChainSpec;
  const capture = args.capture ? new Capture(args.capture) : null;

  try {
    const binFiles = await getBinFiles(args.directory, args.ignore);
    console.log(`Found ${binFiles.length} .bin files`);

    const peerName = await sendHandshake(spec, socket, capture);

    const stats = Stats.new(peerName);

    if (args.mode === "jam-traces") {
      await handleJamTracesMode(spec, socket, stats, binFiles, args.repeat, capture);
    } else {
      await handleDefaultMode(spec, socket, stats, binFiles, args.repeat, capture);
    }

    console.log("All files processed successfully");
    console.info(`${stats}`);
    // writing stats to the output file
    if (args.output !== undefined) {
      fs.appendFileSync(args.output, `${stats.aggregateToCsvRow()}\n`);
    }
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  } finally {
    await socket.close();
  }
}

function decodeMessage(spec: ChainSpec, data: Buffer): fuzz_proto.v1.MessageData {
  const arr = new Uint8Array(data);
  return Decoder.decodeObject(messageCodec, arr, spec);
}

async function handleDefaultMode(
  spec: ChainSpec,
  socket: Socket,
  stats: Stats,
  binFiles: string[],
  repeat: number,
  capture: Capture | null,
) {
  for (let i = 0; i < repeat; i++) {
    if (i > 0) {
      await socket.reconnect();
      await sendHandshake(spec, socket, null);
    }
    for (const file of binFiles) {
      const success = await processFile(file, (filePath, fileData) => {
        return handleRequest(spec, socket, stats, filePath, fileData, capture);
      });

      if (!success) {
        console.error(`Stopping due to error with file: ${file}`);
        process.exit(1);
      }
    }
  }
}

async function handleJamTracesMode(
  spec: ChainSpec,
  socket: Socket,
  stats: Stats,
  binFiles: string[],
  repeat: number,
  capture: Capture | null,
) {
  for (let i = 0; i < repeat; i++) {
    if (i > 0) {
      await socket.reconnect();
      await sendHandshake(spec, socket, null);
    }
    for (let fileIndex = 0; fileIndex < binFiles.length; fileIndex++) {
      const file = binFiles[fileIndex];
      const isFirstFile = fileIndex === 0;

      const success = await processFile(file, async (filePath, fileData) => {
        const parsed = parseStfVector(new Uint8Array(fileData), spec);
        if (isFirstFile) {
          const init = await handleJamTracesRequest(spec, socket, stats, filePath, parsed.init, capture);
          const block = await handleJamTracesRequest(spec, socket, stats, filePath, parsed.block, capture);
          return init && block;
        }

        return handleJamTracesRequest(spec, socket, stats, filePath, parsed.block, capture);
      });

      if (!success) {
        console.error(`Stopping due to error with file: ${file}`);
        process.exit(1);
      }
    }
  }
}

async function sendHandshake(spec: ChainSpec, socket: Socket, capture: Capture | null) {
  const msgIn: fuzz_proto.v1.MessageData = {
    type: MessageType.PeerInfo,
    value: PeerInfo.create({
      fuzzVersion: tryAsU8(1),
      features: tryAsU32(0),
      appVersion: Version.tryFromString(APP_VERSION),
      jamVersion: Version.tryFromString(GP_VERSION),
      name: APP_NAME,
    }),
  };
  const encoded = Encoder.encodeObject(messageCodec, msgIn, spec);
  const response = await socket.send(encoded.raw);
  const msgOut = decodeMessage(spec, response);
  if (msgOut.type !== MessageType.PeerInfo) {
    throw new Error(`Invalid handshake response: ${MessageType[msgOut.type]}`);
  }

  capture?.save(msgIn.type, encoded.raw, msgOut.type, response);

  const peer = msgOut.value;
  const peerName = `${peer.name}@${peer.appVersion.major}.${peer.appVersion.minor}.${peer.appVersion.patch}`;
  console.info(`[${peerName}] <-> Handshake successful ${peer}`);

  return peerName;
}

async function handleRequest(
  spec: ChainSpec,
  socket: Socket,
  stats: Stats,
  filePath: string,
  fileData: Buffer,
  capture: Capture | null,
) {
  const msgIn = decodeMessage(spec, fileData);
  const valueTruncated = `${msgIn.value}`.substring(0, 4096);
  console.log(`[node] <-- ${MessageType[msgIn.type]} ${valueTruncated}`);

  let response: Buffer = Buffer.alloc(0);
  const tookNs = await stats.measure(filePath, async () => {
    response = await socket.send(fileData);
  });

  const msgOut = decodeMessage(spec, response);
  console.log(`[node] --> ${MessageType[msgOut.type]} ${msgOut.value}, took: ${tookNs}`);

  capture?.save(msgIn.type, fileData, msgOut.type, response);

  if (msgOut.type === MessageType.Error) {
    console.error(`[${filePath}] Target returned error: ${msgOut.value}`);
    // In capture mode, continue past errors to record them as expected responses
    return capture !== null;
  }

  return true;
}

async function handleJamTracesRequest(
  spec: ChainSpec,
  socket: Socket,
  stats: Stats,
  filePath: string,
  msgIn: fuzz_proto.v1.MessageData,
  capture: Capture | null,
) {
  const encoded = Encoder.encodeObject(messageCodec, msgIn, spec);
  console.log(`[node] <-- ${MessageType[msgIn.type]} ${msgIn.value}`);

  let response: Buffer = Buffer.alloc(0);
  const tookNs = await stats.measure(filePath, async () => {
    response = await socket.send(encoded.raw);
  });

  const msgOut = decodeMessage(spec, response);
  console.log(`[node] --> ${MessageType[msgOut.type]} ${msgOut.value}, took: ${tookNs}`);

  capture?.save(msgIn.type, encoded.raw, msgOut.type, response);

  if (msgOut.type === MessageType.Error) {
    console.error(`[${filePath}] Target returned error: ${msgOut.value}`);
    // In capture mode, continue past errors to record them as expected responses
    return capture !== null;
  }

  return true;
}
