"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Divider,
  Group,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconCopy, IconPlugConnectedX, IconWallet } from "@tabler/icons-react";

import {
  useAccount,
  useBalance,
  useChainId,
  useConnect,
  useDisconnect,
  useReadContract,
  useSendTransaction,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { parseUnits } from "viem";
import { mainnet, sepolia } from "wagmi/chains";

import {
  loadWatchedTokens,
  saveWatchedTokens,
  type WatchedToken,
} from "@/lib/web3/walletStore";

const ERC20_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

function shortAddr(a?: string) {
  if (!a) return "--";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function isHexAddress(s: string) {
  const a = s.trim();
  return a.startsWith("0x") && a.length === 42;
}

function explorerBase(chainId: number) {
  if (chainId === sepolia.id) return "https://sepolia.etherscan.io";
  if (chainId === mainnet.id) return "https://etherscan.io";
  // fallback
  return "https://etherscan.io";
}

export default function Web3WalletPanel() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending: connecting } = useConnect();
  const { disconnect } = useDisconnect();

  const chainId = useChainId();
  const { switchChain, isPending: switching } = useSwitchChain();

  // Native balance
  const { data: nativeBal } = useBalance({ address });

  // Watched tokens (persist)
  const [watched, setWatched] = useState<WatchedToken[]>([]);
  useEffect(() => setWatched(loadWatchedTokens()), []);
  useEffect(() => saveWatchedTokens(watched), [watched]);

  // Add token UI
  const [tokenAddr, setTokenAddr] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [tokenDecimals, setTokenDecimals] = useState("18");

  const addToken = () => {
    const a = tokenAddr.trim();
    if (!isHexAddress(a)) {
      notifications.show({
        title: "Token",
        message: "ERC20 address không hợp lệ.",
        color: "red",
      });
      return;
    }
    const d = Number(tokenDecimals);
    if (!Number.isFinite(d) || d < 0 || d > 36) {
      notifications.show({
        title: "Token",
        message: "Decimals không hợp lệ.",
        color: "red",
      });
      return;
    }
    const sym = (tokenSymbol || "TOKEN").trim().slice(0, 12);

    const t: WatchedToken = {
      chainId,
      address: a as `0x${string}`,
      symbol: sym,
      decimals: d,
    };

    setWatched((prev) => {
      const next = [
        t,
        ...prev.filter(
          (x) =>
            !(
              x.chainId === t.chainId &&
              x.address.toLowerCase() === t.address.toLowerCase()
            )
        ),
      ];
      return next.slice(0, 50);
    });

    setTokenAddr("");
    setTokenSymbol("");
    setTokenDecimals("18");
  };

  const removeToken = (t: WatchedToken) => {
    setWatched((prev) =>
      prev.filter((x) => !(x.chainId === t.chainId && x.address === t.address))
    );
  };

  const chainLabel =
    chainId === mainnet.id
      ? "Ethereum"
      : chainId === sepolia.id
      ? "Sepolia"
      : `Chain ${chainId}`;

  /* ===================== Deposit (Nạp) ===================== */
  const copyDeposit = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      notifications.show({ title: "Deposit", message: "Đã copy địa chỉ nhận." });
    } catch {
      notifications.show({
        title: "Deposit",
        message: "Không copy được (browser blocked).",
        color: "red",
      });
    }
  };

  /* ===================== Withdraw Native (Rút Native) ===================== */
  const [to, setTo] = useState("");
  const [amt, setAmt] = useState("");

  const { sendTransactionAsync, isPending: sendingNative } =
    useSendTransaction();

  const [nativeHash, setNativeHash] = useState<`0x${string}` | null>(null);
  const nativeReceipt = useWaitForTransactionReceipt({
    hash: nativeHash ?? undefined,
    query: { enabled: !!nativeHash },
  });

  const sendNative = async () => {
    if (!isConnected || !address) return;

    const toAddr = to.trim();
    if (!isHexAddress(toAddr)) {
      notifications.show({
        title: "Send",
        message: "Địa chỉ nhận không hợp lệ.",
        color: "red",
      });
      return;
    }
    const value = Number(amt);
    if (!Number.isFinite(value) || value <= 0) {
      notifications.show({
        title: "Send",
        message: "Số tiền không hợp lệ.",
        color: "red",
      });
      return;
    }

    try {
      const hash = await sendTransactionAsync({
        to: toAddr as `0x${string}`,
        value: parseUnits(String(value), 18), // ETH/SEP 18
      });

      setNativeHash(hash);
      notifications.show({
        title: "Tx sent",
        message: `Native tx: ${shortAddr(hash)}`,
      });

      setTo("");
      setAmt("");
    } catch (e: any) {
      notifications.show({
        title: "Tx failed",
        message: e?.message ?? "Unknown error",
        color: "red",
      });
    }
  };

  /* ===================== Withdraw ERC20 (Rút ERC20) ===================== */
  const tokensOnChain = useMemo(
    () => watched.filter((t) => t.chainId === chainId),
    [watched, chainId]
  );

  const [erc20TokenKey, setErc20TokenKey] = useState<string | null>(null);
  const selectedToken = useMemo(() => {
    if (!erc20TokenKey) return null;
    return tokensOnChain.find(
      (t) => `${t.chainId}:${t.address}` === erc20TokenKey
    );
  }, [erc20TokenKey, tokensOnChain]);

  useEffect(() => {
    // auto pick first token if available
    if (!erc20TokenKey && tokensOnChain.length) {
      setErc20TokenKey(`${tokensOnChain[0].chainId}:${tokensOnChain[0].address}`);
    }
    if (erc20TokenKey && !tokensOnChain.length) setErc20TokenKey(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokensOnChain.length]);

  const [erc20To, setErc20To] = useState("");
  const [erc20Amt, setErc20Amt] = useState("");

  const { writeContractAsync, isPending: sendingErc20 } = useWriteContract();
  const [erc20Hash, setErc20Hash] = useState<`0x${string}` | null>(null);

  const erc20Receipt = useWaitForTransactionReceipt({
    hash: erc20Hash ?? undefined,
    query: { enabled: !!erc20Hash },
  });

  const sendErc20 = async () => {
    if (!isConnected || !address) return;

    if (!selectedToken) {
      notifications.show({
        title: "ERC20",
        message: "Chọn token trước.",
        color: "red",
      });
      return;
    }

    const toAddr = erc20To.trim();
    if (!isHexAddress(toAddr)) {
      notifications.show({
        title: "ERC20",
        message: "Địa chỉ nhận không hợp lệ.",
        color: "red",
      });
      return;
    }

    const value = Number(erc20Amt);
    if (!Number.isFinite(value) || value <= 0) {
      notifications.show({
        title: "ERC20",
        message: "Số lượng không hợp lệ.",
        color: "red",
      });
      return;
    }

    try {
      const amount = parseUnits(String(value), selectedToken.decimals);

      const hash = await writeContractAsync({
        abi: ERC20_ABI,
        address: selectedToken.address,
        functionName: "transfer",
        args: [toAddr as `0x${string}`, amount],
      });

      setErc20Hash(hash);
      notifications.show({
        title: "Tx sent",
        message: `${selectedToken.symbol} tx: ${shortAddr(hash)}`,
      });

      setErc20To("");
      setErc20Amt("");
    } catch (e: any) {
      notifications.show({
        title: "Tx failed",
        message: e?.message ?? "Unknown error",
        color: "red",
      });
    }
  };

  const nativeTxUrl = nativeHash ? `${explorerBase(chainId)}/tx/${nativeHash}` : null;
  const erc20TxUrl = erc20Hash ? `${explorerBase(chainId)}/tx/${erc20Hash}` : null;

  const nativeStatus =
    nativeReceipt.isLoading ? "PENDING" :
    nativeReceipt.isSuccess ? "CONFIRMED" :
    nativeReceipt.isError ? "FAILED" : null;

  const erc20Status =
    erc20Receipt.isLoading ? "PENDING" :
    erc20Receipt.isSuccess ? "CONFIRMED" :
    erc20Receipt.isError ? "FAILED" : null;

  return (
    <Paper withBorder radius="lg" p="md" style={{ minWidth: 0 }}>
      <Group justify="space-between" mb="xs">
        <Group gap="xs">
          <IconWallet size={16} />
          <Text fw={800}>Web3 Wallet</Text>
        </Group>

        <Group gap="xs">
          <Badge variant="light">{chainLabel}</Badge>

          {!isConnected ? (
            <Button
              size="xs"
              onClick={() => connect({ connector: connectors[0] })}
              loading={connecting}
            >
              Connect (MetaMask)
            </Button>
          ) : (
            <Button
              size="xs"
              variant="light"
              leftSection={<IconPlugConnectedX size={14} />}
              onClick={() => disconnect()}
            >
              Disconnect
            </Button>
          )}
        </Group>
      </Group>

      <Stack gap="sm">
        {/* Deposit section */}
        <Group justify="space-between" align="flex-start">
          <div>
            <Text size="sm" c="dimmed">Deposit address (Nạp)</Text>
            <Text size="sm" fw={800}>
              {isConnected ? shortAddr(address) : "--"}
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              Nạp = bạn gửi token vào địa chỉ ví của bạn (MetaMask).
            </Text>
          </div>

          <Button
            size="xs"
            variant="light"
            leftSection={<IconCopy size={14} />}
            disabled={!isConnected || !address}
            onClick={copyDeposit}
          >
            Copy
          </Button>
        </Group>

        <Group justify="space-between">
          <Text size="sm" c="dimmed">Native balance</Text>
          <Text size="sm" fw={800}>
            {isConnected && nativeBal
              ? `${Number(nativeBal.formatted).toFixed(4)} ${nativeBal.symbol}`
              : "--"}
          </Text>
        </Group>

        <Group gap="xs">
          <Button
            size="xs"
            variant="light"
            disabled={!isConnected}
            loading={switching}
            onClick={() => switchChain({ chainId: sepolia.id })}
          >
            Switch Sepolia
          </Button>
          <Button
            size="xs"
            variant="light"
            disabled={!isConnected}
            loading={switching}
            onClick={() => switchChain({ chainId: mainnet.id })}
          >
            Switch Mainnet
          </Button>
        </Group>

        <Divider />

        {/* Watch tokens */}
        <Text fw={800} size="sm">
          Watch tokens (ERC20)
        </Text>

        <Group gap="xs" wrap="wrap">
          <TextInput
            value={tokenAddr}
            onChange={(e) => setTokenAddr(e.currentTarget.value)}
            placeholder="0xTokenAddress"
            style={{ flex: 1, minWidth: 220 }}
            disabled={!isConnected}
          />
          <TextInput
            value={tokenSymbol}
            onChange={(e) => setTokenSymbol(e.currentTarget.value)}
            placeholder="SYM"
            style={{ width: 90 }}
            disabled={!isConnected}
          />
          <TextInput
            value={tokenDecimals}
            onChange={(e) => setTokenDecimals(e.currentTarget.value)}
            placeholder="dec"
            style={{ width: 80 }}
            disabled={!isConnected}
          />
          <Button size="xs" onClick={addToken} disabled={!isConnected}>
            Add
          </Button>
        </Group>

        <Stack gap={8}>
          {tokensOnChain.map((t) => (
            <TokenRow
              key={`${t.chainId}-${t.address}`}
              token={t}
              owner={address}
              onRemove={() => removeToken(t)}
            />
          ))}
          {!tokensOnChain.length ? (
            <Text size="xs" c="dimmed">
              Chưa có token nào. Thêm 1 ERC20 để theo dõi.
            </Text>
          ) : null}
        </Stack>

        <Divider />

        {/* Withdraw ERC20 */}
        <Text fw={800} size="sm">
          Send ERC20 (withdraw)
        </Text>

        <Group gap="xs" wrap="wrap">
          <Select
            value={erc20TokenKey}
            onChange={setErc20TokenKey}
            data={tokensOnChain.map((t) => ({
              value: `${t.chainId}:${t.address}`,
              label: `${t.symbol} • ${shortAddr(t.address)}`,
            }))}
            placeholder="Select token"
            style={{ minWidth: 260, flex: 1 }}
            disabled={!isConnected || !tokensOnChain.length}
          />

          <TextInput
            value={erc20To}
            onChange={(e) => setErc20To(e.currentTarget.value)}
            placeholder="to: 0x..."
            style={{ flex: 1, minWidth: 220 }}
            disabled={!isConnected}
          />
          <TextInput
            value={erc20Amt}
            onChange={(e) => setErc20Amt(e.currentTarget.value)}
            placeholder={selectedToken ? `amount (${selectedToken.symbol})` : "amount"}
            style={{ width: 160 }}
            disabled={!isConnected || !selectedToken}
          />
          <Button
            size="xs"
            onClick={sendErc20}
            disabled={!isConnected || !selectedToken}
            loading={sendingErc20}
          >
            Send
          </Button>
        </Group>

        {erc20Hash ? (
          <Group justify="space-between">
            <Group gap="xs">
              <Badge variant="light">ERC20 tx</Badge>
              <Text size="xs" c="dimmed">{shortAddr(erc20Hash)}</Text>
              {erc20Status ? (
                <Badge
                  variant="light"
                  color={erc20Status === "CONFIRMED" ? "green" : erc20Status === "FAILED" ? "red" : "yellow"}
                >
                  {erc20Status}
                </Badge>
              ) : null}
            </Group>

            {erc20TxUrl ? (
              <Button
                size="xs"
                variant="light"
                component="a"
                href={erc20TxUrl}
                target="_blank"
                rel="noreferrer"
              >
                View on Explorer
              </Button>
            ) : null}
          </Group>
        ) : null}

        <Divider />

        {/* Withdraw Native */}
        <Text fw={800} size="sm">
          Send native (withdraw)
        </Text>

        <Group gap="xs" wrap="wrap">
          <TextInput
            value={to}
            onChange={(e) => setTo(e.currentTarget.value)}
            placeholder="to: 0x..."
            style={{ flex: 1, minWidth: 220 }}
            disabled={!isConnected}
          />
          <TextInput
            value={amt}
            onChange={(e) => setAmt(e.currentTarget.value)}
            placeholder="amount (ETH)"
            style={{ width: 160 }}
            disabled={!isConnected}
          />
          <Button
            size="xs"
            onClick={sendNative}
            disabled={!isConnected}
            loading={sendingNative}
          >
            Send
          </Button>
        </Group>

        {nativeHash ? (
          <Group justify="space-between">
            <Group gap="xs">
              <Badge variant="light">Native tx</Badge>
              <Text size="xs" c="dimmed">{shortAddr(nativeHash)}</Text>
              {nativeStatus ? (
                <Badge
                  variant="light"
                  color={nativeStatus === "CONFIRMED" ? "green" : nativeStatus === "FAILED" ? "red" : "yellow"}
                >
                  {nativeStatus}
                </Badge>
              ) : null}
            </Group>

            {nativeTxUrl ? (
              <Button
                size="xs"
                variant="light"
                component="a"
                href={nativeTxUrl}
                target="_blank"
                rel="noreferrer"
              >
                View on Explorer
              </Button>
            ) : null}
          </Group>
        ) : null}

        <Text size="xs" c="dimmed">
          App không lưu private key/seed. MetaMask ký giao dịch. Đây là demo an toàn.
        </Text>
      </Stack>
    </Paper>
  );
}

