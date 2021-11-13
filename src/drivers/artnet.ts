import {EventEmitter} from 'events';
import {IUniverseDriver, UniverseData} from '../models/IUniverseDriver';
import dmxlib from 'dmxnet';

export interface ArtnetArgs {
  unchangedDataInterval?: number,
  universe?: number,
  port?: number,
  net?: number,
  subnet?: number,
  subuni?: number,
  dmxlibOptions?: dmxlib.DmxnetOptions,
}

export class ArtnetDriver extends EventEmitter implements IUniverseDriver {
  options: ArtnetArgs;
  host: string;
  dmxnet: dmxlib.dmxnet;
  universe?: dmxlib.sender;

  constructor(host = '127.0.0.1', options: ArtnetArgs = {}) {
    super();

    this.options = options;
    this.host = host;
    // eslint-disable-next-line new-cap
    this.dmxnet = new dmxlib.dmxnet(options.dmxlibOptions);
  }

  async init(): Promise<void> {
    this.universe = this.dmxnet.newSender({
      ip: this.host,
      // eslint-disable-next-line camelcase
      base_refresh_interval: this.options.unchangedDataInterval,
      net: this.options.net,
      port: this.options.port,
      subnet: this.options.subnet,
      subuni: this.options.subuni,
      universe: this.options.universe,
    });
  }

  sendUniverse(): void {
    this.universe?.stop();
  }

  close(): Promise<void> {
    return new Promise<void>((resolve) => {
      this.stop();
      resolve();
    });
  }

  update(u: UniverseData, extraData?: any): void {
    for (const c in u) {
      this.universe?.prepChannel(Number(c), u[c]);
    }
    this.sendUniverse();

    this.emit('update', u, extraData);
  }

  updateAll(v: number): void {
    this.universe?.fillChannels(v, 0, 511);
    this.sendUniverse();
  }

  get(c: number): number {
    return this.universe?.values?.[c]!;
  }

  private stop(): void {
    this.universe?.stop();
  }
}
