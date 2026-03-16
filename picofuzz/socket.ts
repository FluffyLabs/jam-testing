import * as net from "node:net";

const LEN_PREFIX_BYTES = 4;

function decodeLength(buffer: Buffer): number {
  return buffer.readUInt32LE(0);
}

function encodeLength(length: number): Buffer {
  const buffer = Buffer.allocUnsafe(LEN_PREFIX_BYTES);
  buffer.writeUInt32LE(length, 0);
  return buffer;
}

export class Socket {
  static async connect(socketPath: string) {
    const client = net.createConnection(socketPath);

    await new Promise<void>((resolve, reject) => {
      client.once("connect", () => {
        resolve();
      });
      client.once("error", () => {
        reject();
      });
    });

    return new Socket(socketPath, client);
  }

  private constructor(
    private readonly socketPath: string,
    private socket: net.Socket,
  ) {}

  async reconnect() {
    this.socket.end();
    const client = net.createConnection(this.socketPath);
    await new Promise<void>((resolve, reject) => {
      client.once("connect", () => {
        resolve();
      });
      client.once("error", () => {
        reject();
      });
    });
    this.socket = client;
  }

  async send(data: Buffer | Uint8Array): Promise<Buffer> {
    // prepare to read response.
    let responseBuffer = Buffer.alloc(0);
    let expectedLength: number | null = null;

    const response = new Promise<Buffer>((resolve, reject) => {
      const socket = this.socket;

      socket.on("data", readResponse);
      socket.once("error", reject);
      socket.once("close", closeHandler);

      function readResponse(chunk: Buffer) {
        responseBuffer = Buffer.concat([responseBuffer, chunk]);

        if (expectedLength === null && responseBuffer.length >= LEN_PREFIX_BYTES) {
          expectedLength = decodeLength(responseBuffer.subarray(0, LEN_PREFIX_BYTES));
        }

        if (expectedLength === null || responseBuffer.length < expectedLength + LEN_PREFIX_BYTES) {
          // wait for more data
          return;
        }

        // we now have everything, we can resolve the promise.
        const responseData = responseBuffer.subarray(LEN_PREFIX_BYTES, expectedLength + LEN_PREFIX_BYTES);
        socket.off("data", readResponse);
        socket.off("error", reject);
        socket.off("close", closeHandler);
        resolve(responseData);
      }

      function closeHandler() {
        if (expectedLength === null || responseBuffer.length < expectedLength + 4) {
          reject(new Error("Connection closed before receiving complete response"));
        }
      }
    });

    // and send the request now
    const lengthPrefix = encodeLength(data.length);
    const message = Buffer.concat([lengthPrefix, data]);
    this.socket.write(message);

    return await response;
  }

  async close() {
    const socket = this.socket;

    await new Promise<void>((resolve) => {
      let timeout: ReturnType<typeof setTimeout> | null = null;
      // resolve promise when socket is fully closed.
      socket.once("close", () => {
        if (timeout !== null) {
          clearTimeout(timeout);
        }
        resolve();
      });

      // send FIN to the socket
      socket.end();

      // when the other end does not terminate as well
      // we forcefully destroy
      timeout = setTimeout(() => {
        socket.destroy();
        resolve();
      }, 5000);
    });
  }
}
