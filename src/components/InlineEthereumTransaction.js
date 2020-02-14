import React, { useMemo, useCallback } from 'react';
import cn from 'classnames';
import {
  Grid,
  ToggleInput,
  ErrorText,
  Flex,
  LinkButton,
  H5,
  Text,
} from 'indigo-react';

import { useExploreTxUrls } from 'lib/explorer';
import { hexify } from 'lib/txn';
import pluralize from 'lib/pluralize';

import { composeValidator, buildCheckboxValidator } from 'form/validators';
import BridgeForm from 'form/BridgeForm';
import Condition from 'form/Condition';

import { GenerateButton, ForwardButton, RestartButton } from './Buttons';
import CopyButton from './CopyButton';
import ProgressButton from './ProgressButton';
import convertToInt from 'lib/convertToInt';
import NeedFundsNotice from './NeedFundsNotice';

export default function InlineEthereumTransaction({
  // from useEthereumTransaction.bind
  initializing,
  canSign,
  generateAndSign,
  signed,
  broadcast,
  broadcasted,
  confirmed,
  completed,
  reset,
  error,
  gasPrice,
  setGasPrice,
  resetGasPrice,
  txHashes,
  nonce,
  chainId,
  needFunds,
  signedTransactions,
  confirmationProgress,

  // additional from parent
  label = 'Generate & Sign Transaction',
  className,
  onReturn,
}) {
  // show receipt after successful broadcast
  const showReceipt = broadcasted || confirmed || completed;
  // show configure controls pre-broadcast
  const showConfigureInput = !(signed || broadcasted || confirmed || completed);
  // show the send/loading button while signed, broadcasting, or confirme
  const showBroadcastButton = signed;
  const showLoadingButton = broadcasted || confirmed;
  const canBroadcast = signed && !needFunds;
  // show signed tx only when signing (for offline usage)
  const showSignedTx = signed;

  const validate = useMemo(
    () =>
      composeValidator({
        useAdvanced: buildCheckboxValidator(),
        viewSigned: buildCheckboxValidator(),
      }),
    []
  );

  const onValues = useCallback(
    ({ valid, values, form }) => {
      if (!values.useAdvanced) {
        resetGasPrice();
      }
    },
    [resetGasPrice]
  );

  const renderPrimarySection = () => {
    if (error) {
      return (
        <Grid.Item full as={RestartButton} solid onClick={() => reset()}>
          Reset Transaction
        </Grid.Item>
      );
    } else if (completed) {
      return (
        <Grid.Item full className="pv4 black f5">
          Transaction Complete
        </Grid.Item>
      );
    } else if (showBroadcastButton) {
      return (
        <Grid.Item
          full
          as={ForwardButton}
          solid
          success
          disabled={!canBroadcast}
          onClick={() => broadcast()}>
          Send Transaction
        </Grid.Item>
      );
    } else if (showLoadingButton) {
      return (
        <Grid.Item
          full
          as={ProgressButton}
          success
          disabled
          progress={confirmationProgress}>
          Sending Transaction
        </Grid.Item>
      );
    } else {
      return (
        <Grid.Item
          full
          as={GenerateButton}
          onClick={generateAndSign}
          disabled={!canSign}
          loading={!canSign && initializing}>
          {label}
        </Grid.Item>
      );
    }
  };

  const serializedTxsHex = useMemo(
    () =>
      signedTransactions &&
      signedTransactions.map(stx => hexify(stx.serialize())),
    [signedTransactions]
  );

  return (
    <Grid className={cn(className, 'mt1')}>
      <BridgeForm validate={validate} onValues={onValues}>
        {() => (
          <>
            {renderPrimarySection()}

            {error && (
              <Grid.Item full as={ErrorText} className="mv1">
                {error.message}
              </Grid.Item>
            )}

            {needFunds && (
              <Grid.Item
                full
                as={NeedFundsNotice}
                className="mt3"
                {...needFunds}
              />
            )}

            {showConfigureInput && (
              <>
                <Grid.Item
                  full
                  as={ToggleInput}
                  name="useAdvanced"
                  label="Advanced"
                  inverseLabel="Back to Defaults"
                  inverseColor="red3"
                  disabled={!showConfigureInput || initializing}
                />

                <Condition when="useAdvanced" is={true}>
                  <Grid.Divider />
                  <Grid.Item
                    full
                    as={Flex}
                    row
                    justify="between"
                    className="mt2">
                    <Flex.Item as={H5}>Gas Price</Flex.Item>
                    <Flex.Item as={H5}>{gasPrice} Gwei</Flex.Item>
                  </Grid.Item>
                  {/* TODO(shrugs): move to indigo/RangeInput */}
                  <Grid.Item
                    full
                    as="input"
                    type="range"
                    min="1"
                    max="100"
                    value={gasPrice}
                    onChange={e =>
                      setGasPrice(convertToInt(e.target.value, 10))
                    }
                  />
                  <Grid.Item
                    full
                    as={Flex}
                    row
                    justify="between"
                    className="f6 mt1">
                    <Flex.Item as={Text}>Cheap</Flex.Item>
                    <Flex.Item as={Text}>Fast</Flex.Item>
                  </Grid.Item>
                  <Grid.Divider className="mt4" />
                </Condition>
              </>
            )}

            {showSignedTx && (
              <>
                <Grid.Item
                  full
                  as={ToggleInput}
                  name="viewSigned"
                  label="Signed Transaction"
                  inverseLabel="Hide"
                  disabled={!showSignedTx}
                />
                <Condition when="viewSigned" is={true}>
                  <SignedTransactionList
                    serializedTxsHex={serializedTxsHex}
                    gasPrice={gasPrice}
                    nonce={nonce}
                  />
                </Condition>
              </>
            )}

            {showReceipt && (
              <>
                <Grid.Divider />
                <HashReceiptList txHashes={txHashes} />

                <Grid.Divider />
              </>
            )}

            {completed && (
              <>
                <Grid.Item full as={RestartButton} onClick={onReturn}>
                  Return
                </Grid.Item>
                <Grid.Divider />
              </>
            )}
          </>
        )}
      </BridgeForm>
    </Grid>
  );
}