function TokenRow({
  token,
  owner,
  onRemove,
}: {
  token: WatchedToken;
  owner?: `0x${string}`;
  onRemove: () => void;
}) {
  const { data } = useReadContract({
    abi: ERC20_ABI,
    address: token.address,
    functionName: "balanceOf",
    args: owner ? [owner] : undefined,
    query: { enabled: !!owner },
  });

  const bal = useMemo(() => {
    if (!data) return "--";
    const raw = BigInt(data as any);

    // ✅ no 10n literal to avoid TS target issues
    const denom = BigInt(10) ** BigInt(token.decimals);

    const i = raw / denom;
    const f = raw % denom;
    const frac = token.decimals
      ? String(f).padStart(token.decimals, "0").slice(0, 4)
      : "0";
    return `${i.toString()}.${frac}`;
  }, [data, token.decimals]);

  return (
    <Group
      justify="space-between"
      style={{
        padding: "8px 10px",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <Group gap="xs">
        <Badge variant="light">{token.symbol}</Badge>
        <Text size="xs" c="dimmed">
          {token.address.slice(0, 6)}…{token.address.slice(-4)}
        </Text>
      </Group>
      <Group gap="xs">
        <Text size="sm" fw={800}>
          {bal}
        </Text>
        <Button size="xs" variant="light" onClick={onRemove}>
          Remove
        </Button>
      </Group>
    </Group>
  );
}
