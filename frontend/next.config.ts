import type { NextConfig } from "next";

import { networkInterfaces } from "os";

const getLocalIPs = (): string[] => {
  const ips: string[] = ["localhost", "127.0.0.1"];
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === "IPv4") {
        ips.push(net.address);
        ips.push(`${net.address}:3000`);
      }
    }
  }
  return ips;
};

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: getLocalIPs(),
};

export default nextConfig;
