export type ElectricClient = {
  disconnect: () => Promise<void>;
  isConnected: () => boolean;
};
