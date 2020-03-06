import React, { useCallback, useState, useEffect } from 'react';
import cn from 'classnames';
import { Grid, Button, SelectInput, Flex } from 'indigo-react';
import * as ob from 'urbit-ob';
import { azimuth } from 'azimuth-js';

import { usePointCursor } from 'store/pointCursor';
import { usePointCache } from 'store/pointCache';

import useCurrentPointName from 'lib/useCurrentPointName';
import useKeyfileGenerator from 'lib/useKeyfileGenerator';
import * as need from 'lib/need';

import { OutButton, ForwardButton } from 'components/Buttons';
import { CopyButtonWide } from 'components/CopyButton';
import NetworkingKeys from 'components/NetworkingKeys';
import ProgressButton from 'components/ProgressButton';

import BridgeForm from 'form/BridgeForm';
import { useLocalRouter } from 'lib/LocalRouter';
import { useHosting } from 'store/hosting';
import DownloadKeyfileButton from 'components/DownloadKeyfileButton';

export default function UrbitOSHome({ manualNetworkSeed }) {
  const { pointCursor } = usePointCursor();
  const { getDetails } = usePointCache();

  const { push, names } = useLocalRouter();

  const point = need.point(pointCursor);
  const details = need.details(getDetails(point));

  const sponsor = ob.patp(details.sponsor);

  const [showKeys, setShowKeys] = useState(false);

  const showSponsor = azimuth.getPointSize(point) !== azimuth.PointSize.Galaxy;
  const toggleShowKeys = useCallback(() => setShowKeys(!showKeys), [
    setShowKeys,
    showKeys,
  ]);

  const goNetworkingKeys = useCallback(() => push(names.NETWORKING_KEYS), [
    names,
    push,
  ]);

  const goChangeSponsor = useCallback(() => push(names.CHANGE_SPONSOR), [
    push,
    names,
  ]);
  return (
    <>
      <Hosting manualNetworkSeed={manualNetworkSeed} />

      <Grid>
        <Grid.Item full className="mv7 f5">
          Network
        </Grid.Item>
        {showSponsor && (
          <>
            <Grid.Divider />
            <Grid.Item
              full
              as={ForwardButton}
              detail="A sponsor finds new peers in your network"
              accessory={<u>Change</u>}
              onClick={goChangeSponsor}>
              <span className="mono">{sponsor}</span>
              <span className="f7 bg-black white p1 ml2 r4">SPONSOR</span>
            </Grid.Item>
          </>
        )}

        <Grid.Divider />
        <Grid.Item full as={ForwardButton} onClick={goNetworkingKeys}>
          Reset Networking Keys
        </Grid.Item>
        <Grid.Divider />
        <Grid.Item
          full
          as={ForwardButton}
          accessory={showKeys ? '▲' : '▼'}
          onClick={toggleShowKeys}>
          View Networking Keys
        </Grid.Item>
        {showKeys && <Grid.Item full as={NetworkingKeys} point={point} />}
      </Grid>
    </>
  );
}

// eslint-disable-next-line
function Hosting({ manualNetworkSeed }) {
  const bind = useKeyfileGenerator(manualNetworkSeed);
  const { keyfile, code } = bind;
  const ship = useHosting();

  const { syncStatus, url, unknown, bootProgress, bootMessage } = ship;

  const [synced, setSynced] = useState(false);
  useEffect(() => {
    if (unknown && !synced) {
      syncStatus();
      setSynced(true);
    }
  }, [syncStatus, unknown, setSynced, synced]);

  const createShip = useCallback(() => ship.create(keyfile), [keyfile, ship]);

  const name = useCurrentPointName();
  const options = [{ text: 'Tlon', value: 'tlon' }];

  const renderMain = useCallback(() => {
    if (ship.running) {
      return (
        <>
          <Grid.Item cols={[1, 9]} as={OutButton} solid success href={url}>
            Open OS
          </Grid.Item>
          <Grid.Item cols={[9, 13]} as={Button} className="b-black b1" center>
            Disconnect
          </Grid.Item>
        </>
      );
    }
    if (ship.missing) {
      return (
        <Grid.Item
          full
          as={ForwardButton}
          solid
          disabled={!keyfile}
          onClick={createShip}>
          Connect
        </Grid.Item>
      );
    }
    if (ship.pending) {
      return (
        <Grid.Item
          full
          as={ProgressButton}
          success
          disabled
          progress={bootProgress}>
          {bootMessage || 'Connecting'}
        </Grid.Item>
      );
    }
  }, [
    ship.missing,
    ship.running,
    ship.pending,
    bootProgress,
    bootMessage,
    keyfile,
    createShip,
    url,
  ]);

  const renderDetails = useCallback(() => {
    if (ship.running) {
      return (
        <>
          <Grid.Item cols={[1, 9]} className="gray4">
            <span className="mono">{name}</span> is connected to Tlon
          </Grid.Item>
        </>
      );
    }
    if (!keyfile && ship.missing) {
      return (
        <Grid.Item full className="gray4">
          Please reset your networking keys in order to use hosting
        </Grid.Item>
      );
    }
  }, [name, ship, keyfile]);

  return (
    <>
      <Grid gap={4}>
        <Grid.Item full className="f5" as={Flex}>
          <Flex.Item>Urbit OS </Flex.Item>
          <Flex.Item
            className={cn(
              { green3: ship.running, gray4: !ship.running },
              'ml3'
            )}>
            {ship.running ? 'Connected' : 'Disconnected'}
          </Flex.Item>
        </Grid.Item>
        <BridgeForm initialValues={{ provider: 'tlon' }}>
          {() => (
            <>
              {renderDetails()}
              {renderMain()}
              <Grid.Item
                full
                as={SelectInput}
                name="provider"
                label="Host Provider"
                options={options}
                disabled
              />
            </>
          )}
        </BridgeForm>
      </Grid>
      <Grid>
        <Grid.Item
          full
          as={DownloadKeyfileButton}
          {...bind}
          className="mt2"
          detail="A keyfile authenticates your Urbit ID to Urbit OS"
        />
        <Grid.Divider />
        {code && (
          <Grid.Item
            full
            className="mt2"
            as={CopyButtonWide}
            detail={code}
            detailClassName="mono">
            Login Code
          </Grid.Item>
        )}
      </Grid>
    </>
  );
}
