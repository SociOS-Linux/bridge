import { useState, useEffect, useCallback } from 'react';
import { Just, Nothing } from 'folktale/maybe';
import Result from 'folktale/result';
import * as azimuth from 'azimuth-js';

import { useWallet } from 'store/wallet';
import useRoller from 'lib/useRoller';
import { onlyUnique } from 'lib/utils/array';
import { useNetwork } from '../network';
import { ONE_MINUTE } from 'lib/constants';
import useLocalStorageState from 'lib/useLocalStorageState';

export default function useControlledPointsStore() {
  const { contracts, web3 } = useNetwork();
  const { wallet } = useWallet();
  const { getPoints, getPointsDetails } = useRoller();

  const [controlledPoints, _setControlledPoints] = useState(Nothing());
  const [migratingPoints, setMigratingPoints] = useLocalStorageState(
    'migratingPoints',
    []
  );

  const syncControlledPoints = useCallback(async () => {
    const _contracts = contracts.getOrElse(null);
    const _wallet = wallet.getOrElse(null);
    if (!web3 || Nothing.hasInstance(web3) || !_contracts || !_wallet) {
      return;
    }

    _setControlledPoints(Nothing());

    const address = _wallet.address;

    try {
      const [
        ownedPointsL1,
        incomingPointsL1,
        managingPointsL1,
        votingPointsL1,
        spawningPointsL1,
        ownedPointsL2,
        incomingPointsL2,
        managingPointsL2,
        votingPointsL2,
        spawningPointsL2,
      ] = await Promise.all([
        azimuth.azimuth.getOwnedPoints(_contracts, address),
        azimuth.azimuth.getTransferringFor(_contracts, address),
        azimuth.azimuth.getManagerFor(_contracts, address),
        azimuth.azimuth.getVotingFor(_contracts, address),
        azimuth.azimuth.getSpawningFor(_contracts, address),
        getPoints('own', address),
        getPoints('transfer', address),
        getPoints('manage', address),
        getPoints('vote', address),
        getPoints('spawn', address),
      ]);

      if (
        ownedPointsL1 === null &&
        incomingPointsL1 === null &&
        managingPointsL1 === null &&
        votingPointsL1 === null &&
        spawningPointsL1 === null &&
        ownedPointsL2 === null &&
        incomingPointsL2 === null &&
        managingPointsL2 === null &&
        votingPointsL2 === null &&
        spawningPointsL2 === null &&
        migratingPoints === null
      ) {
        _setControlledPoints(
          Just(Result.Error('Failed to read the blockchain.'))
        );
      } else {
        await getPointsDetails(
          (ownedPointsL1 || [])
            .concat(ownedPointsL2 || [], migratingPoints || [])
            .filter(onlyUnique),
          (incomingPointsL1 || [])
            .concat(incomingPointsL2 || [])
            .filter(onlyUnique),
          (managingPointsL1 || [])
            .concat(managingPointsL2 || [])
            .filter(onlyUnique),
          (votingPointsL1 || [])
            .concat(votingPointsL2 || [])
            .filter(onlyUnique),
          (spawningPointsL1 || [])
            .concat(spawningPointsL2 || [])
            .filter(onlyUnique)
        );

        const keepMigrating = [];

        migratingPoints.forEach(point => {
          if (!ownedPointsL2.includes(point)) {
            keepMigrating.push(point);
          }
        });

        if (migratingPoints.length !== keepMigrating.length) {
          setMigratingPoints(keepMigrating);
        }

        _setControlledPoints(
          Just(
            Result.Ok({
              ownedPoints: ownedPointsL2
                .concat(ownedPointsL1, migratingPoints)
                .map(Number)
                .filter(onlyUnique),
              incomingPoints: incomingPointsL2
                .concat(incomingPointsL1)
                .map(Number)
                .filter(onlyUnique),
              managingPoints: managingPointsL2
                .concat(managingPointsL1)
                .map(Number)
                .filter(onlyUnique),
              votingPoints: votingPointsL2
                .concat(votingPointsL1)
                .map(Number)
                .filter(onlyUnique),
              spawningPoints: spawningPointsL2
                .concat(spawningPointsL1)
                .map(Number)
                .filter(onlyUnique),
            })
          )
        );
      }
    } catch (error) {
      console.error('failed to fetch controlled points', error);
      _setControlledPoints(Just(Result.Error(JSON.stringify(error))));
    }
  }, [web3, contracts, wallet, migratingPoints, getPoints, getPointsDetails]);

  // sync controlled points whenever wallet or contracts changes
  useEffect(() => {
    syncControlledPoints();
  }, [syncControlledPoints]);

  // Poll the roller every minute for changes to the points
  useEffect(() => {
    setInterval(() => {
      syncControlledPoints();
    }, ONE_MINUTE);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    migratingPoints,
    setMigratingPoints,
    controlledPoints,
    syncControlledPoints,
  };
}
