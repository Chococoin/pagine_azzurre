'use client';

import { useReadContract } from 'wagmi';
import { CONTRACT_ADDRESSES, VALAZCO_ABI, CHAIN_ID } from '@/lib/web3/config';

export function useValazcoBalance(address: `0x${string}` | undefined) {
  const contractAddress = CONTRACT_ADDRESSES[CHAIN_ID];

  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi: VALAZCO_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!contractAddress,
      // Fail silently if the RPC is unreachable (e.g. when Anvil isn't
      // running locally). The consumer just sees balance === 0 instead
      // of the UI crashing or spamming retries in the console.
      retry: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  });

  // Balance stored with 2 decimals
  const balance = data ? Number(data) / 100 : 0;

  return {
    balance,
    isLoading,
    error,
    refetch,
  };
}
