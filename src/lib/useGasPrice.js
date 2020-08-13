import { useCallback, useEffect, useState } from 'react';

import { useNetwork } from 'store/network';

import getSuggestedGasPrice from 'bridge-libs/getSuggestedGasPrice';
import { DEFAULT_GAS_PRICE_GWEI, MAX_GAS_PRICE_GWEI } from './constants';

/**
 * handles all of the state of components that manage gas prices
 * + simple get/set
 * + lazy fetching optimal gas from oracle
 * + resetting to oracle (or sync) default
 * @param {Number} initialGasPrice the initial gas price available instantly
 */
export default function useGasPrice(initialGasPrice = DEFAULT_GAS_PRICE_GWEI) {
  const { networkType } = useNetwork();
  const [suggestedGasPrice, setSuggestedGasPrice] = useState(initialGasPrice); // gwei
  const [gasPrice, setGasPrice] = useState(initialGasPrice); // gwei

  useEffect(() => {
    let mounted = true;

    (async () => {
      //TODO  get libs to accept network types properly, or similar
      const suggestedGasPrice = await getSuggestedGasPrice(
        networkType.description,
        DEFAULT_GAS_PRICE_GWEI,
        MAX_GAS_PRICE_GWEI
      );

      if (!mounted) {
        return;
      }

      // TODO: BN
      setSuggestedGasPrice(suggestedGasPrice);
      setGasPrice(suggestedGasPrice);
    })();

    return () => (mounted = true);
  }, [networkType]);

  const resetGasPrice = useCallback(() => setGasPrice(suggestedGasPrice), [
    suggestedGasPrice,
  ]);

  return {
    suggestedGasPrice,
    gasPrice,
    setGasPrice,
    resetGasPrice,
  };
}
