var Azimuth = artifacts.require('azimuth-solidity/contracts/Azimuth.sol');
var Polls = artifacts.require('azimuth-solidity/contracts/Polls.sol');
var Claims = artifacts.require('azimuth-solidity/contracts/Claims.sol');
var Censures = artifacts.require('azimuth-solidity/contracts/Censures.sol');
var Ecliptic = artifacts.require('azimuth-solidity/contracts/Ecliptic.sol');
var DelegatedSending = artifacts.require(
  'azimuth-solidity/contracts/DelegatedSending.sol'
);
var LinearStarRelease = artifacts.require(
  'azimuth-solidity/contracts/LinearStarRelease.sol'
);
var CSR = artifacts.require(
  'azimuth-solidity/contracts/ConditionalStarRelease.sol'
);

const user1 = '0xD53208cf45fC9bd7938B200BFf8814A26146688f';
const rateUnit = 50;

const conditions = [
  '0x00000000000000000000000000000000000000000000000000000000000000a0',
  '0x00000000000000000000000000000000000000000000000000000000000001e0',
  '0x0000000000000000000000000000000000000000000000000000000000000260',
  '0x00000000000000000000000000000000000000000000000000000000621f23c4',
  '0x0000000000000000000000000000000000000000000000000000000000000003',
  '0x0000000000000000000000000000000000000000000000000000000000000060',
  '0x00000000000000000000000000000000000000000000000000000000000000a0',
];
const minute = 60;
const getLivelines = start => [
  start - 5 * minute,
  start + 10 * minute,
  start + 15 * minute,
  start + 20 * minute,
  start + 25 * minute,
  start + 30 * minute,
  start + 35 * minute,
];

const getDeadlines = start => [
  start + 10 * minute,
  start + 15 * minute,
  start + 20 * minute,
  start + 25 * minute,
  start + 30 * minute,
  start + 35 * minute,
  start + 40 * minute,
];

async function getChainTime() {
  const block = await web3.eth.getBlock('latest');

  return web3.utils.toDecimal(block.timestamp);
}

module.exports = async function(deployer) {
  await deployer;

  // setup contracts
  const azimuth = await deployer.deploy(Azimuth);
  const polls = await deployer.deploy(Polls, 1209600, 604800);
  const claims = await deployer.deploy(Claims, azimuth.address);
  const censures = await deployer.deploy(Censures, azimuth.address);

  //NOTE  for real deployment, use a real ENS registry
  const ecliptic = await deployer.deploy(
    Ecliptic,
    '0x0000000000000000000000000000000000000000',
    azimuth.address,
    polls.address,
    claims.address
  );

  // configure contract ownership
  await azimuth.transferOwnership(ecliptic.address);
  await polls.transferOwnership(ecliptic.address);

  // deploy secondary contracts
  const sending = await deployer.deploy(DelegatedSending, azimuth.address);
  const time = await getChainTime();
  const livelines = getLivelines(time);
  const deadlines = getDeadlines(time);

  const escapeHatchDate = time + 200 * minute;

  const csr = await deployer.deploy(
    CSR,
    azimuth.address,
    conditions,
    livelines,
    deadlines,
    escapeHatchDate
  );

  const lsr = await deployer.deploy(LinearStarRelease, azimuth.address);

  const own = await ecliptic.owner();
  switch (process.env.WITH_TEST_STATE) {
    case 'STAR_RELEASE':
      await ecliptic.createGalaxy(0, own);
      await ecliptic.createGalaxy(1, own);

      await ecliptic.configureKeys(0, '0x123', '0x456', 1, false);
      await ecliptic.configureKeys(1, '0x123', '0x456', 1, false);
      await ecliptic.spawn(256, own);

      lsr.startReleasing();
      await ecliptic.setSpawnProxy(0, lsr.address);
      await ecliptic.setSpawnProxy(1, csr.address);
      await ecliptic.setTransferProxy(256, lsr.address);
      // Release 2 stars every 5 minutes, starting 2 minutes from now
      // for a maximum of 8 stars
      await lsr.register(user1, 2 * minute, 21, 2, 5 * minute);
      // Release 1 star per minute for each completed batch
      // 3 in each batch
      await csr.register(user1, [3, 3, 3, 3, 3, 3, 3], 1, rateUnit);

      for (let i = 2; i < 23; i++) {
        const offset = 256 * i;
        await lsr.deposit(user1, offset);
        await csr.deposit(user1, offset + 1);
      }
    case 'INVITES':
      await ecliptic.createGalaxy(0, own);
      await ecliptic.configureKeys(0, '0x123', '0x456', 1, false);
      await ecliptic.spawn(256, own);
      await ecliptic.configureKeys(256, '0x456', '0x789', 1, false);
      // set transfer proxy to delegated sending, very brittle
      await ecliptic.setSpawnProxy(256, sending.address);
      await ecliptic.spawn(65792, own);
      await ecliptic.spawn(131328, own);
      await ecliptic.spawn(512, own);
      await sending.setPoolSize(256, 65792, 1000);
    default:
      return;
  }
};
