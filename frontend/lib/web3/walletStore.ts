export type WatchedToken = {
  chainId: number;
  address: `0x${string}`; // ERC20 contract
  symbol: string;
  decimals: number;
};

const LS_KEY = "kj_web3_wallet_watch_tokens_v1";

export function loadWatchedTokens(): WatchedToken[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    const arr = raw ? (JSON.parse(raw) as WatchedToken[]) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function saveWatchedTokens(tokens: WatchedToken[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_KEY, JSON.stringify(tokens.slice(0, 50)));
}
