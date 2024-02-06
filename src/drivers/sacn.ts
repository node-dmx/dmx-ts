import {EventEmitter} from 'events';
import {IUniverseDriver, UniverseData} from '../models/IUniverseDriver';
import * as sacn from 'sacn';

export type SACNOptions = {
  sourceName?: string;
  priority?: number;
  cid?: Buffer;
  reuseAddr?: boolean;
  interface?: string;
  minRefreshRate?: number;
  port?: number;
  ip?: string;
};

export class SACNDriver extends EventEmitter implements IUniverseDriver {
  sACNServer: sacn.Sender;
  universe: any = {};

  constructor(universe = 1, private options: SACNOptions = { reuseAddr: true }) {
    super();
    this.sACNServer = new sacn.Sender({
      universe: universe || 1,
      reuseAddr: options.reuseAddr,
      iface: options.interface,
      minRefreshRate: options.minRefreshRate,
      port: options.port,
      useUnicastDestination: options.ip,
    });
  }

  async init(): Promise<void> {
  }

  close(): void {
    this.sACNServer.close();
  }

  update(u: UniverseData, extraData: any): void {
    for (const c in u) {
      this.universe[c] = SACNDriver.dmxToPercent(u[c]);
    }
    this.sendUniverse();
  }

  sendUniverse(): void {
    this.sACNServer.send({
      payload: this.universe,
      sourceName: this.options.sourceName,
      priority: this.options.priority,
      cid: this.options.cid,
    });
  }

  updateAll(v: number): void {
    for (let i = 1; i <= 512; i++) {
      this.universe[i] = SACNDriver.dmxToPercent(v);
    }
    this.sendUniverse();
  }

  get(c: number): number {
    return SACNDriver.percentToDmx(this.universe[c]);
  }

  static dmxToPercent(v: number): number {
    return v / 255 * 100;
  }

  static percentToDmx(v: number): number {
    return v / 100 * 255;
  }
}
