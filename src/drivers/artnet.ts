import { EventEmitter } from 'events';
import { IUniverseDriver, UniverseData } from '../models/IUniverseDriver';

const dgram = require('dgram');

export interface ArtnetArgs {
  dmx_speed?: number,
  universe?: number,
  port?: number,
}

export class ArtnetDriver extends EventEmitter implements IUniverseDriver {
  readyToWrite: boolean;
  header: Buffer;
  sequence: Buffer;
  physical: Buffer;
  universeId: Buffer;
  length: Buffer;
  universe: Buffer;
  interval: number;
  host: string;
  port: any;
  dev: any;
  timeout?: NodeJS.Timeout;
  constructor(deviceId = '127.0.0.1', options: ArtnetArgs = {}) {
    super();
    this.readyToWrite = true;
    this.header = Buffer.from([65, 114, 116, 45, 78, 101, 116, 0, 0, 80, 0, 14]);
    this.sequence = Buffer.from([0]);
    this.physical = Buffer.from([0]);
    this.universeId = Buffer.from([0x00, 0x00]);
    this.length = Buffer.from([0x02, 0x00]);

    this.universe = Buffer.alloc(513);
    this.universe.fill(0);

    /**
     * Allow artnet rate to be set and default to 44Hz
     * @type Number
     */
    this.interval = options.dmx_speed !== undefined && !isNaN(options.dmx_speed) ? 1000 / options.dmx_speed : 24;

    this.universeId.writeInt16LE(options.universe || 0, 0);
    this.host = deviceId;
    this.port = options.port || 6454;
    this.dev = dgram.createSocket('udp4');
    this.dev.bind(() => this.dev.setBroadcast(true));
    this.start();
  }

  sendUniverse(): void {
    const pkg = Buffer.concat([
      this.header,
      this.sequence,
      this.physical,
      this.universeId,
      this.length,
      this.universe.slice(1),
    ]);

    if (this.readyToWrite) {
      this.readyToWrite = false;
      this.dev.send(pkg, 0, pkg.length, this.port, this.host, () => {
        this.readyToWrite = true;
      });
    }
  }

  start(): void {
    this.timeout = setInterval(this.sendUniverse.bind(this), this.interval);
  }

  stop(): void {
    if (this.timeout) clearInterval(this.timeout);
  }

  close(): Promise<void> {
    return new Promise<void>((resolve) => {
      this.stop();
      resolve();
    });
  }

  update(u: UniverseData, extraData?: any): void {
    for (const c in u) {
      this.universe[c] = u[c];
    }

    this.emit('update', u, extraData);
  }

  updateAll(v: number): void {
    for (let i = 1; i <= 512; i++) {
      this.universe[i] = v;
    }
  }

  get(c: number): number {
    return this.universe[c];
  }
}