function SignedTransactionList({ serializedTxsHex, nonce, gasPrice }) {
  return serializedTxsHex.map((serializedTxHex, i) => (
    <React.Fragment key="i">
      <Grid.Divider />
      <Grid.Item full as={Flex} justify="between" className="pv4 black f5">
        <Flex.Item>Nonce</Flex.Item>
        <Flex.Item>{nonce + i}</Flex.Item>
      </Grid.Item>
      <Grid.Divider />
      <Grid.Item full as={Flex} justify="between" className="pv4 black f5">
        <Flex.Item>Gas Price</Flex.Item>
        <Flex.Item>{gasPrice.toFixed()} Gwei</Flex.Item>
      </Grid.Item>
      <Grid.Divider />
      <Grid.Item full as={Flex} justify="between" className="mt3 mb2">
        <Flex.Item as={H5}>Signed Transaction Hex</Flex.Item>
        <Flex.Item as={CopyButton} text={serializedTxHex} />
      </Grid.Item>
      <Grid.Item full as="code" className="mb4 f6 mono gray4 wrap">
        {serializedTxHex}
      </Grid.Item>
      <Grid.Divider />
    </React.Fragment>
  ));
}

function HashReceiptList({ txHashes }) {
  const txUrls = useExploreTxUrls(txHashes);
  const header = pluralize(txHashes.length, 'Hash', 'Hashes');
  return (
    <>
      <Grid.Divider />
      <Grid.Item full as={Flex} col className="pv4">
        <Flex.Item as={H5}>Transaction {header}</Flex.Item>

        {txHashes &&
          txHashes.map((txHash, i) => (
            <Flex.Item as={Flex}>
              <>
                <Flex.Item
                  key={i}
                  flex
                  as="code"
                  className="f6 mono gray4 wrap">
                  {txHash}
                </Flex.Item>
                <Flex.Item as={LinkButton} href={txUrls[i]}>
                  Etherscan↗
                </Flex.Item>
              </>
            </Flex.Item>
          ))}
      </Grid.Item>
      <Grid.Divider />
    </>
  );
}
